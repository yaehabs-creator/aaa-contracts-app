
import React, { useState } from 'react';
import { Clause, ConditionType } from '../types';

interface SidebarProps {
  clauses: Clause[];
  selectedTypes: ConditionType[];
  setSelectedTypes: (types: ConditionType[]) => void;
  selectedGroup: string | null;
  setSelectedGroup: (group: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onDelete?: (index: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  clauses, 
  selectedTypes, 
  setSelectedTypes, 
  selectedGroup, 
  setSelectedGroup,
  searchQuery,
  setSearchQuery,
  onReorder,
  onDelete
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const groups = Array.from(new Set((clauses || []).map(c => {
    if (!c || !c.clause_number) return 'Other';
    // Match alphanumeric clause numbers - extract the first part (e.g., "2" from "2A.1" or "2A" from "2A.1")
    const match = String(c.clause_number).match(/^([A-Za-z0-9]+)/);
    return match ? match[1] : 'Other';
  }))).sort((a: string, b: string) => {
    // Enhanced sorting: try numeric first, then alphanumeric
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    if (!isNaN(numA) && isNaN(numB)) return -1; // numbers before letters
    if (isNaN(numA) && !isNaN(numB)) return 1; // numbers before letters
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  const toggleType = (type: ConditionType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const scrollToClause = (no: string) => {
    if (!no) return;
    const el = document.getElementById(`clause-${no}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDragStart = (index: number) => {
    if (!isEditMode) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!isEditMode || draggedIndex === null) return;
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (onReorder && draggedIndex !== null && draggedIndex !== targetIndex) {
      onReorder(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const keywords = ["Time", "Payment", "Insurance", "Liability", "Termination", "Variation", "Dispute"];

  return (
    <aside className="w-80 flex-shrink-0 space-y-8 bg-white border-r border-aaa-border h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto hidden lg:block p-6 custom-scrollbar">
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em] border-b border-aaa-border pb-2">Filter Source</h4>
        <div className="space-y-2">
          {(['General', 'Particular'] as ConditionType[]).map(type => (
            <label key={type} className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={selectedTypes.includes(type)}
                onChange={() => toggleType(type)}
                className="w-4 h-4 rounded border-aaa-border text-aaa-blue focus:ring-aaa-blue"
              />
              <span className="text-sm font-semibold text-aaa-muted group-hover:text-aaa-blue transition-colors">{type} Condition</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em] border-b border-aaa-border pb-2">Chapters</h4>
        <div className="grid grid-cols-4 gap-2">
          <button 
            onClick={() => setSelectedGroup(null)}
            className={`px-1 py-2 text-[10px] font-bold rounded-[8px] border transition-all ${!selectedGroup ? 'bg-aaa-blue text-white border-aaa-blue shadow-sm' : 'bg-white border-aaa-border text-aaa-muted hover:border-aaa-blue'}`}
          >
            ALL
          </button>
          {groups.map(g => (
            <button 
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`px-1 py-2 text-[10px] font-bold rounded-[8px] border transition-all ${selectedGroup === g ? 'bg-aaa-blue text-white border-aaa-blue shadow-sm' : 'bg-white border-aaa-border text-aaa-muted hover:border-aaa-blue'}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-aaa-border pb-2">
          <h4 className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em]">Search Clauses</h4>
          {searchQuery && (
            <span className="text-[9px] font-bold text-aaa-blue bg-aaa-blue/10 px-2 py-0.5 rounded-full">
              {clauses.filter(c => {
                const keywords = searchQuery.trim().split(/\s+/).filter(k => k.length > 0);
                if (keywords.length === 0) return true;
                const searchableText = [
                  c.clause_number,
                  c.clause_title,
                  c.clause_text,
                  c.general_condition || '',
                  c.particular_condition || ''
                ].join(' ').toLowerCase();
                return keywords.every(keyword => searchableText.includes(keyword.toLowerCase()));
              }).length} found
            </span>
          )}
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-aaa-muted">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by keywords..."
            className="w-full pl-10 pr-10 py-2.5 bg-aaa-bg border border-aaa-border rounded-xl text-sm font-medium text-aaa-text placeholder-aaa-muted focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-aaa-muted hover:text-aaa-blue transition-colors rounded-full hover:bg-aaa-bg"
              title="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="text-[9px] text-aaa-muted font-medium leading-relaxed">
          💡 <strong>Tip:</strong> Use multiple keywords separated by spaces (e.g., "payment insurance")
        </div>
        <div className="space-y-2">
          <h5 className="text-[9px] font-black text-aaa-muted uppercase tracking-wider">Quick Filters</h5>
          <div className="flex flex-wrap gap-2">
            {keywords.map(kw => (
              <button 
                key={kw}
                onClick={() => setSearchQuery(kw)}
                className={`px-3 py-1.5 text-[9px] font-black rounded-full border uppercase tracking-wider transition-all ${searchQuery === kw ? 'bg-aaa-blue text-white border-aaa-blue shadow-sm' : 'bg-white border-aaa-border text-aaa-muted hover:text-aaa-blue hover:border-aaa-blue shadow-sm'}`}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-aaa-border pb-2">
          <h4 className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em]">Clause Ledger</h4>
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`text-[9px] font-black px-2 py-0.5 rounded border transition-all uppercase tracking-tighter ${isEditMode ? 'bg-aaa-blue text-white border-aaa-blue' : 'bg-aaa-bg text-aaa-muted border-aaa-border hover:text-aaa-blue'}`}
          >
            {isEditMode ? 'Done' : 'Order'}
          </button>
        </div>
        <div className="space-y-1">
          {(clauses || []).map((c, i) => (
            <div 
              key={`${c.condition_type}-${c.clause_number}-${i}`}
              draggable={isEditMode}
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              className={`flex items-center group/ledger transition-all duration-300 stagger-item ${
                draggedIndex === i ? 'opacity-30' : ''
              } ${
                dragOverIndex === i ? 'border-t-2 border-aaa-blue bg-aaa-bg/50' : 'border-t border-transparent'
              }`}
            >
              {isEditMode && (
                <div className="px-2 cursor-grab active:cursor-grabbing text-aaa-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              )}
              
              <button 
                onClick={() => scrollToClause(c.clause_number)}
                className={`flex-1 text-left px-3 py-2 text-[11px] font-bold text-aaa-muted hover:bg-aaa-bg hover:text-aaa-blue transition-all truncate border border-transparent hover:border-aaa-blue/10 ${
                  isEditMode ? 'rounded-none' : 'rounded-aaa'
                }`}
                title={c.clause_title}
              >
                <span className="text-aaa-blue mr-2 font-black">{c.clause_number}</span> {c.clause_title || 'Untitled'}
              </button>
              
              {isEditMode && onDelete && (
                <button 
                  onClick={() => onDelete(i)}
                  className="p-2 hover:bg-red-500 hover:text-white text-red-400 transition-colors"
                  title="Delete Clause Node"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
