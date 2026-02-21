
import React from 'react';
import { Clause } from '../types';

interface SidebarProps {
  clauses?: Clause[];
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
  sortMode = 'default',
  onSortModeChange,
  isSaving = false,
  saveStatus = 'idle',
  handleSave
}) => {
  return (
    <aside className="w-80 flex-shrink-0 bg-white/80 backdrop-blur-xl border-r border-surface-border h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-y-auto hidden lg:block p-6 custom-scrollbar z-40 animate-slide-left">
      <div className="space-y-8">
        {/* Sort Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-aaa-border pb-2">
            <h4 className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em]">Sort Controls</h4>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onSortModeChange?.('default')}
              className={`w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all flex items-center gap-3 ${sortMode === 'default'
                  ? 'bg-aaa-blue text-white border-aaa-blue shadow-md'
                  : 'bg-white text-aaa-muted border-aaa-border hover:border-aaa-blue hover:text-aaa-blue'
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sortMode === 'default' ? 'bg-white' : 'bg-aaa-muted'}`} />
              Default
            </button>
            <button
              onClick={() => onSortModeChange?.('status')}
              className={`w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all flex items-center gap-3 ${sortMode === 'status'
                  ? 'bg-aaa-blue text-white border-aaa-blue shadow-md'
                  : 'bg-white text-aaa-muted border-aaa-border hover:border-aaa-blue hover:text-aaa-blue'
                }`}
              title="Group by: Added, Modified, GC-only"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sortMode === 'status' ? 'bg-white' : 'bg-aaa-muted'}`} />
              By Status
            </button>
            <button
              onClick={() => onSortModeChange?.('chapter')}
              className={`w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all flex items-center gap-3 ${sortMode === 'chapter'
                  ? 'bg-aaa-blue text-white border-aaa-blue shadow-md'
                  : 'bg-white text-aaa-muted border-aaa-border hover:border-aaa-blue hover:text-aaa-blue'
                }`}
              title="Sort by clause number"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sortMode === 'chapter' ? 'bg-white' : 'bg-aaa-muted'}`} />
              By Chapter
            </button>
          </div>
        </div>

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
              className={`w-full px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all relative overflow-hidden group ${isSaving
                  ? 'bg-aaa-bg text-aaa-muted cursor-not-allowed'
                  : saveStatus === 'success'
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200'
                    : 'bg-aaa-blue text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100 hover:shadow-2xl hover:-translate-y-0.5'
                }`}
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
