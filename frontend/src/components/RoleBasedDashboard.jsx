import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import SuperAdminDashboard from '../pages/admin/SuperAdminDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';

const RoleBasedDashboard = () => {
  const { user } = useAuth();

  if (user?.role === 'SUPER_ADMIN') {
    return <SuperAdminDashboard />;
  }
  
  return <AdminDashboard />;
};

export default RoleBasedDashboard;