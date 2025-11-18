import React, { useState } from 'react';
import { useEnrollment } from '../../contexts/EnrollmentContext';
import { User, Mail, Phone, BookOpen, Calendar, MapPin, FileText, Award, Briefcase, Upload } from 'lucide-react';

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
      profileImage: '',
      cnicFront: '',
      cnicBack: '',
      degreeDocuments: '',
      otherDocuments: '',
      joiningDate: '',
      salary: '',
      employmentType: ''
    }
  });

  const [credentials, setCredentials] = useState(null);

  const handleChange = (e) => {
  const { name, value, type, checked, files } = e.target;

  // 🧠 Detect numeric fields you want to auto-convert
  const numericFields = ["experience", "salary", "age"];

  // Determine finalValue based on input type
  let finalValue;
  if (type === "checkbox") {
    finalValue = checked;
  } else if (type === "file") {
    finalValue = files.length > 1 ? Array.from(files) : files[0];
  } else if (numericFields.includes(name.split(".").pop())) {
    finalValue = value === "" ? null : Number(value); // convert to number
  } else {
    finalValue = value;
  }

  // 🔹 Handle nested fields like profileData.experience
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


  const handleSubmit = async (e) => {
    e.preventDefault();
    resetState();
    
    try {
      const result = await registerTeacher(formData);
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
          profileImage: '',
          cnicFront: '',
          cnicBack: '',
          degreeDocuments: '',
          otherDocuments: '',
          joiningDate: '',
          salary: '',
          employmentType: ''
        }
      });
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
                    placeholder="Enter CNIC number"
                  />
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