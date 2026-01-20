
import React, { useState, useEffect } from 'react';
import { Clause, ConditionType } from '../types';
import { CategoryManager } from './CategoryManager';

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
  onClausesUpdate?: (updatedClauses: Clause[]) => void;
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
  onDelete,
  onClausesUpdate
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isGroupedView, setIsGroupedView] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [autoAssignTrigger, setAutoAssignTrigger] = useState<{ clauseNumbers: string[] } | null>(null);

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

  // Normalize clause ID for consistent matching
  const normalizeClauseId = (clauseNumber: string): string => {
    if (!clauseNumber) return '';
    return clauseNumber
      .replace(/\s+/g, '')  // Remove all spaces
      .replace(/[()]/g, ''); // Remove parentheses
  };

  const scrollToClause = (no: string) => {
    if (!no) return;
    const normalizedId = normalizeClauseId(no);
    const el = document.getElementById(`clause-${normalizedId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the target clause briefly
      el.style.transition = 'box-shadow 0.3s ease';
      el.style.boxShadow = '0 0 0 4px rgba(15, 46, 107, 0.3)';
      setTimeout(() => {
        el.style.boxShadow = '';
      }, 2000);
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

  const toggleCategoryCollapse = (categoryName: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryName)) {
      newCollapsed.delete(categoryName);
    } else {
      newCollapsed.add(categoryName);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Group clauses by category
  const groupedClauses = (() => {
    const groups = new Map<string, Clause[]>();
    const unassigned: Clause[] = [];

    clauses.forEach(clause => {
      if (clause.category) {
        if (!groups.has(clause.category)) {
          groups.set(clause.category, []);
        }
        groups.get(clause.category)!.push(clause);
      } else {
        unassigned.push(clause);
      }
    });

    return { groups, unassigned };
  })();

  // Initialize category order from clauses if not set
  useEffect(() => {
    const currentCategories = Array.from(groupedClauses.groups.keys());
    if (categoryOrder.length === 0 && currentCategories.length > 0) {
      setCategoryOrder(currentCategories);
    } else if (currentCategories.length > 0) {
      // Update order to include any new categories
      const newCategories = currentCategories.filter(cat => !categoryOrder.includes(cat));
      if (newCategories.length > 0) {
        setCategoryOrder([...categoryOrder, ...newCategories]);
      }
    }
  }, [clauses.length, groupedClauses.groups.size]);

  // Get ordered categories
  const getOrderedCategories = (): [string, Clause[]][] => {
    const allCategories = Array.from(groupedClauses.groups.entries());
    if (categoryOrder.length === 0) {
      return allCategories.sort((a, b) => a[0].localeCompare(b[0]));
    }

    // Sort by custom order, then add any new categories at the end
    const ordered: [string, Clause[]][] = [];
    const used = new Set<string>();

    categoryOrder.forEach(catName => {
      const found = allCategories.find(([name]) => name === catName);
      if (found) {
        ordered.push(found);
        used.add(catName);
      }
    });

    // Add any categories not in the order list
    allCategories.forEach(([name, clauses]) => {
      if (!used.has(name)) {
        ordered.push([name, clauses]);
      }
    });

    return ordered;
  };

  const handleCategoryDragStart = (categoryName: string) => {
    if (!isEditMode) return;
    setDraggedCategory(categoryName);
  };

  const handleCategoryDragOver = (e: React.DragEvent, categoryName: string) => {
    e.preventDefault();
    if (!isEditMode || draggedCategory === null || draggedCategory === categoryName) return;
    setDragOverCategory(categoryName);
  };

  const handleCategoryDrop = (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory === targetCategory) return;

    const newOrder = [...categoryOrder];
    const draggedIndex = newOrder.indexOf(draggedCategory);
    const targetIndex = newOrder.indexOf(targetCategory);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedCategory);
      setCategoryOrder(newOrder);
    }

    setDraggedCategory(null);
    setDragOverCategory(null);
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategory(null);
    setDragOverCategory(null);
  };

  const keywords = ["Time", "Payment", "Insurance", "Liability", "Termination", "Variation", "Dispute"];

  return (
    <aside className="w-80 flex-shrink-0 space-y-8 bg-white border-r border-aaa-border h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-y-auto hidden lg:block p-6 custom-scrollbar z-40 animate-slide-left">
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
          <div className="flex gap-2">
            <button
              onClick={() => setIsGroupedView(!isGroupedView)}
              className={`text-[9px] font-black px-2 py-0.5 rounded border transition-all uppercase tracking-tighter ${isGroupedView ? 'bg-aaa-blue text-white border-aaa-blue' : 'bg-aaa-bg text-aaa-muted border-aaa-border hover:text-aaa-blue'}`}
              title={isGroupedView ? 'Switch to flat view' : 'Switch to grouped view'}
            >
              {isGroupedView ? 'Grouped' : 'Flat'}
            </button>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`text-[9px] font-black px-2 py-0.5 rounded border transition-all uppercase tracking-tighter ${isEditMode ? 'bg-aaa-blue text-white border-aaa-blue' : 'bg-aaa-bg text-aaa-muted border-aaa-border hover:text-aaa-blue'}`}
            >
              {isEditMode ? 'Done' : 'Order'}
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {isGroupedView ? (
            /* Grouped View */
            <>
              {getOrderedCategories().map(([categoryName, categoryClauses]) => {
                const isCollapsed = collapsedCategories.has(categoryName);
                const isDragging = draggedCategory === categoryName;
                const isDragOver = dragOverCategory === categoryName;
                return (
                  <div
                    key={categoryName}
                    className="space-y-1"
                    draggable={isEditMode}
                    onDragStart={() => handleCategoryDragStart(categoryName)}
                    onDragOver={(e) => handleCategoryDragOver(e, categoryName)}
                    onDrop={(e) => handleCategoryDrop(e, categoryName)}
                    onDragEnd={handleCategoryDragEnd}
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategoryCollapse(categoryName)}
                      className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg transition-all group ${isDragging
                          ? 'opacity-30 bg-aaa-bg border-aaa-border'
                          : isDragOver
                            ? 'bg-aaa-blue/30 border-aaa-blue border-2'
                            : 'bg-aaa-blue/10 border-aaa-blue/20 hover:bg-aaa-blue/20'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {isEditMode && (
                          <div className="cursor-grab active:cursor-grabbing text-aaa-blue">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                          </div>
                        )}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`w-3 h-3 text-aaa-blue transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-[10px] font-black text-aaa-blue uppercase tracking-wider">{categoryName}</span>
                        <span className="text-[8px] font-bold text-aaa-blue/60 bg-white px-1.5 py-0.5 rounded">
                          {categoryClauses.length}
                        </span>
                      </div>
                    </button>
                    {/* Category Clauses */}
                    {!isCollapsed && categoryClauses.map((c, idx) => {
                      const originalIndex = clauses.findIndex(cl => cl.clause_number === c.clause_number && cl.condition_type === c.condition_type);
                      return (
                        <div
                          key={`${c.condition_type}-${c.clause_number}-${idx}`}
                          draggable={isEditMode}
                          onDragStart={() => handleDragStart(originalIndex)}
                          onDragOver={(e) => handleDragOver(e, originalIndex)}
                          onDrop={(e) => handleDrop(e, originalIndex)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center group/ledger transition-all duration-300 ml-4 ${draggedIndex === originalIndex ? 'opacity-30' : ''
                            } ${dragOverIndex === originalIndex ? 'border-t-2 border-aaa-blue bg-aaa-bg/50' : 'border-t border-transparent'
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
                            className={`flex-1 text-left px-3 py-2 text-[11px] font-bold text-aaa-muted hover:bg-aaa-bg hover:text-aaa-blue transition-all truncate border border-transparent hover:border-aaa-blue/10 ${isEditMode ? 'rounded-none' : 'rounded-aaa'
                              }`}
                            title={c.clause_title}
                          >
                            <span className="text-aaa-blue mr-2 font-black">{c.clause_number}</span> {c.clause_title || 'Untitled'}
                          </button>

                          {isEditMode && onDelete && (
                            <button
                              onClick={() => onDelete(originalIndex)}
                              className="p-2 hover:bg-red-500 hover:text-white text-red-400 transition-colors"
                              title="Delete Clause Node"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {/* Unassigned Clauses */}
              {groupedClauses.unassigned.length > 0 && (
                <div className="space-y-1 mt-3">
                  <div className="px-3 py-2 bg-aaa-bg border border-aaa-border rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-aaa-muted uppercase tracking-wider">Unassigned</span>
                      <span className="ml-2 text-[8px] font-bold text-aaa-muted bg-white px-1.5 py-0.5 rounded">
                        {groupedClauses.unassigned.length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const unassignedNumbers = groupedClauses.unassigned.map(c => c.clause_number);
                        setAutoAssignTrigger({ clauseNumbers: unassignedNumbers });
                      }}
                      className="px-2 py-1 bg-emerald-500 text-white rounded-lg text-[8px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-sm"
                      title="Auto-assign all unassigned clauses"
                    >
                      Auto-assign
                    </button>
                  </div>
                  {groupedClauses.unassigned.map((c, idx) => {
                    const originalIndex = clauses.findIndex(cl => cl.clause_number === c.clause_number && cl.condition_type === c.condition_type);
                    return (
                      <div
                        key={`${c.condition_type}-${c.clause_number}-${idx}`}
                        draggable={isEditMode}
                        onDragStart={() => handleDragStart(originalIndex)}
                        onDragOver={(e) => handleDragOver(e, originalIndex)}
                        onDrop={(e) => handleDrop(e, originalIndex)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center group/ledger transition-all duration-300 ml-4 ${draggedIndex === originalIndex ? 'opacity-30' : ''
                          } ${dragOverIndex === originalIndex ? 'border-t-2 border-aaa-blue bg-aaa-bg/50' : 'border-t border-transparent'
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
                          className={`flex-1 text-left px-3 py-2 text-[11px] font-bold text-aaa-muted hover:bg-aaa-bg hover:text-aaa-blue transition-all truncate border border-transparent hover:border-aaa-blue/10 ${isEditMode ? 'rounded-none' : 'rounded-aaa'
                            }`}
                          title={c.clause_title}
                        >
                          <span className="text-aaa-blue mr-2 font-black">{c.clause_number}</span> {c.clause_title || 'Untitled'}
                        </button>

                        {isEditMode && onDelete && (
                          <button
                            onClick={() => onDelete(originalIndex)}
                            className="p-2 hover:bg-red-500 hover:text-white text-red-400 transition-colors"
                            title="Delete Clause Node"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Flat View */
            (clauses || []).map((c, i) => (
              <div
                key={`${c.condition_type}-${c.clause_number}-${i}`}
                draggable={isEditMode}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                className={`flex items-center group/ledger transition-all duration-300 stagger-item ${draggedIndex === i ? 'opacity-30' : ''
                  } ${dragOverIndex === i ? 'border-t-2 border-aaa-blue bg-aaa-bg/50' : 'border-t border-transparent'
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
                  className={`flex-1 text-left px-3 py-2 text-[11px] font-bold text-aaa-muted hover:bg-aaa-bg hover:text-aaa-blue transition-all truncate border border-transparent hover:border-aaa-blue/10 ${isEditMode ? 'rounded-none' : 'rounded-aaa'
                    }`}
                  title={c.clause_title}
                >
                  <span className="text-aaa-blue mr-2 font-black">{c.clause_number}</span> {c.clause_title || 'Untitled'}
                  {c.category && (
                    <span className="ml-2 text-[8px] font-bold text-aaa-muted bg-white px-1.5 py-0.5 rounded border border-aaa-border">
                      {c.category}
                    </span>
                  )}
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
            ))
          )}
        </div>
      </div>

      {/* Category Manager Section */}
      {onClausesUpdate && (
        <div className="pt-6 border-t border-aaa-border">
          <CategoryManager
            clauses={clauses}
            onClausesUpdate={(updatedClauses) => {
              onClausesUpdate?.(updatedClauses);
              // Reset trigger after clauses are updated
              setAutoAssignTrigger(null);
            }}
            triggerAutoAssign={autoAssignTrigger}
          />
        </div>
      )}

    </aside>
  );
};
