import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#164734] border-t-transparent" />
          <p className="text-xs font-medium text-[#707872]">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!currentUser.is_active) {
    return <Navigate to="/login" replace />;
  }

  // Admin has access to everything
  if (currentUser.role === 'Admin') {
    return <>{children}</>;
  }

  // Check if role is allowed
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

