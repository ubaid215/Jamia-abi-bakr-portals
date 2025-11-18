/* eslint-disable no-unused-vars */
// components/PasswordReset.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  User, 
  Mail, 
  Key, 
  Copy, 
  CheckCircle,
  Users,
  School,
  Shield,
  AlertCircle
} from 'lucide-react';
import { usePasswordReset } from '../contexts/PasswordResetContext';
import { toast } from 'react-hot-toast';

const PasswordReset = () => {
  const { 
    users, 
    loading, 
    credentials, 
    getUsers, 
    resetUserPassword,
    resetState 
  } = usePasswordReset();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Safely extract users array from response
  const usersArray = Array.isArray(users) 
    ? users 
    : (users?.users || users?.data || []);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  useEffect(() => {
    if (searchTerm || roleFilter !== 'ALL') {
      const role = roleFilter === 'ALL' ? '' : roleFilter;
      getUsers(role, searchTerm);
    } else {
      getUsers();
    }
  }, [searchTerm, roleFilter, getUsers]);

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Are you sure you want to reset password for ${user.name}?`)) {
      return;
    }

    try {
      await resetUserPassword(user.id);
      setSelectedUser(user);
    } catch (error) {
      // Error handled by context
    }
  };

  const handleCopyCredentials = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleNewReset = () => {
    resetState();
    setSelectedUser(null);
  };

  // Filter users based on search and role - NOW SAFE
  const filteredUsers = usersArray.filter(user => {
    if (!user || typeof user !== 'object') return false;
    
    const userName = user.name || '';
    const userEmail = user.email || '';
    const admissionNo = user.studentProfile?.admissionNo || '';
    
    const matchesSearch = 
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admissionNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'TEACHER': return 'bg-blue-100 text-blue-800';
      case 'STUDENT': return 'bg-green-100 text-green-800';
      case 'ADMIN': return 'bg-purple-100 text-purple-800';
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-800';
      case 'PARENT': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'TEACHER': return 'Teacher';
      case 'STUDENT': return 'Student';
      case 'ADMIN': return 'Admin';
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'PARENT': return 'Parent';
      default: return role;
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'TEACHER': return <School className="h-4 w-4" />;
      case 'STUDENT': return <User className="h-4 w-4" />;
      case 'ADMIN': 
      case 'SUPER_ADMIN': return <Shield className="h-4 w-4" />;
      case 'PARENT': return <Users className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  // Debug: Log the users data structure
  useEffect(() => {
    if (users) {
      console.log('Users data structure:', users);
      console.log('Users array:', usersArray);
    }
  }, [users]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Key className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Password Reset</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Reset passwords for teachers and students. New auto-generated passwords will be provided.
          </p>
        </div>

        {/* Credentials Display */}
        {credentials && selectedUser && (
          <div className="mb-6 bg-white border border-green-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-800 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Password Reset Successful
              </h3>
              <button
                onClick={handleNewReset}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Reset Another Password
              </button>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-3 mb-3">
                {selectedUser.profileImage ? (
                  <img 
                    src={selectedUser.profileImage} 
                    alt={selectedUser.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                    {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedUser.name}</h4>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={credentials.credentials?.email || ''}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => handleCopyCredentials(credentials.credentials?.email || '', 'email')}
                      className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {copiedField === 'email' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={credentials.credentials?.newPassword || ''}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => handleCopyCredentials(credentials.credentials?.newPassword || '', 'password')}
                      className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {copiedField === 'password' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-700">
                    Please provide these credentials to the user securely. They will not be shown again.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Roles</option>
                <option value="TEACHER">Teachers</option>
                <option value="STUDENT">Students</option>
                <option value="ADMIN">Admins</option>
                <option value="PARENT">Parents</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => getUsers()}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Additional Info
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-8 bg-gray-200 rounded w-20 animate-pulse ml-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <User className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {usersArray.length === 0 ? 'No users found' : 'No matching users found'}
                      </h3>
                      <p className="text-gray-500">
                        {usersArray.length === 0 
                          ? 'There are no users in the system yet' 
                          : 'Try adjusting your search criteria'
                        }
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {user.profileImage ? (
                            <img 
                              src={user.profileImage} 
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-semibold">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{user.email || 'No email'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="ml-1">{getRoleLabel(user.role)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.phone || 'Not provided'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.status === 'ACTIVE' ? (
                            <span className="text-green-600">Active</span>
                          ) : (
                            <span className="text-red-600">{user.status || 'Unknown'}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.studentProfile?.admissionNo && (
                            <div>Admission: {user.studentProfile.admissionNo}</div>
                          )}
                          {user.teacherProfile?.specialization && (
                            <div>Specialization: {user.teacherProfile.specialization}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleResetPassword(user)}
                          disabled={loading || user.status !== 'ACTIVE'}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Key className="h-3 w-3 mr-1" />
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{usersArray.length}</p>
                <p className="text-gray-500 text-sm">Total Users</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <School className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {usersArray.filter(u => u.role === 'TEACHER').length}
                </p>
                <p className="text-gray-500 text-sm">Teachers</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {usersArray.filter(u => u.role === 'STUDENT').length}
                </p>
                <p className="text-gray-500 text-sm">Students</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {usersArray.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length}
                </p>
                <p className="text-gray-500 text-sm">Admins</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;