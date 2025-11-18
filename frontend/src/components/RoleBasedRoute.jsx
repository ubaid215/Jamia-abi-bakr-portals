import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard
    switch (user?.role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return <Navigate to="/admin/dashboard" replace />;
      case 'TEACHER':
        return <Navigate to="/teacher/dashboard" replace />;
      case 'STUDENT':
        return <Navigate to="/student/dashboard" replace />;
      case 'PARENT':
        return <Navigate to="/parent/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default RoleBasedRoute;