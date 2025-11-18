import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // CRITICAL: Only show loading during INITIAL auth check
  // Don't show loading for navigation between protected routes
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4"
            style={{ borderColor: '#D97706' }}
          ></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role permissions
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // User doesn't have permission - redirect to their dashboard
    const dashboardMap = {
      'SUPER_ADMIN': '/admin/dashboard',
      'ADMIN': '/admin/dashboard',
      'TEACHER': '/teacher/dashboard',
      'STUDENT': '/student/dashboard',
      'PARENT': '/parent/dashboard'
    };
    
    const redirectPath = dashboardMap[user?.role] || '/login';
    return <Navigate to={redirectPath} replace />;
  }

  // All checks passed - render children
  return children;
};

export default ProtectedRoute;