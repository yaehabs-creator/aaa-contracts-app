import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { AnalysisStatus } from '../types';

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
    toggleBot
  } = useAppStore();

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
      <div className="flex items-center gap-4 cursor-pointer" onClick={goBackToLibrary}>
        <div className="w-10 h-10 bg-mac-blue rounded-mac-xs flex items-center justify-center">
          <span className="text-white font-bold text-sm">AAA</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-mac-navy leading-none">Contract Department</h1>
          <div className="mt-1 flex items-center gap-2">
            {getRoleBadge()}
          </div>
        </div>
      </div>

      {/* Center: Search & Actions (Visible when contract active) */}
      <div className="flex items-center gap-3">
        {status === AnalysisStatus.COMPLETED && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 bg-white border border-surface-border rounded-mac-xs hover:border-mac-blue transition-all group"
              title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-mac-muted group-hover:text-mac-blue ${!isSidebarOpen ? 'rotate-180' : ''} transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            <div className="relative flex items-center">
              <input
                type="text"
                value={smartSearchQuery}
                onChange={(e) => setSmartSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                placeholder="Search clauses..."
                className="w-72 px-4 py-2 bg-white border border-surface-border rounded-mac-sm text-sm focus:border-mac-blue focus:shadow-mac-focus outline-none transition-all"
              />
              <button
                onClick={handleSmartSearch}
                disabled={isSearching}
                className="absolute right-1.5 p-1.5 bg-mac-blue text-white rounded-md hover:bg-mac-blue-hover transition-colors disabled:bg-mac-muted"
              >
                {isSearching ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Global Navigation */}
        <button
          onClick={() => setStatus(AnalysisStatus.LIBRARY)}
          className="flex items-center gap-3 px-5 py-2.5 bg-white border border-aaa-border rounded-xl shadow-sm hover:shadow-md transition-all group"
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-aaa-muted group-hover:text-aaa-blue">Archive</span>
          <span className="w-6 h-6 bg-aaa-bg rounded-lg flex items-center justify-center text-[10px] font-black text-aaa-blue border border-aaa-blue/10">{library.length}</span>
        </button>

        {isAdmin() && (
          <a
            href="#/admin/contract-editor"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl shadow-sm hover:shadow-md hover:bg-amber-100 transition-all group"
            title="Open Admin Contract Editor"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Admin</span>
          </a>
        )}

        <button
          onClick={() => setStatus(AnalysisStatus.ORGANIZER)}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all group ${status === AnalysisStatus.ORGANIZER ? 'bg-aaa-blue text-white' : 'bg-white border border-aaa-border'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${status === AnalysisStatus.ORGANIZER ? 'text-white' : 'text-aaa-muted group-hover:text-aaa-blue'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className={`text-[10px] font-black uppercase tracking-widest ${status === AnalysisStatus.ORGANIZER ? 'text-white' : 'text-aaa-muted group-hover:text-aaa-blue'}`}>Organizer</span>
        </button>

        <div className="h-8 w-[1px] bg-surface-border mx-2" />

        <button
          onClick={toggleBot}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all group ${isBotOpen ? 'bg-purple-600 text-white shadow-purple-200' : 'bg-white border border-aaa-border'}`}
          title="Toggle AI Assistant"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${isBotOpen ? 'text-white' : 'text-purple-600 group-hover:text-purple-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isBotOpen ? 'text-white' : 'text-aaa-muted group-hover:text-purple-600'}`}>AI Assistant</span>
        </button>

        <div className="h-8 w-[1px] bg-surface-border mx-2" />

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-mac-navy leading-none">
              {user?.displayName || user?.email?.split('@')[0]}
            </span>
            <button onClick={signOut} className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors">
              Sign Out
            </button>
          </div>
          {isAdmin() && (
            <button
              onClick={onShowUserManagement}
              className={`p-2 rounded-mac-xs transition-all ${showingUserManagement ? 'bg-mac-blue text-white shadow-mac-focus' : 'bg-surface-bg text-mac-muted hover:text-mac-blue border border-surface-border'}`}
              title="User Management"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-9-3.414M7 9a2 2 0 114 0 2 2 0 01-4 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
