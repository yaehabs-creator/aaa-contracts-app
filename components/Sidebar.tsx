
import React from 'react';
import { Clause } from '../types';

interface SidebarProps {
  clauses?: Clause[];
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

export const Sidebar: React.FC<SidebarProps> = () => {
  return (
    <aside className="w-80 flex-shrink-0 bg-white/80 backdrop-blur-xl border-r border-surface-border h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-y-auto hidden lg:block p-6 custom-scrollbar z-40 animate-slide-left">
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
        <div className="w-12 h-12 rounded-2xl bg-aaa-bg border border-aaa-border flex items-center justify-center text-aaa-muted">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-aaa-muted">Sidebar Empty</p>
      </div>
    </aside>
  );
};
