import React, { useState } from 'react';
import { useEnrollment } from '../../contexts/EnrollmentContext';
import { User, Mail, Phone, BookOpen, Calendar, MapPin, FileText, Award, Briefcase, Upload, X, Image as ImageIcon, File } from 'lucide-react';

const TeacherEnrollment = () => {
  const { registerTeacher, loading, error, success, resetState } = useEnrollment();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    profileData: {
      bio: '',
      dateOfBirth: '',
      gender: '',
      cnic: '',
      qualification: '',
      specialization: '',
      experience: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      phoneSecondary: '',
      phoneEmergency: '',
      joiningDate: '',
      salary: '',
      employmentType: ''
    }
  });

  // File states
  const [files, setFiles] = useState({
    profileImage: null,
    cnicFront: null,
    cnicBack: null,
    degreeDocuments: [],
    otherDocuments: []
  });

  // Preview states
  const [previews, setPreviews] = useState({
    profileImage: null,
    cnicFront: null,
    cnicBack: null
  });

  const [credentials, setCredentials] = useState(null);
  const [fileErrors, setFileErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    const numericFields = ["experience", "salary"];

    let finalValue;
    if (type === "checkbox") {
      finalValue = checked;
    } else if (numericFields.includes(name.split(".").pop())) {
      finalValue = value === "" ? null : Number(value);
    } else {
      finalValue = value;
    }

    if (name.startsWith("profileData.")) {
      const profileField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        profileData: {
          ...prev.profileData,
          [profileField]: finalValue,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: finalValue,
      }));
    }
  };

  // Validate file
  const validateFile = (file, fieldName) => {
    const errors = {};
    
    // Check file size (5MB = 5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      errors[fieldName] = 'File size must be less than 5MB';
      return errors;
    }

    // Check file type
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const docTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    const isImage = imageTypes.includes(file.type);
    const isDoc = docTypes.includes(file.type);

    if (fieldName === 'profileImage' || fieldName === 'cnicFront' || fieldName === 'cnicBack') {
      if (!isImage) {
        errors[fieldName] = 'Only image files (JPEG, PNG, GIF, WEBP) are allowed';
        return errors;
      }
    } else {
      if (!isImage && !isDoc) {
        errors[fieldName] = 'Only images or documents (PDF, DOC, DOCX) are allowed';
        return errors;
      }
    }

    return errors;
  };

  // Handle single file upload
  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    const errors = validateFile(file, fieldName);
    
    if (Object.keys(errors).length > 0) {
      setFileErrors(prev => ({ ...prev, ...errors }));
      e.target.value = ''; // Reset input
      return;
    }

    // Clear any previous errors for this field
    setFileErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });

    setFiles(prev => ({
      ...prev,
      [fieldName]: file
    }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({
          ...prev,
          [fieldName]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle multiple file upload
  const handleMultipleFileChange = (e, fieldName) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (selectedFiles.length === 0) return;

    const maxFiles = fieldName === 'degreeDocuments' ? 5 : 10;
    const currentFiles = files[fieldName] || [];
    
    if (currentFiles.length + selectedFiles.length > maxFiles) {
      setFileErrors(prev => ({
        ...prev,
        [fieldName]: `Maximum ${maxFiles} files allowed`
      }));
      e.target.value = '';
      return;
    }

    // Validate each file
    let hasErrors = false;
    for (const file of selectedFiles) {
      const errors = validateFile(file, fieldName);
      if (Object.keys(errors).length > 0) {
        setFileErrors(prev => ({ ...prev, ...errors }));
        hasErrors = true;
        break;
      }
    }

    if (hasErrors) {
      e.target.value = '';
      return;
    }

    // Clear errors
    setFileErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });

    setFiles(prev => ({
      ...prev,
      [fieldName]: [...currentFiles, ...selectedFiles]
    }));

    e.target.value = ''; // Reset input for reuse
  };

  // Remove single file
  const removeFile = (fieldName) => {
    setFiles(prev => ({
      ...prev,
      [fieldName]: null
    }));
    setPreviews(prev => ({
      ...prev,
      [fieldName]: null
    }));
  };

  // Remove file from multiple files
  const removeMultipleFile = (fieldName, index) => {
    setFiles(prev => ({
      ...prev,
      [fieldName]: prev[fieldName].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetState();

    // Validate required profile image
    if (!files.profileImage) {
      setFileErrors({ profileImage: 'Profile image is required' });
      return;
    }
    
    try {
      // Create FormData
      const data = new FormData();
      
      // Add text fields
      data.append('name', formData.name);
      if (formData.phone) data.append('phone', formData.phone);
      
      // Add profile data as JSON string
      data.append('profileData', JSON.stringify(formData.profileData));
      
      // Add files
      if (files.profileImage) {
        data.append('profileImage', files.profileImage);
      }
      if (files.cnicFront) {
        data.append('cnicFront', files.cnicFront);
      }
      if (files.cnicBack) {
        data.append('cnicBack', files.cnicBack);
      }
      
      // Add multiple files
      files.degreeDocuments.forEach(file => {
        data.append('degreeDocuments', file);
      });
      
      files.otherDocuments.forEach(file => {
        data.append('otherDocuments', file);
      });

      const result = await registerTeacher(data);
      setCredentials(result.credentials);
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        profileData: {
          bio: '',
          dateOfBirth: '',
          gender: '',
          cnic: '',
          qualification: '',
          specialization: '',
          experience: '',
          address: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContactRelation: '',
          phoneSecondary: '',
          phoneEmergency: '',
          joiningDate: '',
          salary: '',
          employmentType: ''
        }
      });
      
      // Reset files
      setFiles({
        profileImage: null,
        cnicFront: null,
        cnicBack: null,
        degreeDocuments: [],
        otherDocuments: []
      });
      
      setPreviews({
        profileImage: null,
        cnicFront: null,
        cnicBack: null
      });
      
      setFileErrors({});
      
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-amber-600 mr-3" />
            <h1 className="text-3xl font-bold text-black">Teacher Enrollment</h1>
          </div>
          <p className="text-gray-600">Register new teachers with auto-generated credentials</p>
        </div>

        {/* Credentials Display */}
        {credentials && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-800 mb-2">Teacher Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <p><span className="font-medium">Email:</span> {credentials.email}</p>
              <p><span className="font-medium">Password:</span> {credentials.password}</p>
            </div>
            <p className="text-xs text-amber-600 mt-2">
              Please save these credentials securely. They will not be shown again.
            </p>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        
        {success && !credentials && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Enrollment Form */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Basic Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <User className="h-5 w-5 text-amber-600 mr-2" />
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            {/* Profile Image - REQUIRED */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <ImageIcon className="h-5 w-5 text-amber-600 mr-2" />
                Profile Image *
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Profile Image (Required - Max 5MB)
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'profileImage')}
                        className="hidden"
                      />
                    </label>
                    {files.profileImage && (
                      <span className="text-sm text-gray-600">{files.profileImage.name}</span>
                    )}
                  </div>
                  {fileErrors.profileImage && (
                    <p className="text-sm text-red-600 mt-1">{fileErrors.profileImage}</p>
                  )}
                </div>
                
                {/* Preview */}
                {previews.profileImage && (
                  <div className="relative inline-block">
                    <img 
                      src={previews.profileImage} 
                      alt="Profile preview" 
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile('profileImage')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Details */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <Calendar className="h-5 w-5 text-amber-600 mr-2" />
                Personal Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="profileData.dateOfBirth"
                    value={formData.profileData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    name="profileData.gender"
                    value={formData.profileData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC
                  </label>
                  <input
                    type="text"
                    name="profileData.cnic"
                    value={formData.profileData.cnic}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="12345-1234567-1"
                  />
                </div>
              </div>
            </div>

            {/* CNIC Documents */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <FileText className="h-5 w-5 text-amber-600 mr-2" />
                CNIC Documents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CNIC Front */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC Front (Max 5MB)
                  </label>
                  <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'cnicFront')}
                      className="hidden"
                    />
                  </label>
                  {files.cnicFront && (
                    <p className="text-sm text-gray-600 mt-1">{files.cnicFront.name}</p>
                  )}
                  {fileErrors.cnicFront && (
                    <p className="text-sm text-red-600 mt-1">{fileErrors.cnicFront}</p>
                  )}
                  {previews.cnicFront && (
                    <div className="relative inline-block mt-2">
                      <img 
                        src={previews.cnicFront} 
                        alt="CNIC Front" 
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile('cnicFront')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* CNIC Back */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC Back (Max 5MB)
                  </label>
                  <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'cnicBack')}
                      className="hidden"
                    />
                  </label>
                  {files.cnicBack && (
                    <p className="text-sm text-gray-600 mt-1">{files.cnicBack.name}</p>
                  )}
                  {fileErrors.cnicBack && (
                    <p className="text-sm text-red-600 mt-1">{fileErrors.cnicBack}</p>
                  )}
                  {previews.cnicBack && (
                    <div className="relative inline-block mt-2">
                      <img 
                        src={previews.cnicBack} 
                        alt="CNIC Back" 
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile('cnicBack')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <Award className="h-5 w-5 text-amber-600 mr-2" />
                Professional Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Qualification
                  </label>
                  <input
                    type="text"
                    name="profileData.qualification"
                    value={formData.profileData.qualification}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="e.g., M.A., B.Ed."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialization
                  </label>
                  <input
                    type="text"
                    name="profileData.specialization"
                    value={formData.profileData.specialization}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="e.g., Mathematics, Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    name="profileData.experience"
                    value={formData.profileData.experience}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Years of experience"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Type
                  </label>
                  <select
                    name="profileData.employmentType"
                    value={formData.profileData.employmentType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select Type</option>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    name="profileData.joiningDate"
                    value={formData.profileData.joiningDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary
                  </label>
                  <input
                    type="number"
                    name="profileData.salary"
                    value={formData.profileData.salary}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Monthly salary"
                  />
                </div>
              </div>
            </div>

            {/* Degree Documents */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <Award className="h-5 w-5 text-amber-600 mr-2" />
                Degree Documents
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Degree Documents (Max 5 files, 5MB each)
                </label>
                <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 w-fit">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    onChange={(e) => handleMultipleFileChange(e, 'degreeDocuments')}
                    className="hidden"
                  />
                </label>
                {fileErrors.degreeDocuments && (
                  <p className="text-sm text-red-600 mt-1">{fileErrors.degreeDocuments}</p>
                )}
                
                {/* File List */}
                {files.degreeDocuments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.degreeDocuments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <File className="h-4 w-4 text-gray-600 mr-2" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({(file.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMultipleFile('degreeDocuments', index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Other Documents */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <FileText className="h-5 w-5 text-amber-600 mr-2" />
                Other Documents
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Other Documents (Max 10 files, 5MB each)
                </label>
                <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 w-fit">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    onChange={(e) => handleMultipleFileChange(e, 'otherDocuments')}
                    className="hidden"
                  />
                </label>
                {fileErrors.otherDocuments && (
                  <p className="text-sm text-red-600 mt-1">{fileErrors.otherDocuments}</p>
                )}
                
                {/* File List */}
                {files.otherDocuments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.otherDocuments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <File className="h-4 w-4 text-gray-600 mr-2" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({(file.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMultipleFile('otherDocuments', index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <MapPin className="h-5 w-5 text-amber-600 mr-2" />
                Address & Contact
              </h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    name="profileData.address"
                    value={formData.profileData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter complete address"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      name="profileData.emergencyContactName"
                      value={formData.profileData.emergencyContactName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="profileData.emergencyContactPhone"
                      value={formData.profileData.emergencyContactPhone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Emergency contact phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relation
                    </label>
                    <input
                      type="text"
                      name="profileData.emergencyContactRelation"
                      value={formData.profileData.emergencyContactRelation}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Relationship"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Phone
                    </label>
                    <input
                      type="tel"
                      name="profileData.phoneSecondary"
                      value={formData.profileData.phoneSecondary}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Secondary phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Phone
                    </label>
                    <input
                      type="tel"
                      name="profileData.phoneEmergency"
                      value={formData.profileData.phoneEmergency}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Emergency phone number"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Bio
              </label>
              <textarea
                name="profileData.bio"
                value={formData.profileData.bio}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Tell us about the teacher..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-amber-600 text-white px-6 py-3 rounded-md font-medium hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Registering...
                  </span>
                ) : (
                  'Register Teacher'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeacherEnrollment;