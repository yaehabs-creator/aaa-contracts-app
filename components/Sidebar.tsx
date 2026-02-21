
import React, { useMemo } from 'react';
import { Clause } from '../types';

interface SidebarProps {
  clauses: Clause[];
  // Other props kept for compatibility with App.tsx but currently unused in UI
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

// Helper: Get clause status (added, modified, gc-only)
const getClauseStatus = (clause: Clause): 'added' | 'modified' | 'gc-only' => {
  const hasPC = clause.particular_condition && clause.particular_condition.length > 0;
  const hasGC = clause.general_condition && clause.general_condition.length > 0;

  if (hasPC && !hasGC) return 'added';
  if (hasPC && hasGC) return 'modified';
  if (hasGC) return 'gc-only';

  if (clause.condition_type === 'Particular') return 'added';
  return 'gc-only';
};

export const Sidebar: React.FC<SidebarProps> = ({
  clauses = []
}) => {
  // Calculate statistics
  const stats = useMemo(() => {
    const total = clauses.length;
    const added = clauses.filter(c => getClauseStatus(c) === 'added').length;
    const modified = clauses.filter(c => getClauseStatus(c) === 'modified').length;
    const gcOnly = total - added - modified;
    const pcCoverage = total > 0 ? Math.round(((added + modified) / total) * 100) : 0;
    return { total, added, modified, gcOnly, pcCoverage };
  }, [clauses]);

  return (
    <aside className="w-80 flex-shrink-0 bg-white/80 backdrop-blur-xl border-r border-surface-border h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-y-auto hidden lg:block p-6 custom-scrollbar z-40 animate-slide-left">
      <div className="space-y-8">
        {/* Ledger Statistics Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black text-aaa-blue uppercase tracking-[0.2em]">Ledger Statistics</h4>
            <div className="p-1.5 rounded-lg hover:bg-aaa-bg transition-colors cursor-pointer text-aaa-muted">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Card */}
            <div className="bg-white border border-aaa-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
              <div className="text-2xl font-black text-aaa-blue group-hover:scale-110 transition-transform origin-left">
                {stats.total}
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-aaa-muted mt-1">Total</div>
            </div>

            {/* Added Card */}
            <div className="bg-emerald-50/30 border border-emerald-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
              <div className="text-2xl font-black text-emerald-600 group-hover:scale-110 transition-transform origin-left">
                {stats.added}
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mt-1">Added</div>
            </div>

            {/* Modified Card */}
            <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
              <div className="text-2xl font-black text-blue-600 group-hover:scale-110 transition-transform origin-left">
                {stats.modified}
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-blue-600 mt-1">Modified</div>
            </div>

            {/* GC Only Card */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
              <div className="text-2xl font-black text-aaa-muted group-hover:scale-110 transition-transform origin-left">
                {stats.gcOnly}
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-aaa-muted mt-1">GC Only</div>
            </div>
          </div>

          {/* PC Coverage Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-aaa-muted uppercase tracking-widest">PC Coverage Ratio</span>
              <span className="text-xs font-black text-aaa-blue">{stats.pcCoverage}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-aaa-blue to-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-sm"
                style={{ width: `${stats.pcCoverage}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
                Added
              </span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-sm" />
                Modified
              </span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-aaa-border to-transparent opacity-50" />

        {/* Placeholder for future sidebar items (e.g., Quick Filters or categories) */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-aaa-muted uppercase tracking-[0.2em] opacity-40">System Context</h4>
          <div className="p-6 border-2 border-dashed border-aaa-border rounded-[32px] bg-aaa-bg/20 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-aaa-border flex items-center justify-center text-aaa-muted">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-aaa-muted/60 uppercase tracking-widest">Additional panels will appear here during analysis</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
