import React, { useState, useEffect } from 'react';
import { useEnrollment } from '../../contexts/EnrollmentContext';
import { useClass } from '../../contexts/ClassContext';
import { User, Mail, Phone, Calendar, MapPin, FileText, Users, School, Heart, Pill, Upload, X, Image as ImageIcon, File } from 'lucide-react';

const StudentEnrollment = () => {
  const { registerStudent, loading, error, success, resetState, uploadProgress, isUploading } = useEnrollment();
  const { classes, fetchClasses } = useClass();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    classRoomId: '',
    profileData: {
      dob: '',
      gender: '',
      placeOfBirth: '',
      nationality: 'Pakistani',
      religion: 'Islam',
      bloodGroup: '',
      medicalConditions: '',
      allergies: '',
      medication: '',
      guardianName: '',
      guardianRelation: '',
      guardianPhone: '',
      guardianEmail: '',
      guardianOccupation: '',
      guardianCNIC: '',
      guardian2Name: '',
      guardian2Relation: '',
      guardian2Phone: '',
      guardian2Email: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: ''
    }
  });

  // File states
  const [files, setFiles] = useState({
    profileImage: null,
    birthCertificate: null,
    cnicOrBForm: null,
    previousSchoolCertificate: null,
    otherDocuments: []
  });

  // Preview states
  const [previews, setPreviews] = useState({
    profileImage: null
  });

  const [credentials, setCredentials] = useState(null);
  const [fileErrors, setFileErrors] = useState({});

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('profileData.')) {
      const profileField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profileData: {
          ...prev.profileData,
          [profileField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Validate file
  const validateFile = (file, fieldName) => {
    const errors = {};
    
    if (file.size > 5 * 1024 * 1024) {
      errors[fieldName] = 'File size must be less than 5MB';
      return errors;
    }

    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const docTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    const isImage = imageTypes.includes(file.type);
    const isDoc = docTypes.includes(file.type);

    if (fieldName === 'profileImage') {
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
      e.target.value = '';
      return;
    }

    setFileErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });

    setFiles(prev => ({
      ...prev,
      [fieldName]: file
    }));

    // Create preview for profile image
    if (file.type.startsWith('image/') && fieldName === 'profileImage') {
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

    const maxFiles = 10;
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

    setFileErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });

    setFiles(prev => ({
      ...prev,
      [fieldName]: [...currentFiles, ...selectedFiles]
    }));

    e.target.value = '';
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
      if (formData.classRoomId) data.append('classRoomId', formData.classRoomId);
      
      // Add profile data as JSON string
      data.append('profileData', JSON.stringify(formData.profileData));
      
      // Add files
      if (files.profileImage) {
        data.append('profileImage', files.profileImage);
      }
      if (files.birthCertificate) {
        data.append('birthCertificate', files.birthCertificate);
      }
      if (files.cnicOrBForm) {
        data.append('cnicOrBForm', files.cnicOrBForm);
      }
      if (files.previousSchoolCertificate) {
        data.append('previousSchoolCertificate', files.previousSchoolCertificate);
      }
      
      // Add multiple files
      files.otherDocuments.forEach(file => {
        data.append('otherDocuments', file);
      });

      const result = await registerStudent(data);
      setCredentials(result.credentials);
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        classRoomId: '',
        profileData: {
          dob: '',
          gender: '',
          placeOfBirth: '',
          nationality: 'Pakistani',
          religion: 'Islam',
          bloodGroup: '',
          medicalConditions: '',
          allergies: '',
          medication: '',
          guardianName: '',
          guardianRelation: '',
          guardianPhone: '',
          guardianEmail: '',
          guardianOccupation: '',
          guardianCNIC: '',
          guardian2Name: '',
          guardian2Relation: '',
          guardian2Phone: '',
          guardian2Email: '',
          address: '',
          city: '',
          province: '',
          postalCode: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContactRelation: ''
        }
      });
      
      // Reset files
      setFiles({
        profileImage: null,
        birthCertificate: null,
        cnicOrBForm: null,
        previousSchoolCertificate: null,
        otherDocuments: []
      });
      
      setPreviews({
        profileImage: null
      });
      
      setFileErrors({});
      
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  // Get available classes
  const availableClasses = Array.isArray(classes) ? classes : [];

  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-amber-600 mr-3" />
            <h1 className="text-3xl font-bold text-black">Student Enrollment</h1>
          </div>
          <p className="text-gray-600">Register new students with auto-generated credentials and admission number</p>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Uploading files...</span>
              <span className="text-sm font-bold text-blue-700">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Credentials Display */}
        {credentials && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-lg font-semibold text-amber-800 mb-2">Student Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <p><span className="font-medium">Email:</span> {credentials.email}</p>
              <p><span className="font-medium">Password:</span> {credentials.password}</p>
              <p><span className="font-medium">Admission No:</span> {credentials.admissionNo}</p>
              {credentials.rollNumber && (
                <p><span className="font-medium">Roll Number:</span> {credentials.rollNumber}</p>
              )}
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
                    placeholder="Enter student's full name"
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
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <School className="inline h-4 w-4 mr-1" />
                    Assign to Class (Optional)
                  </label>
                  <select
                    name="classRoomId"
                    value={formData.classRoomId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">No class assignment</option>
                    {availableClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.grade && `- Grade ${cls.grade}`} {cls.section && `- Section ${cls.section}`} ({cls.type})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    If selected, student will be automatically enrolled in this class with a roll number
                  </p>
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

            {/* Student Documents */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <FileText className="h-5 w-5 text-amber-600 mr-2" />
                Student Documents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Birth Certificate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birth Certificate (Max 5MB)
                  </label>
                  <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileChange(e, 'birthCertificate')}
                      className="hidden"
                    />
                  </label>
                  {files.birthCertificate && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-xs text-gray-700 truncate">{files.birthCertificate.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile('birthCertificate')}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {fileErrors.birthCertificate && (
                    <p className="text-sm text-red-600 mt-1">{fileErrors.birthCertificate}</p>
                  )}
                </div>

                {/* CNIC/B-Form */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC / B-Form (Max 5MB)
                  </label>
                  <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileChange(e, 'cnicOrBForm')}
                      className="hidden"
                    />
                  </label>
                  {files.cnicOrBForm && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-xs text-gray-700 truncate">{files.cnicOrBForm.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile('cnicOrBForm')}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {fileErrors.cnicOrBForm && (
                    <p className="text-sm text-red-600 mt-1">{fileErrors.cnicOrBForm}</p>
                  )}
                </div>

                {/* Previous School Certificate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Previous School Certificate
                  </label>
                  <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileChange(e, 'previousSchoolCertificate')}
                      className="hidden"
                    />
                  </label>
                  {files.previousSchoolCertificate && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-xs text-gray-700 truncate">{files.previousSchoolCertificate.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile('previousSchoolCertificate')}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {fileErrors.previousSchoolCertificate && (
                    <p className="text-sm text-red-600 mt-1">{fileErrors.previousSchoolCertificate}</p>
                  )}
                </div>
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

            {/* Personal Details */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <Calendar className="h-5 w-5 text-amber-600 mr-2" />
                Personal Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="profileData.dob"
                    value={formData.profileData.dob}
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
                    Blood Group
                  </label>
                  <select
                    name="profileData.bloodGroup"
                    value={formData.profileData.bloodGroup}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Religion
                  </label>
                  <select
                    name="profileData.religion"
                    value={formData.profileData.religion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Christianity">Christianity</option>
                    <option value="Hinduism">Hinduism</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Place of Birth
                  </label>
                  <input
                    type="text"
                    name="profileData.placeOfBirth"
                    value={formData.profileData.placeOfBirth}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Place of birth"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    name="profileData.nationality"
                    value={formData.profileData.nationality}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Nationality"
                  />
                </div>
              </div>
            </div>

            {/* Guardian Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <Users className="h-5 w-5 text-amber-600 mr-2" />
                Guardian Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    name="profileData.guardianName"
                    value={formData.profileData.guardianName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Guardian's full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relation
                  </label>
                  <select
                    name="profileData.guardianRelation"
                    value={formData.profileData.guardianRelation}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Select Relation</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Grandfather">Grandfather</option>
                    <option value="Grandmother">Grandmother</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Aunt">Aunt</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Guardian Phone
                  </label>
                  <input
                    type="tel"
                    name="profileData.guardianPhone"
                    value={formData.profileData.guardianPhone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Guardian's phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Guardian Email
                  </label>
                  <input
                    type="email"
                    name="profileData.guardianEmail"
                    value={formData.profileData.guardianEmail}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Guardian's email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Occupation
                  </label>
                  <input
                    type="text"
                    name="profileData.guardianOccupation"
                    value={formData.profileData.guardianOccupation}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Guardian's occupation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guardian CNIC
                  </label>
                  <input
                    type="text"
                    name="profileData.guardianCNIC"
                    value={formData.profileData.guardianCNIC}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Guardian's CNIC number"
                  />
                </div>

                {/* Secondary Guardian */}
                <div className="md:col-span-3 border-t pt-6 mt-2">
                  <h3 className="text-lg font-medium text-black mb-4">Secondary Guardian (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Guardian Name
                      </label>
                      <input
                        type="text"
                        name="profileData.guardian2Name"
                        value={formData.profileData.guardian2Name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Secondary guardian name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relation
                      </label>
                      <select
                        name="profileData.guardian2Relation"
                        value={formData.profileData.guardian2Relation}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="">Select Relation</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Grandfather">Grandfather</option>
                        <option value="Grandmother">Grandmother</option>
                        <option value="Uncle">Uncle</option>
                        <option value="Aunt">Aunt</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="inline h-4 w-4 mr-1" />
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="profileData.guardian2Phone"
                        value={formData.profileData.guardian2Phone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Secondary guardian phone"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="inline h-4 w-4 mr-1" />
                        Email
                      </label>
                      <input
                        type="email"
                        name="profileData.guardian2Email"
                        value={formData.profileData.guardian2Email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Secondary guardian email"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact (Other than Guardians) */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <Users className="h-5 w-5 text-amber-600 mr-2" />
                Emergency Contact (Other than Guardians)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <Phone className="inline h-4 w-4 mr-1" />
                    Emergency Phone
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
                    placeholder="Relation to student"
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <Heart className="h-5 w-5 text-amber-600 mr-2" />
                Medical Information
              </h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Conditions
                  </label>
                  <textarea
                    name="profileData.medicalConditions"
                    value={formData.profileData.medicalConditions}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Any known medical conditions, history, or special needs"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Pill className="inline h-4 w-4 mr-1" />
                      Allergies
                    </label>
                    <textarea
                      name="profileData.allergies"
                      value={formData.profileData.allergies}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Any allergies (food, medication, environmental)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Pill className="inline h-4 w-4 mr-1" />
                      Current Medications
                    </label>
                    <textarea
                      name="profileData.medication"
                      value={formData.profileData.medication}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Current medications with dosage and frequency"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-4 flex items-center">
                <MapPin className="h-5 w-5 text-amber-600 mr-2" />
                Address Information
              </h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complete Address
                  </label>
                  <textarea
                    name="profileData.address"
                    value={formData.profileData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="House #, Street, Area, etc."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="profileData.city"
                      value={formData.profileData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Province/State
                    </label>
                    <input
                      type="text"
                      name="profileData.province"
                      value={formData.profileData.province}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Province/State"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal/ZIP Code
                    </label>
                    <input
                      type="text"
                      name="profileData.postalCode"
                      value={formData.profileData.postalCode}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Postal/ZIP code"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  resetState();
                  setCredentials(null);
                  setFormData({
                    name: '',
                    phone: '',
                    classRoomId: '',
                    profileData: {
                      dob: '',
                      gender: '',
                      placeOfBirth: '',
                      nationality: 'Pakistani',
                      religion: 'Islam',
                      bloodGroup: '',
                      medicalConditions: '',
                      allergies: '',
                      medication: '',
                      guardianName: '',
                      guardianRelation: '',
                      guardianPhone: '',
                      guardianEmail: '',
                      guardianOccupation: '',
                      guardianCNIC: '',
                      guardian2Name: '',
                      guardian2Relation: '',
                      guardian2Phone: '',
                      guardian2Email: '',
                      address: '',
                      city: '',
                      province: '',
                      postalCode: '',
                      emergencyContactName: '',
                      emergencyContactPhone: '',
                      emergencyContactRelation: ''
                    }
                  });
                  setFiles({
                    profileImage: null,
                    birthCertificate: null,
                    cnicOrBForm: null,
                    previousSchoolCertificate: null,
                    otherDocuments: []
                  });
                  setPreviews({ profileImage: null });
                  setFileErrors({});
                }}
                className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={loading || isUploading}
                className="bg-amber-600 text-white px-6 py-3 rounded-md font-medium hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading || isUploading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isUploading ? 'Uploading...' : 'Registering...'}
                  </span>
                ) : (
                  'Register Student'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentEnrollment;