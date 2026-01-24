import React, { useState } from 'react';
import { EditorCategory } from '../../services/adminEditorService';
import { EditorLoadingState } from '../../hooks/useAdminEditor';
import CategoryItem from './CategoryItem';

interface CategoryManagerPanelProps {
  categories: EditorCategory[];
  selectedCategoryId: string | null;
  loading: EditorLoadingState;
  onSelectCategory: (categoryId: string | null) => void;
  onCreateCategory: (name: string) => Promise<EditorCategory | null>;
  onRenameCategory: (categoryId: string, newName: string) => Promise<boolean>;
  onReorderCategories: (orderedIds: string[]) => Promise<boolean>;
  onDeleteCategory: (categoryId: string) => Promise<boolean>;
  onSyncCategories: () => Promise<void>;
}

/**
 * CategoryManagerPanel Component
 * Left panel for managing categories with drag-and-drop reordering
 */
export const CategoryManagerPanel: React.FC<CategoryManagerPanelProps> = ({
  categories,
  selectedCategoryId,
  loading,
  onSelectCategory,
  onCreateCategory,
  onRenameCategory,
  onReorderCategories,
  onDeleteCategory,
  onSyncCategories
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Handle create category
  const handleCreate = async () => {
    if (!newCategoryName.trim()) return;

    setIsSaving(true);
    const result = await onCreateCategory(newCategoryName.trim());
    setIsSaving(false);

    if (result) {
      setNewCategoryName('');
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      setNewCategoryName('');
      setIsCreating(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, categoryId: string) => {
    setDraggedId(categoryId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', categoryId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (categoryId !== draggedId) {
      setDragOverId(categoryId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || draggedId === targetId) return;

    // Calculate new order
    const currentOrder = categories.map(c => c.id);
    const draggedIndex = currentOrder.indexOf(draggedId);
    const targetIndex = currentOrder.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged item and insert at new position
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    await onReorderCategories(newOrder);
    setDraggedId(null);
  };

  // Calculate total clauses
  const totalClauses = categories.reduce((sum, cat) => sum + (cat.clause_count || 0), 0);

  return (
    <div className="h-full flex flex-col bg-white border-r border-aaa-border">
      {/* Header */}
      <div className="p-4 border-b border-aaa-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-aaa-text uppercase tracking-wider">Categories</h2>
          <button
            onClick={onSyncCategories}
            className="p-1.5 text-aaa-muted hover:text-aaa-blue hover:bg-slate-100 rounded-lg transition-colors"
            title="Sync categories from clauses"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-aaa-muted">
          {categories.length} categories, {totalClauses} clauses
        </p>
      </div>

      {/* Category List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading === 'loading' ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-aaa-blue border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-aaa-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-sm text-aaa-muted mb-2">No categories yet</p>
            <p className="text-xs text-aaa-muted">
              Create a category or sync from existing clause data
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* "All Clauses" option */}
            <button
              onClick={() => onSelectCategory(null)}
              className={`
                w-full flex items-center gap-2 px-3 py-2.5 rounded-lg
                transition-colors text-left
                ${selectedCategoryId === null ? 'bg-slate-100 text-aaa-text' : 'hover:bg-slate-50 text-aaa-muted'}
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="text-sm font-medium">All Clauses</span>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-aaa-muted">
                {totalClauses}
              </span>
            </button>

            {/* Divider */}
            <div className="h-px bg-aaa-border my-2"></div>

            {/* Category Items */}
            {categories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                isSelected={selectedCategoryId === category.id}
                isDragging={draggedId === category.id}
                isDragOver={dragOverId === category.id}
                onSelect={() => onSelectCategory(category.id)}
                onRename={(newName) => onRenameCategory(category.id, newName)}
                onDelete={() => onDeleteCategory(category.id)}
                onDragStart={(e) => handleDragStart(e, category.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, category.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, category.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Category */}
      <div className="p-3 border-t border-aaa-border">
        {isCreating ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Category name..."
              disabled={isSaving}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-aaa-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newCategoryName.trim() || isSaving}
                className="flex-1 px-3 py-1.5 bg-aaa-blue text-white text-xs font-bold rounded-lg hover:bg-aaa-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setNewCategoryName('');
                  setIsCreating(false);
                }}
                disabled={isSaving}
                className="px-3 py-1.5 text-aaa-muted text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-aaa-border rounded-lg text-aaa-muted hover:border-aaa-blue hover:text-aaa-blue transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium">Add Category</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CategoryManagerPanel;
