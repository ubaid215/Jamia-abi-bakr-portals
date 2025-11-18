/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { useStudent } from '../../contexts/StudentContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Cake,
  Droplets,
  Globe,
  BookOpen,
  GraduationCap,
  Users,
  Heart,
  AlertTriangle,
  Calendar,
  FileText,
  Shield,
  Home,
  Edit,
  Save,
  X
} from 'lucide-react';

const StudentProfile = () => {
  const {
    profile,
    loading,
    error,
    fetchMyProfile,
    updateMyProfile
  } = useStudent();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  React.useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  const handleEdit = () => {
    if (profile) {
      setEditData({
        phone: profile.personalInfo.phone || '',
        profileImage: profile.personalInfo.profileImage || '',
        address: profile.contactInfo.address || '',
        city: profile.contactInfo.city || '',
        province: profile.contactInfo.province || '',
        postalCode: profile.contactInfo.postalCode || '',
        emergencyContactName: profile.contactInfo.emergencyContact?.name || '',
        emergencyContactPhone: profile.contactInfo.emergencyContact?.phone || '',
        emergencyContactRelation: profile.contactInfo.emergencyContact?.relation || '',
        medicalConditions: profile.medicalInfo.medicalConditions || '',
        allergies: profile.medicalInfo.allergies || '',
        medication: profile.medicalInfo.medication || ''
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      await updateMyProfile(editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-black mb-2">Error loading profile</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchMyProfile}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-black mb-2">Profile not found</h3>
          <p className="text-gray-600">Unable to load profile information</p>
        </div>
      </div>
    );
  }

  const InfoSection = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Icon className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-semibold text-black">{title}</h2>
      </div>
      {children}
    </div>
  );

  const InfoField = ({ label, value, icon: Icon }) => (
    <div className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-0">
      {Icon && <Icon className="h-4 w-4 text-gray-400 mt-1 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-black mt-1">{value || 'Not provided'}</p>
      </div>
    </div>
  );

  const EditField = ({ label, value, field, icon: Icon, type = 'text', placeholder = '' }) => (
    <div className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-0">
      {Icon && <Icon className="h-4 w-4 text-gray-400 mt-3 shrink-0" />}
      <div className="flex-1 min-w-0">
        <label className="text-sm font-medium text-gray-600 block mb-2">{label}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder={placeholder}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">My Profile</h1>
              <p className="text-gray-600 mt-1">
                Manage your personal and academic information
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveLoading}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saveLoading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Personal Info & Academic Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Personal Information */}
            <InfoSection title="Personal Information" icon={User}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <InfoField label="Full Name" value={profile.personalInfo.name} icon={User} />
                  <InfoField label="Email Address" value={profile.personalInfo.email} icon={Mail} />
                  <InfoField label="Phone Number" value={profile.personalInfo.phone} icon={Phone} />
                  <InfoField label="Date of Birth" value={profile.personalInfo.dateOfBirth ? new Date(profile.personalInfo.dateOfBirth).toLocaleDateString() : ''} icon={Cake} />
                </div>
                <div className="space-y-4">
                  <InfoField label="Gender" value={profile.personalInfo.gender} icon={User} />
                  <InfoField label="Blood Group" value={profile.personalInfo.bloodGroup} icon={Droplets} />
                  <InfoField label="Nationality" value={profile.personalInfo.nationality} icon={Globe} />
                  <InfoField label="Religion" value={profile.personalInfo.religion} icon={Shield} />
                  <InfoField label="Place of Birth" value={profile.personalInfo.placeOfBirth} icon={MapPin} />
                </div>
              </div>
            </InfoSection>

            {/* Academic Information */}
            <InfoSection title="Academic Information" icon={GraduationCap}>
              <div className="space-y-4">
                <InfoField 
                  label="Admission Number" 
                  value={profile.personalInfo.admissionNo} 
                  icon={BookOpen} 
                />
                <InfoField 
                  label="Admission Date" 
                  value={new Date(profile.academicInfo.admissionDate).toLocaleDateString()} 
                  icon={Calendar} 
                />
                {profile.academicInfo.currentClass && (
                  <>
                    <InfoField 
                      label="Current Class" 
                      value={profile.academicInfo.currentClass.name} 
                      icon={GraduationCap} 
                    />
                    <InfoField 
                      label="Grade" 
                      value={profile.academicInfo.currentClass.grade} 
                      icon={BookOpen} 
                    />
                    <InfoField 
                      label="Roll Number" 
                      value={profile.academicInfo.currentClass.rollNumber} 
                      icon={User} 
                    />
                  </>
                )}
              </div>
            </InfoSection>

            {/* Contact Information */}
            <InfoSection title="Contact Information" icon={Home}>
              {isEditing ? (
                <div className="space-y-4">
                  <EditField 
                    label="Address" 
                    value={editData.address} 
                    field="address" 
                    icon={MapPin}
                    placeholder="Enter your full address"
                  />
                  <EditField 
                    label="City" 
                    value={editData.city} 
                    field="city" 
                    icon={MapPin}
                    placeholder="Enter your city"
                  />
                  <EditField 
                    label="Province" 
                    value={editData.province} 
                    field="province" 
                    icon={MapPin}
                    placeholder="Enter your province"
                  />
                  <EditField 
                    label="Postal Code" 
                    value={editData.postalCode} 
                    field="postalCode" 
                    icon={MapPin}
                    placeholder="Enter postal code"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <InfoField label="Address" value={profile.contactInfo.address} icon={MapPin} />
                  <InfoField label="City" value={profile.contactInfo.city} icon={MapPin} />
                  <InfoField label="Province" value={profile.contactInfo.province} icon={MapPin} />
                  <InfoField label="Postal Code" value={profile.contactInfo.postalCode} icon={MapPin} />
                </div>
              )}
            </InfoSection>

            {/* Medical Information */}
            <InfoSection title="Medical Information" icon={Heart}>
              {isEditing ? (
                <div className="space-y-4">
                  <EditField 
                    label="Medical Conditions" 
                    value={editData.medicalConditions} 
                    field="medicalConditions" 
                    icon={AlertTriangle}
                    placeholder="Any medical conditions"
                  />
                  <EditField 
                    label="Allergies" 
                    value={editData.allergies} 
                    field="allergies" 
                    icon={AlertTriangle}
                    placeholder="Any allergies"
                  />
                  <EditField 
                    label="Medication" 
                    value={editData.medication} 
                    field="medication" 
                    icon={AlertTriangle}
                    placeholder="Current medications"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <InfoField label="Medical Conditions" value={profile.medicalInfo.medicalConditions} icon={AlertTriangle} />
                  <InfoField label="Allergies" value={profile.medicalInfo.allergies} icon={AlertTriangle} />
                  <InfoField label="Medication" value={profile.medicalInfo.medication} icon={AlertTriangle} />
                </div>
              )}
            </InfoSection>
          </div>

          {/* Right Column - Guardian Info & Emergency Contact */}
          <div className="space-y-8">
            {/* Primary Guardian */}
            <InfoSection title="Primary Guardian" icon={Users}>
              <div className="space-y-4">
                <InfoField label="Name" value={profile.guardianInfo.primaryGuardian.name} icon={User} />
                <InfoField label="Relation" value={profile.guardianInfo.primaryGuardian.relation} icon={Users} />
                <InfoField label="Phone" value={profile.guardianInfo.primaryGuardian.phone} icon={Phone} />
                <InfoField label="Email" value={profile.guardianInfo.primaryGuardian.email} icon={Mail} />
                <InfoField label="Occupation" value={profile.guardianInfo.primaryGuardian.occupation} icon={User} />
                <InfoField label="CNIC" value={profile.guardianInfo.primaryGuardian.cnic} icon={FileText} />
              </div>
            </InfoSection>

            {/* Secondary Guardian */}
            {profile.guardianInfo.secondaryGuardian && (
              <InfoSection title="Secondary Guardian" icon={Users}>
                <div className="space-y-4">
                  <InfoField label="Name" value={profile.guardianInfo.secondaryGuardian.name} icon={User} />
                  <InfoField label="Relation" value={profile.guardianInfo.secondaryGuardian.relation} icon={Users} />
                  <InfoField label="Phone" value={profile.guardianInfo.secondaryGuardian.phone} icon={Phone} />
                  <InfoField label="Email" value={profile.guardianInfo.secondaryGuardian.email} icon={Mail} />
                </div>
              </InfoSection>
            )}

            {/* Emergency Contact */}
            <InfoSection title="Emergency Contact" icon={AlertTriangle}>
              {isEditing ? (
                <div className="space-y-4">
                  <EditField 
                    label="Contact Name" 
                    value={editData.emergencyContactName} 
                    field="emergencyContactName" 
                    icon={User}
                    placeholder="Emergency contact name"
                  />
                  <EditField 
                    label="Phone Number" 
                    value={editData.emergencyContactPhone} 
                    field="emergencyContactPhone" 
                    icon={Phone}
                    placeholder="Emergency contact phone"
                  />
                  <EditField 
                    label="Relation" 
                    value={editData.emergencyContactRelation} 
                    field="emergencyContactRelation" 
                    icon={Users}
                    placeholder="Relationship to student"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <InfoField label="Contact Name" value={profile.contactInfo.emergencyContact?.name} icon={User} />
                  <InfoField label="Phone Number" value={profile.contactInfo.emergencyContact?.phone} icon={Phone} />
                  <InfoField label="Relation" value={profile.contactInfo.emergencyContact?.relation} icon={Users} />
                </div>
              )}
            </InfoSection>

            {/* Associated Parents */}
            {profile.parents && profile.parents.length > 0 && (
              <InfoSection title="Associated Parents" icon={Users}>
                <div className="space-y-3">
                  {profile.parents.map((parent, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-black">{parent.name}</p>
                      <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                        <Mail className="h-3 w-3" />
                        <span>{parent.email}</span>
                      </div>
                      {parent.phone && (
                        <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>{parent.phone}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </InfoSection>
            )}

            {/* Profile Image (Editable) */}
            <InfoSection title="Profile Image" icon={User}>
              {isEditing ? (
                <div className="space-y-4">
                  <EditField 
                    label="Profile Image URL" 
                    value={editData.profileImage} 
                    field="profileImage" 
                    icon={User}
                    placeholder="Enter image URL"
                  />
                  {editData.profileImage && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-600 mb-2">Preview:</p>
                      <img 
                        src={editData.profileImage} 
                        alt="Profile preview" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-amber-200"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  {profile.personalInfo.profileImage ? (
                    <img 
                      src={profile.personalInfo.profileImage} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full object-cover border-2 border-amber-200"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center border-2 border-amber-200">
                      <User className="h-8 w-8 text-amber-600" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Profile picture</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {profile.personalInfo.profileImage ? 'Click edit to change' : 'No profile image set'}
                    </p>
                  </div>
                </div>
              )}
            </InfoSection>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;