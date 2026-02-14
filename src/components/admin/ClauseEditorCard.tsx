import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EditorClause, EditorCategory } from '@/services/adminEditorService';
import { useDebouncedSave, SaveStatus } from '@/hooks/useDebouncedSave';
import { normalizeClauseId } from '@/utils/navigation';
import { TokenizedTextRenderer } from './TokenizedTextRenderer';

interface ClauseEditorCardProps {
  clause: EditorClause;
  categories: EditorCategory[];
  onUpdateText: (itemId: string, field: string, value: string) => Promise<boolean>;
  onAssignCategory: (itemId: string, categoryId: string) => Promise<boolean>;
  onRemoveFromCategory: (itemId: string) => Promise<boolean>;
  onDelete: (itemId: string) => Promise<boolean>;
}

/**
 * ClauseEditorCard Component
 * Individual clause editor with inline editing and category assignment
 */
export const ClauseEditorCard: React.FC<ClauseEditorCardProps> = ({
  clause,
  categories,
  onUpdateText,
  onAssignCategory,
  onRemoveFromCategory,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState({
    clause_number: clause.item_data.clause_number || '',
    clause_title: clause.item_data.clause_title || '',
    clause_text: clause.item_data.clause_text || '',
    general_condition: clause.item_data.general_condition || '',
    particular_condition: clause.item_data.particular_condition || ''
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update local values when clause changes
  useEffect(() => {
    setLocalValues({
      clause_number: clause.item_data.clause_number || '',
      clause_title: clause.item_data.clause_title || '',
      clause_text: clause.item_data.clause_text || '',
      general_condition: clause.item_data.general_condition || '',
      particular_condition: clause.item_data.particular_condition || ''
    });
  }, [clause]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced save for text fields
  const saveText = useCallback(async (data: { field: string; value: string }) => {
    await onUpdateText(clause.id, data.field, data.value);
  }, [clause.id, onUpdateText]);

  const { debouncedSave, status: saveStatus } = useDebouncedSave(saveText, { delay: 800 });

  const handleTextChange = (field: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [field]: value }));
    debouncedSave({ field, value });
  };

  const handleCategorySelect = async (categoryId: string) => {
    await onAssignCategory(clause.id, categoryId);
    setShowCategoryDropdown(false);
  };

  const handleRemoveCategory = async () => {
    await onRemoveFromCategory(clause.id);
    setShowCategoryDropdown(false);
  };

  const handleDelete = async () => {
    if (confirm(`Delete clause "${localValues.clause_number}"?\n\nThis action cannot be undone.`)) {
      await onDelete(clause.id);
    }
  };

  const currentCategory = categories.find(c => c.id === clause.category_id);
  const hasGC = !!localValues.general_condition;
  const hasPC = !!localValues.particular_condition;

  // Determine clause status
  const getClauseStatus = () => {
    if (hasPC && !hasGC) return { label: 'Added', color: 'bg-emerald-500' };
    if (hasPC && hasGC) return { label: 'Modified', color: 'bg-amber-500' };
    return { label: 'GC Only', color: 'bg-slate-400' };
  };

  const status = getClauseStatus();

  return (
    <div
      id={`clause-${normalizeClauseId(localValues.clause_number)}`}
      data-clause-number={localValues.clause_number}
      className={`
      bg-white border border-aaa-border rounded-xl overflow-hidden
      transition-all duration-200
      ${isExpanded ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}
      scroll-mt-24
    `}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Icon */}
        <button className="flex-shrink-0 text-aaa-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Clause Number */}
        <div className="flex-shrink-0">
          <span className="px-2 py-1 bg-aaa-blue text-white text-xs font-bold rounded">
            {localValues.clause_number || 'N/A'}
          </span>
        </div>

        {/* Clause Title */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-aaa-text truncate">
            {localValues.clause_title || 'Untitled Clause'}
          </p>
        </div>

        {/* Status Badge */}
        <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold text-white rounded-full ${status.color}`}>
          {status.label}
        </span>

        {/* Category Badge */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCategoryDropdown(!showCategoryDropdown);
            }}
            className={`
              px-2 py-1 text-xs font-medium rounded-lg border transition-colors
              ${currentCategory
                ? 'bg-aaa-blue/10 text-aaa-blue border-aaa-blue/20 hover:bg-aaa-blue/20'
                : 'bg-slate-100 text-aaa-muted border-slate-200 hover:bg-slate-200'
              }
            `}
          >
            {currentCategory ? currentCategory.name : 'No Category'}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Category Dropdown */}
          {showCategoryDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-aaa-border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                {currentCategory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCategory();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors border-b border-aaa-border"
                  >
                    Remove from category
                  </button>
                )}
                {categories.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-aaa-muted">No categories available</div>
                ) : (
                  categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategorySelect(cat.id);
                      }}
                      className={`
                        w-full px-3 py-2 text-left text-sm transition-colors
                        ${cat.id === clause.category_id
                          ? 'bg-aaa-blue/10 text-aaa-blue'
                          : 'text-aaa-text hover:bg-slate-50'
                        }
                      `}
                    >
                      {cat.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save Status */}
        <div className="flex-shrink-0 w-16 text-right">
          {saveStatus === 'saving' && (
            <span className="text-[10px] text-aaa-muted">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[10px] text-emerald-600">Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-[10px] text-red-600">Error</span>
          )}
        </div>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="flex-shrink-0 p-1.5 text-aaa-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete clause"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Expanded Content */}
      {
        isExpanded && (
          <div className="border-t border-aaa-border p-4 space-y-4">
            {/* View/Edit Toggle */}
            <div className="flex justify-end mb-2">
              <div className="bg-slate-100 p-1 rounded-lg inline-flex">
                <button
                  onClick={() => setViewMode('view')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'view'
                    ? 'bg-white text-aaa-blue shadow-sm'
                    : 'text-aaa-muted hover:text-aaa-text'
                    }`}
                >
                  View
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'edit'
                    ? 'bg-white text-aaa-blue shadow-sm'
                    : 'text-aaa-muted hover:text-aaa-text'
                    }`}
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Clause Number & Title Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-aaa-muted uppercase tracking-wider mb-1">
                  Clause Number
                </label>
                {viewMode === 'view' ? (
                  <div className="px-3 py-2 text-sm border border-transparent font-medium">
                    {localValues.clause_number}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={localValues.clause_number}
                    onChange={(e) => handleTextChange('clause_number', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-aaa-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue"
                  />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-aaa-muted uppercase tracking-wider mb-1">
                  Clause Title
                </label>
                {viewMode === 'view' ? (
                  <div className="px-3 py-2 text-sm border border-transparent font-medium">
                    {localValues.clause_title}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={localValues.clause_title}
                    onChange={(e) => handleTextChange('clause_title', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-aaa-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue"
                  />
                )}
              </div>
            </div>

            {/* General Condition */}
            <div>
              <label className="block text-[10px] font-bold text-aaa-muted uppercase tracking-wider mb-1">
                General Condition
                {hasGC && <span className="ml-2 text-emerald-600">({localValues.general_condition.length} chars)</span>}
              </label>
              {viewMode === 'view' ? (
                <div
                  className="w-full px-3 py-2 text-sm border border-transparent bg-slate-50 rounded-lg font-mono whitespace-pre-wrap leading-relaxed"
                  onClick={() => setViewMode('edit')}
                  title="Click to edit"
                >
                  <TokenizedTextRenderer
                    tokens={(clause as any).gc_link_tokens}
                    rawText={localValues.general_condition}
                    className=""
                    onClick={() => setViewMode('edit')}
                  />
                </div>
              ) : (
                <textarea
                  value={localValues.general_condition}
                  onChange={(e) => handleTextChange('general_condition', e.target.value)}
                  placeholder="Enter general condition text..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-aaa-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue resize-y font-mono"
                />
              )}
            </div>

            {/* Particular Condition */}
            <div>
              <label className="block text-[10px] font-bold text-aaa-muted uppercase tracking-wider mb-1">
                Particular Condition
                {hasPC && <span className="ml-2 text-amber-600">({localValues.particular_condition.length} chars)</span>}
              </label>
              {viewMode === 'view' ? (
                <div
                  className="w-full px-3 py-2 text-sm border border-transparent bg-amber-50 rounded-lg font-mono whitespace-pre-wrap leading-relaxed"
                  onClick={() => setViewMode('edit')}
                  title="Click to edit"
                >
                  <TokenizedTextRenderer
                    tokens={(clause as any).pc_link_tokens}
                    rawText={localValues.particular_condition}
                    className=""
                    onClick={() => setViewMode('edit')}
                  />
                </div>
              ) : (
                <textarea
                  value={localValues.particular_condition}
                  onChange={(e) => handleTextChange('particular_condition', e.target.value)}
                  placeholder="Enter particular condition text..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-aaa-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue resize-y font-mono"
                />
              )}
            </div>

            {/* Metadata */}
            <div className="pt-2 border-t border-aaa-border">
              <div className="flex items-center justify-between text-xs text-aaa-muted">
                <span>Section: {clause.section_type}</span>
                <span>Order: {clause.order_index}</span>
                <span>ID: {clause.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default ClauseEditorCard;
