import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  useContractLedgerData, 
  scrollToClauseByNumber, 
  getClauseStatusFromItemData,
  LedgerCategory,
  LedgerClause 
} from '../src/hooks/useContractLedgerData';

interface CategoryLedgerProps {
  contractId: string | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

// Status Badge Component
const ClauseStatusBadge: React.FC<{ itemData: LedgerClause['item_data'] }> = ({ itemData }) => {
  const status = getClauseStatusFromItemData(itemData);
  
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
        className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" 
        title="Modified (GC + PC)"
      />
    );
  }
  return null;
};

// Category Accordion Item
const CategoryAccordion: React.FC<{
  category: LedgerCategory | null;
  clauses: LedgerClause[];
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery: string;
}> = ({ category, clauses, isExpanded, onToggle, searchQuery }) => {
  const categoryName = category?.name || 'Uncategorized';
  const categoryId = category?.id || 'uncategorized';
  
  // Calculate stats
  const stats = useMemo(() => {
    const added = clauses.filter(c => getClauseStatusFromItemData(c.item_data) === 'added').length;
    const modified = clauses.filter(c => getClauseStatusFromItemData(c.item_data) === 'modified').length;
    return { added, modified, total: clauses.length };
  }, [clauses]);

  // Filter clauses by search query
  const filteredClauses = useMemo(() => {
    if (!searchQuery.trim()) return clauses;
    
    const keywords = searchQuery.toLowerCase().split(/\s+/).filter(k => k.length > 0);
    return clauses.filter(clause => {
      const searchableText = [
        clause.item_data?.clause_number,
        clause.item_data?.clause_title,
        clause.item_data?.clause_text,
        clause.item_data?.general_condition,
        clause.item_data?.particular_condition
      ].filter(Boolean).join(' ').toLowerCase();
      
      return keywords.every(keyword => searchableText.includes(keyword));
    });
  }, [clauses, searchQuery]);

  const handleClauseClick = useCallback((clauseNumber: string) => {
    scrollToClauseByNumber(clauseNumber);
  }, []);

  // Don't render if no clauses match search
  if (searchQuery && filteredClauses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {/* Category Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-lg transition-all ${
          category 
            ? 'bg-aaa-blue/10 border-aaa-blue/20 hover:bg-aaa-blue/20' 
            : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-3 h-3 ${category ? 'text-aaa-blue' : 'text-slate-600'} transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className={`text-[10px] font-black uppercase tracking-wider ${category ? 'text-aaa-blue' : 'text-slate-600'}`}>
            {categoryName}
          </span>
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
            category ? 'text-aaa-blue/60 bg-white' : 'text-slate-500 bg-white'
          }`}>
            {searchQuery ? `${filteredClauses.length}/${stats.total}` : stats.total}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {stats.added > 0 && (
            <span className="text-[8px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
              +{stats.added}
            </span>
          )}
          {stats.modified > 0 && (
            <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
              ~{stats.modified}
            </span>
          )}
        </div>
      </button>

      {/* Clause List */}
      {isExpanded && (
        <div className="ml-2 space-y-0.5">
          {filteredClauses.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-aaa-muted italic">
              No clauses in this category
            </div>
          ) : (
            filteredClauses.map((clause) => {
              const clauseNo = clause.item_data?.clause_number || '—';
              const title = clause.item_data?.clause_title || 
                (clause.item_data?.clause_text?.substring(0, 40) + '...' || 'Untitled');
              const isSearchMatch = searchQuery && searchQuery.trim().length > 0;
              
              return (
                <button
                  key={clause.id}
                  onClick={() => handleClauseClick(clauseNo)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg transition-all
                    hover:bg-aaa-bg hover:text-aaa-blue border border-transparent hover:border-aaa-blue/10
                    ${isSearchMatch ? 'bg-yellow-50 border-l-2 border-l-yellow-400' : ''}
                  `}
                  title={clause.item_data?.clause_title || clause.item_data?.clause_text}
                >
                  <ClauseStatusBadge itemData={clause.item_data} />
                  <span className="text-aaa-blue font-black text-[11px] min-w-[40px]">
                    {clauseNo}
                  </span>
                  <span className={`text-[11px] font-medium text-aaa-muted truncate flex-1 ${
                    isSearchMatch ? 'text-aaa-blue font-bold' : ''
                  }`}>
                    {title}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

/**
 * CategoryLedger Component
 * Sidebar that shows clauses grouped by admin-defined categories
 * Clicking a clause scrolls to it on the same page
 */
export const CategoryLedger: React.FC<CategoryLedgerProps> = ({
  contractId,
  searchQuery: externalSearchQuery,
  onSearchChange
}) => {
  const { categories, clauses, groupedByCategoryId, loading, error, refresh } = useContractLedgerData(contractId);
  
  // Local search state (if not controlled externally)
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery ?? localSearchQuery;
  const setSearchQuery = onSearchChange ?? setLocalSearchQuery;
  
  // Track expanded categories - default first category expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Initialize first category as expanded
  useEffect(() => {
    if (categories.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set([categories[0].id]));
    }
  }, [categories]);

  // Calculate overall statistics
  const stats = useMemo(() => {
    const total = clauses.length;
    const added = clauses.filter(c => getClauseStatusFromItemData(c.item_data) === 'added').length;
    const modified = clauses.filter(c => getClauseStatusFromItemData(c.item_data) === 'modified').length;
    const gcOnly = total - added - modified;
    const pcCoverage = total > 0 ? Math.round(((added + modified) / total) * 100) : 0;
    return { total, added, modified, gcOnly, pcCoverage };
  }, [clauses]);

  // Filter clauses for search count
  const searchMatchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const keywords = searchQuery.toLowerCase().split(/\s+/).filter(k => k.length > 0);
    return clauses.filter(clause => {
      const searchableText = [
        clause.item_data?.clause_number,
        clause.item_data?.clause_title,
        clause.item_data?.clause_text,
        clause.item_data?.general_condition,
        clause.item_data?.particular_condition
      ].filter(Boolean).join(' ').toLowerCase();
      return keywords.every(keyword => searchableText.includes(keyword));
    }).length;
  }, [clauses, searchQuery]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Expand all when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allIds = new Set(categories.map(c => c.id));
      allIds.add('uncategorized');
      setExpandedCategories(allIds);
    }
  }, [searchQuery, categories]);

  const quickFilters = ["Time", "Payment", "Insurance", "Liability", "Termination", "Variation", "Dispute"];

  if (!contractId) {
    return (
      <aside className="w-80 flex-shrink-0 bg-white border-r border-aaa-border h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-y-auto hidden lg:block p-6 z-40">
        <div className="flex items-center justify-center h-full text-aaa-muted">
          <p className="text-sm">Select a contract to view clauses</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 flex-shrink-0 space-y-6 bg-white border-r border-aaa-border h-[calc(100vh-4rem)] fixed top-16 left-0 overflow-y-auto hidden lg:block p-6 custom-scrollbar z-40 animate-slide-left">
      {/* Statistics Panel */}
      <div className="space-y-3 p-4 bg-gradient-to-br from-slate-50 to-aaa-bg border border-aaa-border rounded-2xl">
        <div className="flex items-center justify-between">
          <h4 className="text-[9px] font-black text-aaa-blue uppercase tracking-[0.2em]">Ledger Statistics</h4>
          <button
            onClick={refresh}
            className="p-1 text-aaa-muted hover:text-aaa-blue transition-colors rounded"
            title="Refresh data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-white rounded-xl border border-aaa-border shadow-sm">
            <div className="text-lg font-black text-aaa-blue">{stats.total}</div>
            <div className="text-[8px] font-bold text-aaa-muted uppercase tracking-wider">Total</div>
          </div>
          <div className="text-center p-2 bg-white rounded-xl border border-emerald-200 shadow-sm">
            <div className="text-lg font-black text-emerald-600">{stats.added}</div>
            <div className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">Added</div>
          </div>
          <div className="text-center p-2 bg-white rounded-xl border border-blue-200 shadow-sm">
            <div className="text-lg font-black text-blue-600">{stats.modified}</div>
            <div className="text-[8px] font-bold text-blue-600 uppercase tracking-wider">Modified</div>
          </div>
          <div className="text-center p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-lg font-black text-slate-500">{stats.gcOnly}</div>
            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">GC Only</div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-aaa-muted">PC Coverage</span>
            <span className="text-[9px] font-black text-aaa-blue">{stats.pcCoverage}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${stats.pcCoverage}%` }}
            />
          </div>
          <div className="flex items-center gap-3 text-[8px] text-aaa-muted">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Added
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> Modified
            </span>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-aaa-border pb-2">
          <h4 className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em]">Search Clauses</h4>
          {searchQuery && (
            <span className="text-[9px] font-bold text-aaa-blue bg-aaa-blue/10 px-2 py-0.5 rounded-full">
              {searchMatchCount} found
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
        <div className="space-y-2">
          <h5 className="text-[9px] font-black text-aaa-muted uppercase tracking-wider">Quick Filters</h5>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map(kw => (
              <button
                key={kw}
                onClick={() => setSearchQuery(kw)}
                className={`px-3 py-1.5 text-[9px] font-black rounded-full border uppercase tracking-wider transition-all ${
                  searchQuery === kw 
                    ? 'bg-aaa-blue text-white border-aaa-blue shadow-sm' 
                    : 'bg-white border-aaa-border text-aaa-muted hover:text-aaa-blue hover:border-aaa-blue shadow-sm'
                }`}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-aaa-border pb-2">
          <h4 className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em]">Category Ledger</h4>
          <span className="text-[8px] font-bold text-aaa-muted bg-aaa-bg px-2 py-0.5 rounded">
            {categories.length} categories
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-aaa-blue border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
            <button
              onClick={refresh}
              className="mt-2 text-xs text-red-600 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <p className="text-xs text-aaa-muted mb-2">No categories defined yet</p>
            <p className="text-[10px] text-aaa-muted">
              Use the Admin Editor to create categories and assign clauses.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Render categories in order */}
            {categories.map((category) => (
              <CategoryAccordion
                key={category.id}
                category={category}
                clauses={groupedByCategoryId.get(category.id) || []}
                isExpanded={expandedCategories.has(category.id)}
                onToggle={() => toggleCategory(category.id)}
                searchQuery={searchQuery}
              />
            ))}

            {/* Uncategorized clauses */}
            {(groupedByCategoryId.get(null)?.length || 0) > 0 && (
              <CategoryAccordion
                key="uncategorized"
                category={null}
                clauses={groupedByCategoryId.get(null) || []}
                isExpanded={expandedCategories.has('uncategorized')}
                onToggle={() => toggleCategory('uncategorized')}
                searchQuery={searchQuery}
              />
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default CategoryLedger;
