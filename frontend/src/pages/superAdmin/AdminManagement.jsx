/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Shield,
  UserCheck,
  UserX,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  PauseCircle
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { toast } from 'react-hot-toast';

const AdminManagement = () => {
  const { admins, fetchAdmins, createAdmin, updateUserStatus, deleteUser, loading } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null); // Track which admin is updating status

  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // FIX: Safely handle admins data - ensure it's always an array
  const filteredAdmins = (Array.isArray(admins) ? admins : []).filter(admin => {
    // Add null checks for admin properties
    const adminName = admin?.name || '';
    const adminEmail = admin?.email || '';
    const adminStatus = admin?.status || '';
    
    const matchesSearch = adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         adminEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || adminStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    
    if (newAdmin.password !== newAdmin.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await createAdmin({
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        password: newAdmin.password,
        role: 'ADMIN'
      });
      
      toast.success('Admin created successfully');
      setShowCreateModal(false);
      setNewAdmin({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error(error.message || 'Failed to create admin');
    }
  };

  const handleStatusChange = async (adminId, newStatus) => {
    setUpdatingStatus(adminId);
    try {
      await updateUserStatus(adminId, newStatus);
      toast.success(`Admin status updated to ${getStatusLabel(newStatus)}`);
      setActionMenu(null);
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (window.confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
      try {
        await deleteUser(adminId);
        toast.success('Admin deleted successfully');
        setActionMenu(null);
      } catch (error) {
        toast.error(error.message || 'Failed to delete admin');
      }
    }
  };

  // Get status label with icon
  const getStatusLabel = (status) => {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'INACTIVE': return 'Inactive';
      case 'TERMINATED': return 'Terminated';
      default: return 'Unknown';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="h-4 w-4" />;
      case 'INACTIVE': return <PauseCircle className="h-4 w-4" />;
      case 'TERMINATED': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  // Get status color with improved UI
  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': 
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          dot: 'bg-green-500'
        };
      case 'INACTIVE': 
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          dot: 'bg-yellow-500'
        };
      case 'TERMINATED': 
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          dot: 'bg-red-500'
        };
      default: 
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          dot: 'bg-gray-500'
        };
    }
  };

  // Status options for dropdown
  const statusOptions = [
    { value: 'ACTIVE', label: 'Active', icon: <CheckCircle className="h-4 w-4 text-green-600" /> },
    { value: 'INACTIVE', label: 'Inactive', icon: <PauseCircle className="h-4 w-4 text-yellow-600" /> },
    { value: 'TERMINATED', label: 'Terminated', icon: <XCircle className="h-4 w-4 text-red-600" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#92400E]">Admin Management</h1>
            <p className="text-[#B45309] text-sm sm:text-base mt-1 sm:mt-2">
              Manage administrator accounts and permissions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 flex items-center justify-center space-x-2 bg-linear-to-r from-[#F59E0B] to-[#D97706] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 font-semibold text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Add Admin</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search admins by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm sm:text-base"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Admins Grid/Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Mobile View - Cards */}
        <div className="sm:hidden space-y-4 p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F59E0B]"></div>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-sm">No admins found</p>
            </div>
          ) : (
            filteredAdmins.map((admin) => {
              const statusColors = getStatusColor(admin.status);
              return (
                <div key={admin.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-linear-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {admin.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{admin.name}</h3>
                        <p className="text-gray-500 text-xs">{admin.email}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === admin.id ? null : admin.id)}
                        className="p-1 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>
                      {actionMenu === admin.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-48">
                          <div className="px-3 py-2 border-b border-gray-100">
                            <p className="text-xs font-medium text-gray-500">Change Status</p>
                          </div>
                          {statusOptions.map((option) => {
                            const isCurrent = admin.status === option.value;
                            return (
                              <button
                                key={option.value}
                                onClick={() => handleStatusChange(admin.id, option.value)}
                                disabled={updatingStatus === admin.id || isCurrent}
                                className={`flex items-center justify-between w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                                  isCurrent ? 'bg-gray-50' : ''
                                } ${updatingStatus === admin.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-center space-x-2">
                                  {option.icon}
                                  <span>{option.label}</span>
                                </div>
                                {isCurrent && (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                )}
                              </button>
                            );
                          })}
                          <div className="border-t border-gray-100">
                            <button
                              onClick={() => handleDeleteAdmin(admin.id)}
                              className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete Admin</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Display */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center space-x-1 px-3 py-1 rounded-full border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                        <div className={`w-2 h-2 rounded-full ${statusColors.dot}`}></div>
                        <span className="text-xs font-medium">{getStatusLabel(admin.status)}</span>
                      </div>
                      {updatingStatus === admin.id && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#F59E0B]"></div>
                      )}
                    </div>
                    <span className="text-gray-500 text-xs">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {admin.phone && (
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{admin.phone}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Admin</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Contact</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Created</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F59E0B]"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p>No admins found</p>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const statusColors = getStatusColor(admin.status);
                  return (
                    <tr key={admin.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-linear-to-r from-[#F59E0B] to-[#D97706] rounded-full flex items-center justify-center text-white font-semibold">
                            {admin.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{admin.name}</h3>
                            <p className="text-gray-500 text-sm">Admin Account</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4" />
                            <span>{admin.email}</span>
                          </div>
                          {admin.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              <span>{admin.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                            <div className={`w-2 h-2 rounded-full ${statusColors.dot}`}></div>
                            <span className="text-sm font-medium">{getStatusLabel(admin.status)}</span>
                          </div>
                          {updatingStatus === admin.id && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#F59E0B]"></div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="relative">
                          <div className="flex items-center space-x-2">
                            {/* Quick Status Change Buttons */}
                            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                              {statusOptions.map((option) => {
                                const isCurrent = admin.status === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    onClick={() => handleStatusChange(admin.id, option.value)}
                                    disabled={updatingStatus === admin.id || isCurrent}
                                    className={`p-2 rounded-md transition-all ${
                                      isCurrent 
                                        ? 'bg-white shadow-sm border border-gray-200' 
                                        : 'hover:bg-gray-200'
                                    } ${updatingStatus === admin.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title={`Set to ${option.label}`}
                                  >
                                    <div className={`${option.value === 'ACTIVE' ? 'text-green-600' : ''} ${
                                      option.value === 'INACTIVE' ? 'text-yellow-600' : ''
                                    } ${option.value === 'TERMINATED' ? 'text-red-600' : ''}`}>
                                      {React.cloneElement(option.icon, {
                                        className: `h-4 w-4 ${isCurrent ? 'opacity-100' : 'opacity-60'}`
                                      })}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteAdmin(admin.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Admin"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          
                          {/* Status Dropdown (Alternative) */}
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 hidden">
                            <div className="px-3 py-2 border-b border-gray-100">
                              <p className="text-xs font-medium text-gray-500">Change Status</p>
                            </div>
                            {statusOptions.map((option) => {
                              const isCurrent = admin.status === option.value;
                              return (
                                <button
                                  key={option.value}
                                  onClick={() => handleStatusChange(admin.id, option.value)}
                                  disabled={updatingStatus === admin.id || isCurrent}
                                  className={`flex items-center justify-between w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                                    isCurrent ? 'bg-gray-50' : ''
                                  } ${updatingStatus === admin.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <div className="flex items-center space-x-2">
                                    {option.icon}
                                    <span>{option.label}</span>
                                  </div>
                                  {isCurrent && (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-2xl bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create New Admin</h2>
              <p className="text-gray-600 text-sm mt-1">Add a new administrator to the system</p>
            </div>
            
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                  placeholder="Enter full name"
                />
              </div>
              
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                  placeholder="Enter email address"
                />
              </div> */}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({...newAdmin, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                  placeholder="Enter phone number"
                />
              </div>
              
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                  placeholder="Enter password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={newAdmin.confirmPassword}
                  onChange={(e) => setNewAdmin({...newAdmin, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent text-sm"
                  placeholder="Confirm password"
                />
              </div> */}
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-linear-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:from-[#D97706] hover:to-[#B45309] transition-all duration-200 disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close action menu when clicking outside */}
      {actionMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActionMenu(null)}
        />
      )}
    </div>
  );
};

export default AdminManagement;