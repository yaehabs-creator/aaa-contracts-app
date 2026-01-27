
import React, { useState, useEffect, useMemo } from 'react';
import { Clause, ConditionType } from '../types';
import { CategoryManager } from './CategoryManager';
import { scrollToClause, normalizeClauseId } from '../src/utils/navigation';

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

// Helper: Check if clause matches search query
const clauseMatchesSearch = (clause: Clause, query: string): boolean => {
  if (!query.trim()) return false;
  const keywords = query.trim().split(/\s+/).filter(k => k.length > 0);
  if (keywords.length === 0) return false;
  const searchableText = [
    clause.clause_number,
    clause.clause_title,
    clause.clause_text,
    clause.general_condition || '',
    clause.particular_condition || ''
  ].join(' ').toLowerCase();
  return keywords.every(keyword => searchableText.includes(keyword.toLowerCase()));
};

// Helper: Get clause status (added, modified, gc-only)
// Works for both dual-source contracts (with GC/PC fields) and single-source contracts (condition_type only)
const getClauseStatus = (clause: Clause): 'added' | 'modified' | 'gc-only' => {
  const hasPC = clause.particular_condition && clause.particular_condition.length > 0;
  const hasGC = clause.general_condition && clause.general_condition.length > 0;
  
  // For dual-source contracts (have both GC and PC fields populated)
  if (hasPC && !hasGC) return 'added';
  if (hasPC && hasGC) return 'modified';
  if (hasGC) return 'gc-only';
  
  // Fallback for single-source contracts (only condition_type is set)
  // These contracts don't have separate GC/PC fields, just clause_text with condition_type
  if (clause.condition_type === 'Particular') return 'added';
  return 'gc-only';
};

