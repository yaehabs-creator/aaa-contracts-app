import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { UserManagement } from './UserManagement';

interface ProtectedAppProps {
  children: React.ReactNode;
  showUserManagement?: boolean;
}

export const ProtectedApp: React.FC<ProtectedAppProps> = ({ children, showUserManagement }) => {
  const { user, loading, loginRequired } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#718096' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If login is not required and user is not logged in, allow access
  // But if showUserManagement is requested and user is not logged in, show login
  if (!user) {
    if (!loginRequired && !showUserManagement) {
      // Login is disabled - allow access to the app without authentication
      return <>{children}</>;
    }
    // Login is required or trying to access admin area - show login page
    return <LoginPage />;
  }

  if (showUserManagement) {
    return <UserManagement />;
  }

  return <>{children}</>;
};
