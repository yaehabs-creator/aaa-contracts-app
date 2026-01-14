import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AppHeaderProps {
  onShowUserManagement?: () => void;
  showingUserManagement?: boolean;
  onToggleBot?: () => void;
  isBotOpen?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onShowUserManagement, showingUserManagement, onToggleBot, isBotOpen }) => {
  const { user, signOut, isAdmin } = useAuth();

  const getRoleBadge = () => {
    if (!user) return null;
    
    const colors = {
      admin: '#e53e3e',
      editor: '#3182ce',
      viewer: '#38a169'
    };

    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        background: colors[user.role],
        color: 'white',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        marginLeft: '0.5rem'
      }}>
        {user.role.toUpperCase()}
      </span>
    );
  };

  return (
    <div style={{
      background: 'white',
      borderBottom: '1px solid #e2e8f0',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#2d3748' }}>
          🏢 AAA Contract Department
        </h1>
        {getRoleBadge()}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {onToggleBot && (
          <button
            onClick={onToggleBot}
            style={{
              padding: '0.5rem 1rem',
              background: isBotOpen ? '#0F2E6B' : '#e2e8f0',
              color: isBotOpen ? 'white' : '#2d3748',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            title={isBotOpen ? 'Close Claude AI Assistant' : 'Open Claude AI Assistant'}
          >
            {isBotOpen ? '🧠' : '💬'} Claude AI
          </button>
        )}

        <span style={{ color: '#718096', fontSize: '0.875rem' }}>
          {user?.displayName || user?.email}
        </span>

        {isAdmin() && (
          <button
            onClick={onShowUserManagement}
            style={{
              padding: '0.5rem 1rem',
              background: showingUserManagement ? '#667eea' : '#e2e8f0',
              color: showingUserManagement ? 'white' : '#2d3748',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}
          >
            {showingUserManagement ? '📊 Dashboard' : '👥 Users'}
          </button>
        )}

        <button
          onClick={signOut}
          style={{
            padding: '0.5rem 1rem',
            background: '#fc8181',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 'bold'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
