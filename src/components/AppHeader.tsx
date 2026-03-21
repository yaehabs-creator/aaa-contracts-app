import React, { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { AnalysisStatus } from '../types';
import { OpenClawProcessModal } from './OpenClawProcessModal';

interface AppHeaderProps {
  onShowUserManagement?: () => void;
  showingUserManagement?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onShowUserManagement,
  showingUserManagement
}) => {
  const { user, signOut, isAdmin } = useAuth();
  const [showOpenClawModal, setShowOpenClawModal] = useState(false);
  const {
    status,
    setStatus,
    isSidebarOpen,
    setIsSidebarOpen,
    smartSearchQuery,
    setSmartSearchQuery,
    library,
    activeContractId,
    setActiveContractId,
    setClauses,
    isSearching,
    smartSearchClauses,
    isBotOpen,
    toggleBot,
    activeView,
    setActiveView,
    isOpenClawActive
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

  const goBackToLibrary = () => {
    setStatus(AnalysisStatus.LIBRARY);
    setClauses([]);
    setActiveContractId(null);
  };

  const handleSmartSearch = () => {
    smartSearchClauses(smartSearchQuery);
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-surface-border px-8 h-16 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-mac-blue rounded-mac-xs flex items-center justify-center">
          <span className="text-white font-bold text-sm">AAA</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-mac-navy leading-none">
            {activeView === 'chat' ? 'AI Chat' : 'Contract Intelligence'}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            {getRoleBadge()}
          </div>
        </div>
      </div>

      <div className="flex items-center bg-gray-100/50 p-1 rounded-xl border border-gray-200/50">
        <button
          onClick={() => setActiveView('chat')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
            activeView === 'chat' 
              ? 'bg-white text-mac-blue shadow-sm ring-1 ring-black/5' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          AI Chat
        </button>
        <button
          onClick={() => setActiveView('hub')}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
            activeView === 'hub' 
              ? 'bg-white text-mac-blue shadow-sm ring-1 ring-black/5' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Contract Hub
        </button>
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
