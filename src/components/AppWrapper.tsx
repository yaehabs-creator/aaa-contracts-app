import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { UserManagement } from './UserManagement';
import { AppHeader } from './AppHeader';

interface AppWrapperProps {
  children: React.ReactNode;
  onToggleBot?: () => void;
  isBotOpen?: boolean;
}

export const AppWrapper: React.FC<AppWrapperProps> = ({ children, onToggleBot, isBotOpen }) => {
  const { user, loading, canEdit } = useAuth();
  const [showUserManagement, setShowUserManagement] = useState(false);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F7FA' // aaa-bg
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '5px solid rgba(15, 46, 107, 0.1)', // aaa-blue with opacity
            borderTop: '5px solid #0F2E6B', // aaa-blue
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem'
          }} />
          <p style={{ color: '#1A2333', fontSize: '1.2rem', fontWeight: 'bold' }}>
            Loading AAA Contract Department...
          </p>
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

  if (!user) {
    return <LoginPage />;
  }

  // Check if user has permission to edit/create
  if (!canEdit() && !showUserManagement) {
    return (
      <div>
        <AppHeader 
          onShowUserManagement={() => setShowUserManagement(!showUserManagement)}
          showingUserManagement={showUserManagement}
          onToggleBot={onToggleBot}
          isBotOpen={isBotOpen}
        />
        <div style={{
          minHeight: 'calc(100vh - 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7fafc',
          padding: '2rem'
        }}>
          <div style={{
            background: 'white',
            padding: '3rem',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#fef3c7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem',
              fontSize: '2rem'
            }}>
              👁️
            </div>
            <h2 style={{ marginBottom: '1rem', color: '#2d3748' }}>View-Only Access</h2>
            <p style={{ color: '#718096', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Your account has <strong>Viewer</strong> permissions. You can view contracts 
              but cannot create or edit them.
            </p>
            <p style={{ color: '#718096', fontSize: '0.875rem' }}>
              Contact your administrator to request elevated permissions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppHeader 
        onShowUserManagement={() => setShowUserManagement(!showUserManagement)}
        showingUserManagement={showUserManagement}
        onToggleBot={onToggleBot}
        isBotOpen={isBotOpen}
      />
      {showUserManagement ? <UserManagement /> : children}
    </div>
  );
};
