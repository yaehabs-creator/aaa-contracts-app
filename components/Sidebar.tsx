import React, { useState, useMemo } from 'react';
import { Clause, SavedContract, SectionType } from '../types';
import { scrollToClauseByNumber } from '../src/hooks/useContractLedgerData';
import { ensureContractHasSections } from '../services/contractMigrationService';

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
  const [navSearch, setNavSearch] = useState('');

  const contractWithSections = useMemo(() => {
    if (!contract) return null;
    return ensureContractHasSections(contract);
  }, [contract]);

  const filteredClauses = useMemo(() => {
    // If not on conditions tab, we might want to show items from the active section
    // but for now, the 'clauses' prop usually contains the Conditions data.
    if (!navSearch) return clauses;
    const lowerSearch = navSearch.toLowerCase();
    return clauses.filter(c =>
      c.clause_number?.toLowerCase().includes(lowerSearch) ||
      c.clause_title?.toLowerCase().includes(lowerSearch)
    );
  }, [clauses, navSearch]);

  const sections = useMemo(() => {
    if (!contractWithSections?.sections) return [];
    return contractWithSections.sections;
  }, [contractWithSections]);

  return (
    <aside className="w-80 flex-shrink-0 bg-white/80 backdrop-blur-xl border-r border-surface-border h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-y-auto hidden lg:block custom-scrollbar z-40 animate-slide-left">
      <div className="p-6 space-y-8">
        {/* Section Navigation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-aaa-border pb-2">
            <h4 className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em]">Sections</h4>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => onTabChange('CONDITIONS')}
              className={`w - full text - left px - 3 py - 2 rounded - xl text - [11px] font - bold transition - all flex items - center gap - 2 ${activeTab === 'CONDITIONS'
                  ? 'bg-aaa-blue text-white shadow-md'
                  : 'text-aaa-muted hover:bg-aaa-bg hover:text-aaa-blue'
                } `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2-8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Conditions of Contract
            </button>
            {sections.filter(s => s.sectionType !== SectionType.GENERAL && s.sectionType !== SectionType.PARTICULAR).map(section => (
              <button
                key={section.sectionType}
                onClick={() => onTabChange(section.sectionType)}
                className={`w - full text - left px - 3 py - 2 rounded - xl text - [11px] font - bold transition - all flex items - center gap - 2 ${activeTab === section.sectionType
                    ? 'bg-aaa-blue text-white shadow-md'
                    : 'text-aaa-muted hover:bg-aaa-bg hover:text-aaa-blue'
                  } `}
              >
                <div className="w-1 h-1 rounded-full bg-current opacity-40" />
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Section */}
        {activeTab === 'CONDITIONS' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-aaa-border pb-2">
              <h4 className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em]">Sort Controls</h4>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onSortModeChange?.('default')}
                className={`w - full px - 4 py - 2.5 text - [10px] font - black uppercase tracking - widest rounded - xl border transition - all flex items - center gap - 3 ${sortMode === 'default'
                    ? 'bg-aaa-blue text-white border-aaa-blue shadow-md'
                    : 'bg-white text-aaa-muted border-aaa-border hover:border-aaa-blue hover:text-aaa-blue'
                  } `}
              >
                <span className={`w - 1.5 h - 1.5 rounded - full ${sortMode === 'default' ? 'bg-white' : 'bg-aaa-muted'} `} />
                Default
              </button>
              <button
                onClick={() => onSortModeChange?.('status')}
                className={`w - full px - 4 py - 2.5 text - [10px] font - black uppercase tracking - widest rounded - xl border transition - all flex items - center gap - 3 ${sortMode === 'status'
                    ? 'bg-aaa-blue text-white border-aaa-blue shadow-md'
                    : 'bg-white text-aaa-muted border-aaa-border hover:border-aaa-blue hover:text-aaa-blue'
                  } `}
                title="Group by: Added, Modified, GC-only"
              >
                <span className={`w - 1.5 h - 1.5 rounded - full ${sortMode === 'status' ? 'bg-white' : 'bg-aaa-muted'} `} />
                By Status
              </button>
              <button
                onClick={() => onSortModeChange?.('chapter')}
                className={`w - full px - 4 py - 2.5 text - [10px] font - black uppercase tracking - widest rounded - xl border transition - all flex items - center gap - 3 ${sortMode === 'chapter'
                    ? 'bg-aaa-blue text-white border-aaa-blue shadow-md'
                    : 'bg-white text-aaa-muted border-aaa-border hover:border-aaa-blue hover:text-aaa-blue'
                  } `}
                title="Sort by clause number"
              >
                <span className={`w - 1.5 h - 1.5 rounded - full ${sortMode === 'chapter' ? 'bg-white' : 'bg-aaa-muted'} `} />
                By Chapter
              </button>
            </div>
          </div>
        )}

        {/* Navigation Section */}
        {activeTab === 'CONDITIONS' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-aaa-border pb-2">
              <h4 className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em]">Clause Navigation</h4>
              <span className="text-[9px] font-bold text-aaa-muted px-2 py-0.5 bg-aaa-bg rounded-full">
                {filteredClauses.length} Clauses
              </span>
            </div>

            {/* Nav Search */}
            <div className="relative group">
              <input
                type="text"
                placeholder="Search clauses..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-aaa-bg border border-transparent focus:border-aaa-blue/30 focus:bg-white rounded-xl text-[11px] font-medium transition-all group-hover:border-aaa-border"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-2.5 w-3.5 h-3.5 text-aaa-muted group-focus-within:text-aaa-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredClauses.map((clause) => (
                <button
                  key={`${clause.clause_number} -${clause.condition_type} `}
                  onClick={() => scrollToClauseByNumber(clause.clause_number)}
                  className="w-full text-left p-3 rounded-xl border border-transparent hover:border-aaa-blue/10 hover:bg-aaa-blue/5 transition-all group/item"
                >
                  <div className="flex items-start gap-3">
                    <span className="px-1.5 py-0.5 bg-aaa-blue/10 text-aaa-blue rounded font-black text-[9px] min-w-[32px] text-center">
                      {clause.clause_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-aaa-text truncate group-hover/item:text-aaa-blue transition-colors">
                        {clause.clause_title || 'Untitled Clause'}
                      </p>
                      <p className="text-[9px] text-aaa-muted font-medium truncate opacity-60">
                        {clause.condition_type} Condition
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {filteredClauses.length === 0 && (
                <div className="py-8 text-center bg-aaa-bg/50 rounded-2xl border border-dashed border-aaa-border">
                  <p className="text-[10px] font-bold text-aaa-muted italic">No matching clauses</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Section */}
        <div className="pt-4 border-t border-aaa-border space-y-4">
          <div className="flex flex-col gap-3">
            {saveStatus === 'success' && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Changes Saved
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Save Failed
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`w - full px - 6 py - 4 rounded - 2xl font - black text - [11px] uppercase tracking - [0.2em] transition - all relative overflow - hidden group ${isSaving
                  ? 'bg-aaa-bg text-aaa-muted cursor-not-allowed'
                  : saveStatus === 'success'
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200'
                    : 'bg-aaa-blue text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 hover:shadow-2xl hover:-translate-y-0.5'
                } `}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Changes
                  </>
                )}
              </span>
              {!isSaving && saveStatus === 'idle' && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
