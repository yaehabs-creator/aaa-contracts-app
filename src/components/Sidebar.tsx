import React, { useState, useMemo } from 'react';
import { Clause, SavedContract, SectionType } from '@/types';
import { scrollToClauseByNumber } from '@/hooks/useContractLedgerData';
import { ensureContractHasSections } from '@/services/contractMigrationService';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  contract: SavedContract | null;
  clauses?: Clause[];
  activeTab: SectionType | 'CONDITIONS';
  onTabChange: (tab: SectionType | 'CONDITIONS') => void;
  sortMode?: 'default' | 'status' | 'chapter' | 'category';
  onSortModeChange?: (mode: 'default' | 'status' | 'chapter' | 'category') => void;
  isSaving?: boolean;
  saveStatus?: 'idle' | 'success' | 'error';
  handleSave?: () => void;
  // Other props kept for compatibility
  selectedTypes?: any;
  setSelectedTypes?: any;
  selectedGroup?: any;
  setSelectedGroup?: any;
  searchQuery?: any;
  setSearchQuery?: any;
  onReorder?: any;
  onDelete?: any;
  onClausesUpdate?: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  contract,
  clauses = [],
  activeTab,
  onTabChange,
  sortMode = 'default',
  onSortModeChange,
  isSaving = false,
  saveStatus = 'idle',
  handleSave
}) => {
  const { isAdmin } = useAuth();
  const [navSearch, setNavSearch] = useState('');

  const contractWithSections = useMemo(() => {
    if (!contract) return null;
    return ensureContractHasSections(contract);
  }, [contract]);

  const filteredClauses = useMemo(() => {
    let result = clauses;

    // Filter out hidden items for non-admins
    if (!isAdmin()) {
      result = result.filter(c => !c.isHidden);
    }

    if (!navSearch) return result;
    const lowerSearch = navSearch.toLowerCase();
    return result.filter(c =>
      c.clause_number?.toLowerCase().includes(lowerSearch) ||
      c.clause_title?.toLowerCase().includes(lowerSearch)
    );
  }, [clauses, navSearch, isAdmin]);

  const sections = useMemo(() => {
    if (!contractWithSections?.sections) return [];
    return contractWithSections.sections;
  }, [contractWithSections]);

  return (
    <aside className="w-80 flex-shrink-0 bg-white/40 backdrop-blur-2xl border-r border-slate-200/60 h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-hidden hidden lg:flex flex-col z-40 animate-slide-left shadow-sm">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
        {/* Section Navigation */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Document Map</h4>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => onTabChange('CONDITIONS')}
              className={`w-full text-left px-4 py-3 rounded-2xl text-[12px] font-bold transition-all flex items-center gap-3 group relative overflow-hidden ${activeTab === 'CONDITIONS'
                ? 'bg-aaa-blue text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-600 hover:bg-white hover:text-aaa-blue hover:shadow-sm'
                }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full transition-all ${activeTab === 'CONDITIONS' ? 'bg-white scale-125' : 'bg-slate-300 group-hover:bg-aaa-blue'
                }`} />
              <span className="relative z-10">Conditions of Contract</span>
              {activeTab === 'CONDITIONS' && (
                <div className="absolute right-3 opacity-20 scale-150 rotate-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </button>

            {sections.filter(s => s.sectionType !== SectionType.GENERAL && s.sectionType !== SectionType.PARTICULAR).map(section => {
              const isActive = activeTab === section.sectionType;
              return (
                <button
                  key={section.sectionType}
                  onClick={() => onTabChange(section.sectionType)}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-[12px] font-bold transition-all flex items-center gap-3 group border ${isActive
                    ? 'bg-aaa-blue text-white border-aaa-blue shadow-lg shadow-blue-900/20'
                    : 'text-slate-500 border-transparent hover:bg-white hover:text-aaa-blue hover:border-slate-100 hover:shadow-sm'
                    }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${isActive ? 'bg-white scale-125' : 'bg-slate-200 group-hover:bg-aaa-blue'
                    }`} />
                  {section.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clause Navigation Section */}
        {activeTab === 'CONDITIONS' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Content Explorer</h4>
              </div>
              <span className="text-[9px] font-black text-aaa-blue px-2.5 py-1 bg-aaa-blue/5 border border-aaa-blue/10 rounded-full">
                {clauses.length} ITEMS
              </span>
            </div>

            {/* Search Box */}
            <div className="relative group">
              <input
                type="text"
                placeholder="Find clause..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 focus:border-aaa-blue focus:ring-4 focus:ring-aaa-blue/5 rounded-2xl text-[12px] font-medium transition-all shadow-sm placeholder:text-slate-300"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-300 group-focus-within:text-aaa-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Sort Controls Inlined here for better flow */}
            <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
              {[
                { id: 'default', label: 'Order', icon: 'M4 6h16M4 12h16M4 18h7' },
                { id: 'status', label: 'Status', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                { id: 'chapter', label: 'Chapter', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => onSortModeChange?.(opt.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${sortMode === opt.id
                    ? 'bg-white text-aaa-blue shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={opt.icon} />
                  </svg>
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredClauses.map((clause) => (
                <button
                  key={`${clause.clause_number}-${clause.condition_type}`}
                  onClick={() => scrollToClauseByNumber(clause.clause_number)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all group/item relative overflow-hidden ${clause.isHidden
                    ? 'bg-amber-50/50 border-amber-100 opacity-60'
                    : 'border-transparent hover:border-slate-100 hover:bg-white hover:shadow-md hover:shadow-slate-100/50'
                    }`}
                >
                  {clause.isHidden && (
                    <div className="absolute top-0 right-0 p-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 px-2 py-1 bg-slate-50 text-slate-400 group-hover/item:bg-aaa-blue/5 group-hover/item:text-aaa-blue rounded-lg font-black text-[10px] min-w-[36px] text-center border border-slate-100/50 transition-colors">
                      {clause.clause_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-700 leading-tight mb-0.5 group-hover/item:text-aaa-blue transition-colors">
                        {clause.clause_title || 'Untitled Clause'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 rounded-md ${clause.condition_type === 'Particular'
                          ? 'text-indigo-500 bg-indigo-50/50'
                          : 'text-slate-400 bg-slate-50'
                          }`}>
                          {clause.condition_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredClauses.length === 0 && (
                <div className="py-10 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-[11px] font-bold text-slate-300 italic">Criteria returned no results</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-6 bg-white/40 backdrop-blur-md border-t border-slate-100 space-y-4">
        <div className="flex flex-col gap-3">
          {saveStatus === 'success' && (
            <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-[10px] font-black uppercase tracking-[0.1em] animate-in fade-in slide-in-from-bottom-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Cloud Synchronized
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-[0.1em] animate-in fade-in slide-in-from-bottom-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Sync Failed
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all relative overflow-hidden group shadow-2xl ${isSaving
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              : saveStatus === 'success'
                ? 'bg-amber-400 text-white hover:bg-amber-500 shadow-amber-200 active:scale-95'
                : 'bg-aaa-blue text-white hover:bg-blue-900 shadow-blue-900/20 active:scale-95'
              }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing Core...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V10" />
                  </svg>
                  Save Progress
                </>
              )}
            </span>
            {!isSaving && saveStatus === 'idle' && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
