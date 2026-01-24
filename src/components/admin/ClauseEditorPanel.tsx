import React, { useState, useMemo } from 'react';
import { EditorClause, EditorCategory } from '../../services/adminEditorService';
import { EditorLoadingState } from '../../hooks/useAdminEditor';
import ClauseEditorCard from './ClauseEditorCard';

interface ClauseEditorPanelProps {
  clauses: EditorClause[];
  categories: EditorCategory[];
  selectedCategoryId: string | null;
  loading: EditorLoadingState;
  onUpdateClauseText: (itemId: string, field: string, value: string) => Promise<boolean>;
  onAssignClauseToCategory: (itemId: string, categoryId: string) => Promise<boolean>;
  onRemoveClauseFromCategory: (itemId: string) => Promise<boolean>;
  onDeleteClause: (itemId: string) => Promise<boolean>;
  onAddClause?: () => void;
}

type SortMode = 'default' | 'number' | 'status';
type FilterMode = 'all' | 'added' | 'modified' | 'gc-only' | 'uncategorized';

/**
 * ClauseEditorPanel Component
 * Main panel for editing clauses with filtering and sorting
 */
export const ClauseEditorPanel: React.FC<ClauseEditorPanelProps> = ({
  clauses,
  categories,
  selectedCategoryId,
  loading,
  onUpdateClauseText,
  onAssignClauseToCategory,
  onRemoveClauseFromCategory,
  onDeleteClause,
  onAddClause
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Get clause status
  const getClauseStatus = (clause: EditorClause): 'added' | 'modified' | 'gc-only' => {
    const hasPC = clause.item_data.particular_condition && clause.item_data.particular_condition.length > 0;
    const hasGC = clause.item_data.general_condition && clause.item_data.general_condition.length > 0;
    if (hasPC && !hasGC) return 'added';
    if (hasPC && hasGC) return 'modified';
    return 'gc-only';
  };

  // Filter and sort clauses
  const filteredClauses = useMemo(() => {
    let result = [...clauses];

    // Filter by selected category
    if (selectedCategoryId) {
      result = result.filter(c => c.category_id === selectedCategoryId);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => {
        const searchableText = [
          c.item_data.clause_number,
          c.item_data.clause_title,
          c.item_data.clause_text,
          c.item_data.general_condition,
          c.item_data.particular_condition
        ].filter(Boolean).join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }

    // Filter by status
    if (filterMode !== 'all') {
      result = result.filter(c => {
        if (filterMode === 'uncategorized') {
          return !c.category_id;
        }
        return getClauseStatus(c) === filterMode;
      });
    }

    // Filter out deleted clauses
    result = result.filter(c => !c.item_data.is_deleted);

    // Sort
    if (sortMode === 'number') {
      result.sort((a, b) => {
        const numA = parseFloat(a.item_data.clause_number || '0') || 0;
        const numB = parseFloat(b.item_data.clause_number || '0') || 0;
        return numA - numB;
      });
    } else if (sortMode === 'status') {
      const statusOrder = { 'added': 0, 'modified': 1, 'gc-only': 2 };
      result.sort((a, b) => {
        return statusOrder[getClauseStatus(a)] - statusOrder[getClauseStatus(b)];
      });
    }

    return result;
  }, [clauses, selectedCategoryId, searchQuery, filterMode, sortMode]);

  // Calculate stats
  const stats = useMemo(() => {
    const categoryFiltered = selectedCategoryId
      ? clauses.filter(c => c.category_id === selectedCategoryId)
      : clauses;
    
    const nonDeleted = categoryFiltered.filter(c => !c.item_data.is_deleted);
    
    return {
      total: nonDeleted.length,
      added: nonDeleted.filter(c => getClauseStatus(c) === 'added').length,
      modified: nonDeleted.filter(c => getClauseStatus(c) === 'modified').length,
      gcOnly: nonDeleted.filter(c => getClauseStatus(c) === 'gc-only').length,
      uncategorized: nonDeleted.filter(c => !c.category_id).length
    };
  }, [clauses, selectedCategoryId]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-aaa-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-aaa-text">
              {selectedCategory ? selectedCategory.name : 'All Clauses'}
            </h2>
            <p className="text-sm text-aaa-muted">
              {filteredClauses.length} of {stats.total} clauses
            </p>
          </div>

          {/* Stats and Add Button */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs text-aaa-muted">{stats.added} Added</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-xs text-aaa-muted">{stats.modified} Modified</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span className="text-xs text-aaa-muted">{stats.gcOnly} GC Only</span>
            </div>
            
            {/* Add Clause Button */}
            {onAddClause && (
              <button
                onClick={onAddClause}
                className="ml-2 flex items-center gap-2 px-4 py-2 bg-aaa-blue text-white text-sm font-bold rounded-lg hover:bg-aaa-hover transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Clause
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aaa-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clauses..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-aaa-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-aaa-muted hover:text-aaa-text"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter Dropdown */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as FilterMode)}
            className="px-3 py-2 bg-white border border-aaa-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue"
          >
            <option value="all">All Statuses</option>
            <option value="added">Added Only</option>
            <option value="modified">Modified Only</option>
            <option value="gc-only">GC Only</option>
            <option value="uncategorized">Uncategorized</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="px-3 py-2 bg-white border border-aaa-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue"
          >
            <option value="default">Default Order</option>
            <option value="number">By Number</option>
            <option value="status">By Status</option>
          </select>
        </div>
      </div>

      {/* Clause List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading === 'loading' ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-aaa-blue border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-aaa-muted">Loading clauses...</p>
            </div>
          </div>
        ) : filteredClauses.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-aaa-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-aaa-text mb-1">No clauses found</h3>
              <p className="text-sm text-aaa-muted">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : selectedCategoryId
                  ? 'This category has no clauses yet'
                  : 'Select a contract to view clauses'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClauses.map((clause) => (
              <ClauseEditorCard
                key={clause.id}
                clause={clause}
                categories={categories}
                onUpdateText={onUpdateClauseText}
                onAssignCategory={onAssignClauseToCategory}
                onRemoveFromCategory={onRemoveClauseFromCategory}
                onDelete={onDeleteClause}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredClauses.length > 0 && (
        <div className="bg-white border-t border-aaa-border px-4 py-2">
          <p className="text-xs text-aaa-muted text-center">
            Showing {filteredClauses.length} clause{filteredClauses.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ClauseEditorPanel;
