import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AdminGuard Component
 * Protects admin-only routes by checking if the current user has admin role.
 * Shows access denied message if user is not an admin.
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({ children, fallback }) => {
  const { user, loading, isAdmin } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-aaa-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-aaa-muted font-medium">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-premium border border-aaa-border p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-aaa-text mb-3">Authentication Required</h2>
          <p className="text-aaa-muted mb-6">Please sign in to access this page.</p>
          <a
            href="/"
            className="inline-block px-8 py-3 bg-aaa-blue text-white font-bold rounded-xl hover:bg-aaa-hover transition-all"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin()) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-premium border border-aaa-border p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-aaa-text mb-3">Access Denied</h2>
          <p className="text-aaa-muted mb-4">
            This page is restricted to administrators only.
          </p>
          <p className="text-sm text-aaa-muted mb-6">
            Current role: <span className="font-semibold text-aaa-text">{user.role}</span>
          </p>
          <a
            href="/"
            className="inline-block px-8 py-3 bg-aaa-blue text-white font-bold rounded-xl hover:bg-aaa-hover transition-all"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // User is admin, render children
  return <>{children}</>;
};

export default AdminGuard;
