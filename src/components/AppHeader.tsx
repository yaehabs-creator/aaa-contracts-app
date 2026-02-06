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

    const roleStyles: Record<string, string> = {
      admin: 'bg-red-50 text-red-600',
      editor: 'bg-mac-blue-subtle text-mac-blue',
      viewer: 'bg-emerald-50 text-emerald-600'
    };

    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${roleStyles[user.role] || roleStyles.viewer}`}>
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
      </span>
    );
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-surface-border px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 bg-mac-blue rounded-mac-xs flex items-center justify-center">
          <span className="text-white font-bold text-sm">AE</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-mac-navy">Contract Department</h1>
        </div>
        {getRoleBadge()}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-mac-muted">
          {user?.displayName || user?.email}
        </span>

        {isAdmin() && (
          <button
            onClick={onShowUserManagement}
            className={`px-4 py-2 rounded-mac-xs text-sm font-medium transition-all ${showingUserManagement
                ? 'bg-mac-blue text-white'
                : 'bg-surface-bg text-mac-charcoal hover:bg-surface-bg-subtle border border-surface-border'
              }`}
          >
            {showingUserManagement ? 'Dashboard' : 'Users'}
          </button>
        )}

        <button
          onClick={signOut}
          className="px-4 py-2 bg-white border border-surface-border text-mac-muted hover:text-red-500 hover:border-red-300 rounded-mac-xs text-sm font-medium transition-all"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
};
