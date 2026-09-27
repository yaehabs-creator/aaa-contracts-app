import React, { useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';

interface AppHeaderProps {
  onShowUserManagement?: () => void;
  showingUserManagement?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onShowUserManagement,
  showingUserManagement
}) => {
  const { user, signOut, isAdmin } = useAuth();
  const {
    smartSearchQuery,
    setSmartSearchQuery,
    isSearching,
    smartSearchClauses,
    activeView
  } = useAppStore();

  const debouncedSearchQuery = useDebounce(smartSearchQuery, 500);

  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      smartSearchClauses(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, smartSearchClauses]);

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
    <header className="bg-white/80 backdrop-blur-xl border-b border-surface-border px-8 h-16 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-mac-blue rounded-mac-xs flex items-center justify-center shadow-lg shadow-mac-blue/20 ring-1 ring-white/20">
          <span className="text-white font-black text-sm tracking-tighter">AEH</span>
        </div>
        <div>
          <h1 className="text-lg font-black text-mac-navy leading-none tracking-tight">
            {activeView === 'chat' ? 'AEhab Chat' : 'AEhab Intelligence'}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            {getRoleBadge()}
          </div>
        </div>
      </div>

      {/* Center Right: Smart Search */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-mac-blue transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={smartSearchQuery}
            onChange={(e) => setSmartSearchQuery(e.target.value)}
            placeholder="Ask anything about the contracts..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100/50 border border-transparent focus:bg-white focus:border-mac-blue/20 focus:ring-4 focus:ring-mac-blue/5 rounded-xl text-sm outline-none transition-all placeholder:text-gray-400 font-medium"
          />
          {isSearching && (
            <div className="absolute right-3 top-2.5">
              <div className="w-4 h-4 border-2 border-mac-blue border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Right: User Section */}
      <div className="flex items-center gap-6">
        {isAdmin() && onShowUserManagement && (
          <button
            onClick={onShowUserManagement}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              showingUserManagement
                ? 'bg-mac-blue text-white shadow-sm'
                : 'bg-black/5 text-mac-navy hover:bg-black/10'
            }`}
          >
            {showingUserManagement ? 'Back to App' : '⚙️ Users & Access'}
          </button>
        )}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-mac-navy leading-none">
              {user?.displayName || user?.email?.split('@')[0]}
            </span>
            <button onClick={signOut} className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