// Status Badge Component
const ClauseStatusBadge: React.FC<{ clause: Clause }> = ({ clause }) => {
  const status = getClauseStatus(clause);
  
  if (status === 'added') {
    return (
      <span 
        className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" 
        title="Added (PC only)"
      />
    );
  }
  if (status === 'modified') {
    return (
      <span 
        className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" 
        title="Modified (GC + PC)"
      />
    );
  }
  return null;
};

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
  const [groupingMode, setGroupingMode] = useState<'category' | 'chapter'>('chapter');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [autoAssignTrigger, setAutoAssignTrigger] = useState<{ clauseNumbers: string[] } | null>(null);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = clauses.length;
    const added = clauses.filter(c => getClauseStatus(c) === 'added').length;
    const modified = clauses.filter(c => getClauseStatus(c) === 'modified').length;
    const gcOnly = total - added - modified;
    const pcCoverage = total > 0 ? Math.round(((added + modified) / total) * 100) : 0;
    return { total, added, modified, gcOnly, pcCoverage };
  }, [clauses]);

  // Group clauses by chapter number
  const chapterGroups = useMemo(() => {
    const groups = new Map<string, Clause[]>();
    clauses.forEach(c => {
      // Extract main chapter: "6A.2" -> "6", "22A.3" -> "22"
      const match = c.clause_number.match(/^(\d+)/);
      const chapter = match ? match[1] : 'Other';
      if (!groups.has(chapter)) groups.set(chapter, []);
      groups.get(chapter)!.push(c);
    });
    // Sort chapters numerically
    const sortedEntries = Array.from(groups.entries()).sort((a, b) => {
      const numA = parseInt(a[0]);
      const numB = parseInt(b[0]);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a[0].localeCompare(b[0]);
    });
    return new Map(sortedEntries);
  }, [clauses]);

  // Toggle chapter collapse
  const toggleChapterCollapse = (chapter: string) => {
    const newCollapsed = new Set(collapsedChapters);
    if (newCollapsed.has(chapter)) {
      newCollapsed.delete(chapter);
    } else {
      newCollapsed.add(chapter);
    }
    setCollapsedChapters(newCollapsed);
  };

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
    <aside className="w-80 flex-shrink-0 space-y-6 bg-white/80 backdrop-blur-xl border-r border-surface-border h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-y-auto hidden lg:block p-6 custom-scrollbar z-40 animate-slide-left">
      {/* Statistics Panel - MacBook style */}
      <div className="space-y-4 p-5 bg-surface-bg rounded-mac border border-surface-border shadow-mac-sm">
        <h4 className="text-[10px] font-semibold text-mac-navy uppercase tracking-wider">Statistics</h4>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-3 bg-white rounded-mac-sm border border-surface-border shadow-mac-sm">
            <div className="text-xl font-bold text-mac-blue">{stats.total}</div>
            <div className="text-[9px] font-medium text-mac-muted mt-1">Total</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-mac-sm border border-emerald-100">
            <div className="text-xl font-bold text-emerald-600">{stats.added}</div>
            <div className="text-[9px] font-medium text-emerald-600 mt-1">Added</div>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-mac-sm border border-amber-100">
            <div className="text-xl font-bold text-amber-600">{stats.modified}</div>
            <div className="text-[9px] font-medium text-amber-600 mt-1">Modified</div>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-mac-sm border border-slate-200">
            <div className="text-xl font-bold text-mac-muted">{stats.gcOnly}</div>
            <div className="text-[9px] font-medium text-mac-muted mt-1">GC Only</div>
          </div>
        </div>
        {/* Progress Bar - MacBook style */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-mac-muted">PC Coverage</span>
            <span className="text-xs font-semibold text-mac-blue">{stats.pcCoverage}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-mac-blue to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.pcCoverage}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-[10px] text-mac-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Added
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Modified
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-semibold text-mac-navy uppercase tracking-wider border-b border-surface-border pb-2">Filter Source</h4>
        <div className="space-y-3">
          {(['General', 'Particular'] as ConditionType[]).map(type => (
            <label key={type} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedTypes.includes(type)}
                onChange={() => toggleType(type)}
                className="w-4 h-4 rounded-md border-surface-border text-mac-blue focus:ring-mac-blue/20 focus:ring-offset-0 transition-all"
              />
              <span className="text-sm font-medium text-mac-charcoal group-hover:text-mac-blue transition-colors">{type} Condition</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-semibold text-mac-navy uppercase tracking-wider border-b border-surface-border pb-2">Chapters</h4>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setSelectedGroup(null)}
            className={`px-2 py-2.5 text-[10px] font-semibold rounded-mac-xs border transition-all ${!selectedGroup ? 'bg-mac-blue text-white border-mac-blue shadow-sm' : 'bg-white border-surface-border text-mac-muted hover:border-mac-blue hover:text-mac-blue'}`}
          >
            ALL
          </button>
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`px-2 py-2.5 text-[10px] font-semibold rounded-mac-xs border transition-all ${selectedGroup === g ? 'bg-mac-blue text-white border-mac-blue shadow-sm' : 'bg-white border-surface-border text-mac-muted hover:border-mac-blue hover:text-mac-blue'}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-2">
          <h4 className="text-[10px] font-semibold text-mac-navy uppercase tracking-wider">Search Clauses</h4>
          {searchQuery && (
            <span className="text-[9px] font-medium text-mac-blue bg-mac-blue-subtle px-2.5 py-1 rounded-full">
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
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mac-muted">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by keywords..."
            className="w-full pl-10 pr-10 py-3 bg-white border border-surface-border rounded-mac-sm text-sm font-medium text-mac-navy placeholder-mac-muted-light focus:ring-0 focus:border-mac-blue focus:shadow-mac-focus outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-mac-muted hover:text-mac-blue transition-all rounded-md hover:bg-surface-bg"
              title="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-[10px] text-mac-muted leading-relaxed">
          Use multiple keywords separated by spaces
        </p>
        <div className="space-y-2">
          <h5 className="text-[9px] font-medium text-mac-muted uppercase tracking-wider">Quick Filters</h5>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map(kw => (
              <button
                key={kw}
                onClick={() => setSearchQuery(kw)}
                className={`px-3 py-1.5 text-[10px] font-medium rounded-full border transition-all ${searchQuery === kw ? 'bg-mac-blue text-white border-mac-blue' : 'bg-white border-surface-border text-mac-muted hover:text-mac-blue hover:border-mac-blue'}`}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border pb-2">
          <h4 className="text-[10px] font-semibold text-mac-navy uppercase tracking-wider">Clause Ledger</h4>
          <div className="flex gap-1">
            {isGroupedView && (
              <button
                onClick={() => setGroupingMode(groupingMode === 'chapter' ? 'category' : 'chapter')}
                className={`text-[9px] font-medium px-2.5 py-1 rounded-md border transition-all bg-white text-mac-muted border-surface-border hover:text-mac-blue hover:border-mac-blue`}
                title={groupingMode === 'chapter' ? 'Switch to category grouping' : 'Switch to chapter grouping'}
              >
                {groupingMode === 'chapter' ? 'Ch.' : 'Cat.'}
              </button>
            )}
            <button
              onClick={() => setIsGroupedView(!isGroupedView)}
              className={`text-[9px] font-medium px-2.5 py-1 rounded-md border transition-all ${isGroupedView ? 'bg-mac-blue text-white border-mac-blue' : 'bg-white text-mac-muted border-surface-border hover:text-mac-blue hover:border-mac-blue'}`}
              title={isGroupedView ? 'Switch to flat view' : 'Switch to grouped view'}
            >
              {isGroupedView ? 'Grp' : 'Flat'}
            </button>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`text-[9px] font-medium px-2.5 py-1 rounded-md border transition-all ${isEditMode ? 'bg-mac-blue text-white border-mac-blue' : 'bg-white text-mac-muted border-surface-border hover:text-mac-blue hover:border-mac-blue'}`}
            >
              {isEditMode ? 'Done' : 'Edit'}
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {isGroupedView ? (
            groupingMode === 'chapter' ? (
              /* Chapter-Based Grouping */
              <>
                {Array.from(chapterGroups.entries()).map(([chapter, chapterClauses]) => {
                  const isCollapsed = collapsedChapters.has(chapter);
                  const addedCount = chapterClauses.filter(c => getClauseStatus(c) === 'added').length;
                  const modifiedCount = chapterClauses.filter(c => getClauseStatus(c) === 'modified').length;
                  return (
                    <div key={chapter} className="space-y-1">
                      {/* Chapter Header - MacBook style */}
                      <button
                        onClick={() => toggleChapterCollapse(chapter)}
                        className="w-full flex items-center justify-between px-3 py-2.5 border rounded-mac-xs transition-all bg-surface-bg border-surface-border hover:bg-surface-bg-subtle hover:border-surface-border-hover"
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`w-3 h-3 text-mac-muted transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-[10px] font-semibold text-mac-navy">Chapter {chapter}</span>
                          <span className="text-[9px] font-medium text-mac-muted bg-white px-2 py-0.5 rounded-md border border-surface-border">
                            {chapterClauses.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {addedCount > 0 && (
                            <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              +{addedCount}
                            </span>
                          )}
                          {modifiedCount > 0 && (
                            <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                              ~{modifiedCount}
                            </span>
                          )}
                        </div>
                      </button>
                      {/* Chapter Clauses - MacBook style */}
                      {!isCollapsed && chapterClauses.map((c, idx) => {
                        const originalIndex = clauses.findIndex(cl => cl.clause_number === c.clause_number && cl.condition_type === c.condition_type);
                        const isSearchMatch = searchQuery && clauseMatchesSearch(c, searchQuery);
                        return (
                          <div
                            key={`${c.condition_type}-${c.clause_number}-${idx}`}
                            draggable={isEditMode}
                            onDragStart={() => handleDragStart(originalIndex)}
                            onDragOver={(e) => handleDragOver(e, originalIndex)}
                            onDrop={(e) => handleDrop(e, originalIndex)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center group/ledger transition-all duration-200 ml-4 ${draggedIndex === originalIndex ? 'opacity-30' : ''
                              } ${dragOverIndex === originalIndex ? 'border-t-2 border-mac-blue bg-mac-blue-subtle' : 'border-t border-transparent'
                              } ${isSearchMatch ? 'bg-amber-50 border-l-2 border-l-amber-400' : ''}`}
                          >
                            {isEditMode && (
                              <div className="px-2 cursor-grab active:cursor-grabbing text-mac-muted">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                              </div>
                            )}
                            <ClauseStatusBadge clause={c} />
                            <button
                              onClick={() => scrollToClause(c.clause_number)}
                              className={`flex-1 text-left px-3 py-2.5 text-[11px] font-medium text-mac-charcoal hover:bg-surface-bg hover:text-mac-blue transition-all truncate rounded-md ${isSearchMatch ? 'text-mac-blue font-semibold' : ''}`}
                              title={c.clause_title}
                            >
                              <span className="text-mac-blue mr-2 font-semibold">{c.clause_number}</span> {c.clause_title || 'Untitled'}
                            </button>
                            {isEditMode && onDelete && (
                              <button
                                onClick={() => onDelete(originalIndex)}
                                className="p-2 hover:bg-red-50 text-mac-muted hover:text-red-500 transition-all rounded-md"
                                title="Delete Clause"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            ) : (
              /* Category-Based Grouping - MacBook style */
              <>
                {getOrderedCategories().map(([categoryName, categoryClauses]) => {
                  const isCollapsed = collapsedCategories.has(categoryName);
                  const isDragging = draggedCategory === categoryName;
                  const isDragOver = dragOverCategory === categoryName;
                  const addedCount = categoryClauses.filter(c => getClauseStatus(c) === 'added').length;
                  const modifiedCount = categoryClauses.filter(c => getClauseStatus(c) === 'modified').length;
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
                      {/* Category Header - MacBook style */}
                      <button
                        onClick={() => toggleCategoryCollapse(categoryName)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-mac-xs transition-all group ${isDragging
                          ? 'opacity-30 bg-surface-bg border-surface-border'
                          : isDragOver
                            ? 'bg-mac-blue-light border-mac-blue border-2'
                            : 'bg-mac-blue-subtle border-mac-blue/10 hover:bg-mac-blue-light'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          {isEditMode && (
                            <div className="cursor-grab active:cursor-grabbing text-mac-blue">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </div>
                          )}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`w-3 h-3 text-mac-blue transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-[10px] font-semibold text-mac-blue">{categoryName}</span>
                          <span className="text-[9px] font-medium text-mac-blue/70 bg-white px-2 py-0.5 rounded-md border border-mac-blue/10">
                            {categoryClauses.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {addedCount > 0 && (
                            <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              +{addedCount}
                            </span>
                          )}
                          {modifiedCount > 0 && (
                            <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                              ~{modifiedCount}
                            </span>
                          )}
                        </div>
                      </button>
                      {/* Category Clauses - MacBook style */}
                      {!isCollapsed && categoryClauses.map((c, idx) => {
                        const originalIndex = clauses.findIndex(cl => cl.clause_number === c.clause_number && cl.condition_type === c.condition_type);
                        const isSearchMatch = searchQuery && clauseMatchesSearch(c, searchQuery);
                        return (
                          <div
                            key={`${c.condition_type}-${c.clause_number}-${idx}`}
                            draggable={isEditMode}
                            onDragStart={() => handleDragStart(originalIndex)}
                            onDragOver={(e) => handleDragOver(e, originalIndex)}
                            onDrop={(e) => handleDrop(e, originalIndex)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center group/ledger transition-all duration-200 ml-4 ${draggedIndex === originalIndex ? 'opacity-30' : ''
                              } ${dragOverIndex === originalIndex ? 'border-t-2 border-mac-blue bg-mac-blue-subtle' : 'border-t border-transparent'
                              } ${isSearchMatch ? 'bg-amber-50 border-l-2 border-l-amber-400' : ''}`}
                          >
                            {isEditMode && (
                              <div className="px-2 cursor-grab active:cursor-grabbing text-mac-muted">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                              </div>
                            )}
                            <ClauseStatusBadge clause={c} />
                            <button
                              onClick={() => scrollToClause(c.clause_number)}
                              className={`flex-1 text-left px-3 py-2.5 text-[11px] font-medium text-mac-charcoal hover:bg-surface-bg hover:text-mac-blue transition-all truncate rounded-md ${isSearchMatch ? 'text-mac-blue font-semibold' : ''}`}
                              title={c.clause_title}
                            >
                              <span className="text-mac-blue mr-2 font-semibold">{c.clause_number}</span> {c.clause_title || 'Untitled'}
                            </button>
                            {isEditMode && onDelete && (
                              <button
                                onClick={() => onDelete(originalIndex)}
                                className="p-2 hover:bg-red-50 text-mac-muted hover:text-red-500 transition-all rounded-md"
                                title="Delete Clause"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {/* Unassigned Clauses - MacBook style */}
                {groupedClauses.unassigned.length > 0 && (
                  <div className="space-y-1 mt-3">
                    <div className="px-3 py-2.5 bg-surface-bg border border-surface-border rounded-mac-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold text-mac-muted">Unassigned</span>
                        <span className="ml-2 text-[9px] font-medium text-mac-muted bg-white px-2 py-0.5 rounded-md border border-surface-border">
                          {groupedClauses.unassigned.length}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const unassignedNumbers = groupedClauses.unassigned.map(c => c.clause_number);
                          setAutoAssignTrigger({ clauseNumbers: unassignedNumbers });
                        }}
                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-md text-[9px] font-medium hover:bg-emerald-600 transition-all"
                        title="Auto-assign all unassigned clauses"
                      >
                        Auto-assign
                      </button>
                    </div>
                    {groupedClauses.unassigned.map((c, idx) => {
                      const originalIndex = clauses.findIndex(cl => cl.clause_number === c.clause_number && cl.condition_type === c.condition_type);
                      const isSearchMatch = searchQuery && clauseMatchesSearch(c, searchQuery);
                      return (
                        <div
                          key={`${c.condition_type}-${c.clause_number}-${idx}`}
                          draggable={isEditMode}
                          onDragStart={() => handleDragStart(originalIndex)}
                          onDragOver={(e) => handleDragOver(e, originalIndex)}
                          onDrop={(e) => handleDrop(e, originalIndex)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center group/ledger transition-all duration-200 ml-4 ${draggedIndex === originalIndex ? 'opacity-30' : ''
                            } ${dragOverIndex === originalIndex ? 'border-t-2 border-mac-blue bg-mac-blue-subtle' : 'border-t border-transparent'
                            } ${isSearchMatch ? 'bg-amber-50 border-l-2 border-l-amber-400' : ''}`}
                        >
                          {isEditMode && (
                            <div className="px-2 cursor-grab active:cursor-grabbing text-mac-muted">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </div>
                          )}
                          <ClauseStatusBadge clause={c} />
                          <button
                            onClick={() => scrollToClause(c.clause_number)}
                            className={`flex-1 text-left px-3 py-2.5 text-[11px] font-medium text-mac-charcoal hover:bg-surface-bg hover:text-mac-blue transition-all truncate rounded-md ${isSearchMatch ? 'text-mac-blue font-semibold' : ''}
                              } ${isSearchMatch ? 'text-aaa-blue font-black' : ''}`}
                            title={c.clause_title}
                          >
                            <span className="text-mac-blue mr-2 font-semibold">{c.clause_number}</span> {c.clause_title || 'Untitled'}
                          </button>
                          {isEditMode && onDelete && (
                            <button
                              onClick={() => onDelete(originalIndex)}
                              className="p-2 hover:bg-red-50 text-mac-muted hover:text-red-500 transition-all rounded-md"
                              title="Delete Clause"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )
          ) : (
            /* Flat View - MacBook style */
            (clauses || []).map((c, i) => {
              const isSearchMatch = searchQuery && clauseMatchesSearch(c, searchQuery);
              return (
                <div
                  key={`${c.condition_type}-${c.clause_number}-${i}`}
                  draggable={isEditMode}
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center group/ledger transition-all duration-200 stagger-item ${draggedIndex === i ? 'opacity-30' : ''
                    } ${dragOverIndex === i ? 'border-t-2 border-mac-blue bg-mac-blue-subtle' : 'border-t border-transparent'
                    } ${isSearchMatch ? 'bg-amber-50 border-l-2 border-l-amber-400' : ''}`}
                >
                  {isEditMode && (
                    <div className="px-2 cursor-grab active:cursor-grabbing text-mac-muted">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                  )}
                  <ClauseStatusBadge clause={c} />
                  <button
                    onClick={() => scrollToClause(c.clause_number)}
                    className={`flex-1 text-left px-3 py-2.5 text-[11px] font-medium text-mac-charcoal hover:bg-surface-bg hover:text-mac-blue transition-all truncate rounded-md ${isSearchMatch ? 'text-mac-blue font-semibold' : ''}`}
                    title={c.clause_title}
                  >
                    <span className="text-mac-blue mr-2 font-semibold">{c.clause_number}</span> {c.clause_title || 'Untitled'}
                    {c.category && (
                      <span className="ml-2 text-[9px] font-medium text-mac-muted bg-white px-2 py-0.5 rounded-md border border-surface-border">
                        {c.category}
                      </span>
                    )}
                  </button>
                  {isEditMode && onDelete && (
                    <button
                      onClick={() => onDelete(i)}
                      className="p-2 hover:bg-red-50 text-mac-muted hover:text-red-500 transition-all rounded-md"
                      title="Delete Clause"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Category Manager Section - MacBook style */}
      {onClausesUpdate && (
        <div className="pt-6 border-t border-surface-border">
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
