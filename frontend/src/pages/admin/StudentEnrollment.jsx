import React, { useState, useEffect } from 'react';
import { useEnrollment } from '../../contexts/EnrollmentContext';
import { useClass } from '../../contexts/ClassContext';
import { User, Mail, Phone, Calendar, MapPin, FileText, Users, School, Heart, Pill } from 'lucide-react';

const StudentEnrollment = () => {
  const { registerStudent, loading, error, success, resetState } = useEnrollment();
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
      profileImage: '',
      birthCertificate: '',
      cnicOrBForm: '',
      previousSchoolCertificate: '',
      otherDocuments: '',
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

  const [credentials, setCredentials] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetState();
    
    try {
      const result = await registerStudent(formData);
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
          profileImage: '',
          birthCertificate: '',
          cnicOrBForm: '',
          previousSchoolCertificate: '',
          otherDocuments: '',
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
                <div>
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
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Any known medical conditions"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Pill className="inline h-4 w-4 mr-1" />
                      Allergies
                    </label>
                    <input
                      type="text"
                      name="profileData.allergies"
                      value={formData.profileData.allergies}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Any allergies"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Pill className="inline h-4 w-4 mr-1" />
                      Medication
                    </label>
                    <input
                      type="text"
                      name="profileData.medication"
                      value={formData.profileData.medication}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Current medications"
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
                    placeholder="Enter complete residential address"
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
                      Province
                    </label>
                    <input
                      type="text"
                      name="profileData.province"
                      value={formData.profileData.province}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Province"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      name="profileData.postalCode"
                      value={formData.profileData.postalCode}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Postal code"
                    />
                  </div>
                </div>
              </div>
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