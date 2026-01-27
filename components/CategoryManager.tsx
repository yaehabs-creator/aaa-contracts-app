
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clause, Category, CategoryAction } from '../types';
import { CategoryManagerService } from '../services/categoryManagerService';

interface CategoryManagerProps {
  clauses: Clause[];
  onClausesUpdate: (updatedClauses: Clause[]) => void;
  onCloseOtherModals?: () => void;
  triggerAutoAssign?: { clauseNumbers: string[] } | null;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ clauses, onClausesUpdate, onCloseOtherModals, triggerAutoAssign }) => {
  const [categoryService] = useState(() => new CategoryManagerService());
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showAddClauseModal, setShowAddClauseModal] = useState(false);
  const [showMultiSelectModal, setShowMultiSelectModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renameOldName, setRenameOldName] = useState('');
  const [renameNewName, setRenameNewName] = useState('');
  const [addClauseNumber, setAddClauseNumber] = useState('');
  const [addClauseCategory, setAddClauseCategory] = useState('');
  const [multiSelectCategoryName, setMultiSelectCategoryName] = useState('');
  const [selectedClauseNumbers, setSelectedClauseNumbers] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewingCategory, setViewingCategory] = useState<string | null>(null);

  useEffect(() => {
    categoryService.initialize(clauses);
    setCategories(categoryService.getAllCategories());
  }, [clauses]);

  // Handle auto-assign trigger
  useEffect(() => {
    if (triggerAutoAssign && triggerAutoAssign.clauseNumbers.length > 0) {
      // Close any open modals first
      setShowCreateModal(false);
      setShowRenameModal(false);
      setShowAddClauseModal(false);
      setViewingCategory(null);
      onCloseOtherModals?.();
      // Open multi-select modal with unassigned clauses pre-selected
      setSelectedClauseNumbers(new Set(triggerAutoAssign.clauseNumbers));
      setShowMultiSelectModal(true);
    }
  }, [triggerAutoAssign, onCloseOtherModals]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAction = (action: CategoryAction) => {
    const result = categoryService.processAction(action);
    
    if (result.success) {
      const updatedClauses = categoryService.getUpdatedClauses();
      onClausesUpdate(updatedClauses);
      setCategories(categoryService.getAllCategories());
      
      if (result.message) {
        showMessage('success', result.message);
      }
      
      // Close modals
      setShowCreateModal(false);
      setShowRenameModal(false);
      setShowAddClauseModal(false);
      setNewCategoryName('');
      setRenameOldName('');
      setRenameNewName('');
      setAddClauseNumber('');
      setAddClauseCategory('');
    } else {
      showMessage('error', result.error || 'Action failed');
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      showMessage('error', 'Category name cannot be empty');
      return;
    }
    handleAction({ action: 'create_category', category_name: newCategoryName.trim() });
  };

  const handleRenameCategory = () => {
    if (!renameOldName.trim() || !renameNewName.trim()) {
      showMessage('error', 'Category names cannot be empty');
      return;
    }
    handleAction({ action: 'rename_category', old_name: renameOldName.trim(), new_name: renameNewName.trim() });
  };

  const handleDeleteCategory = (categoryName: string) => {
    if (confirm(`Delete category "${categoryName}"? This will remove the category from all clauses.`)) {
      handleAction({ action: 'delete_category', category_name: categoryName });
    }
  };

  const handleAddClause = () => {
    if (!addClauseNumber.trim() || !addClauseCategory.trim()) {
      showMessage('error', 'Clause number and category are required');
      return;
    }
    handleAction({ action: 'add_clause', clause_number: addClauseNumber.trim(), category_name: addClauseCategory.trim() });
  };

  const handleRemoveClause = (clauseNumber: string, categoryName: string) => {
    handleAction({ action: 'remove_clause', clause_number: clauseNumber, category_name: categoryName });
  };

  const handleMultiSelectToggle = (clauseNumber: string) => {
    const newSelected = new Set(selectedClauseNumbers);
    if (newSelected.has(clauseNumber)) {
      newSelected.delete(clauseNumber);
    } else {
      newSelected.add(clauseNumber);
    }
    setSelectedClauseNumbers(newSelected);
  };

  const handleBulkAddToCategory = () => {
    if (!multiSelectCategoryName.trim()) {
      showMessage('error', 'Category name is required');
      return;
    }
    if (selectedClauseNumbers.size === 0) {
      showMessage('error', 'Please select at least one clause');
      return;
    }

    // Create category if it doesn't exist
    const categoryExists = categories.some(c => c.name === multiSelectCategoryName.trim());
    if (!categoryExists) {
      handleAction({ action: 'create_category', category_name: multiSelectCategoryName.trim() });
    }

    // Add all selected clauses to the category
    let successCount = 0;
    let errorCount = 0;
    const failedClauses: string[] = [];
    selectedClauseNumbers.forEach(clauseNumber => {
      const result = categoryService.processAction({ 
        action: 'add_clause', 
        clause_number: clauseNumber, 
        category_name: multiSelectCategoryName.trim() 
      });
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        failedClauses.push(clauseNumber);
      }
    });

    // Update clauses
    const updatedClauses = categoryService.getUpdatedClauses();
    onClausesUpdate(updatedClauses);
    setCategories(categoryService.getAllCategories());

    if (errorCount === 0) {
      showMessage('success', `Successfully added ${successCount} clause(s) to "${multiSelectCategoryName.trim()}"`);
    } else {
      showMessage('error', `Added ${successCount} clause(s), ${errorCount} failed`);
    }

    // Close modal and reset
    closeAllModals();
    setMultiSelectCategoryName('');
    setSelectedClauseNumbers(new Set());
  };

  const handleShowCategory = (categoryName: string) => {
    // Close any other open modals first
    setShowCreateModal(false);
    setShowRenameModal(false);
    setShowAddClauseModal(false);
    setShowMultiSelectModal(false);
    onCloseOtherModals?.();
    
    const result = categoryService.processAction({ action: 'show_category', category_name: categoryName });
    if (result.success && result.clauses) {
      setViewingCategory(categoryName);
    } else {
      showMessage('error', result.error || 'Category not found');
    }
  };

  const closeAllModals = () => {
    setShowCreateModal(false);
    setShowRenameModal(false);
    setShowAddClauseModal(false);
    setShowMultiSelectModal(false);
    setViewingCategory(null);
    onCloseOtherModals?.();
  };

  const categoryClauses = viewingCategory 
    ? clauses.filter(c => c.category === viewingCategory)
    : [];

  // Render modals via portal to avoid stacking context issues
  const modalRoot = typeof document !== 'undefined' ? document.body : null;

  return (
    <div className="space-y-4">
      {/* Message Display - MacBook style */}
      {message && (
        <div className={`p-3 rounded-mac-sm border text-sm font-medium ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      {/* Header - MacBook style */}
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <h4 className="text-[10px] font-semibold text-mac-navy uppercase tracking-wider">Categories</h4>
        <div className="flex gap-2">
          <button
            onClick={() => {
              closeAllModals();
              setShowMultiSelectModal(true);
              setSelectedClauseNumbers(new Set());
            }}
            className="px-3 py-1.5 bg-white border border-surface-border text-mac-blue rounded-md text-[9px] font-medium hover:bg-surface-bg hover:border-mac-blue transition-all"
          >
            Organize
          </button>
          <button
            onClick={() => {
              closeAllModals();
              setShowCreateModal(true);
            }}
            className="px-3 py-1.5 bg-mac-blue text-white rounded-md text-[9px] font-medium hover:bg-mac-blue-hover transition-all"
          >
            + New
          </button>
        </div>
      </div>

      {/* Categories List - MacBook style */}
      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-xs text-mac-muted text-center py-4">No categories yet</p>
        ) : (
          categories.map(category => (
            <div
              key={category.name}
              className="group p-4 bg-surface-bg border border-surface-border rounded-mac-sm hover:border-mac-blue/30 transition-all"
            >
              {/* Title: Category name */}
              <div className="mb-2">
                <div className="text-sm font-medium text-mac-navy">
                  {category.name}
                </div>
              </div>

              {/* Subtitle: Clause count + ADD button */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-mac-muted">
                  {category.clauseNumbers.length} clause{category.clauseNumbers.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => {
                    closeAllModals();
                    setMultiSelectCategoryName(category.name);
                    setSelectedClauseNumbers(new Set());
                    setShowMultiSelectModal(true);
                  }}
                  className="px-2 py-1 bg-emerald-500 text-white rounded-md text-[9px] font-medium hover:bg-emerald-600 transition-all"
                  title="Add more clauses"
                >
                  + Add
                </button>
                <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleShowCategory(category.name)}
                    className="p-1.5 text-mac-muted hover:bg-mac-blue hover:text-white rounded-md transition-all"
                    title="View clauses"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setRenameOldName(category.name);
                      setRenameNewName(category.name);
                      setShowRenameModal(true);
                    }}
                    className="p-1.5 text-mac-muted hover:bg-mac-blue hover:text-white rounded-md transition-all"
                    title="Rename category"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.name)}
                    className="p-1.5 text-mac-muted hover:bg-red-500 hover:text-white rounded-md transition-all"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Badges: All clause numbers */}
              {category.clauseNumbers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {category.clauseNumbers.map(num => (
                    <span
                      key={num}
                      className="text-[9px] font-semibold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Clause to Category */}
      <div className="pt-4 border-t border-aaa-border">
        <button
          onClick={() => setShowAddClauseModal(true)}
          className="w-full px-4 py-2.5 bg-white border border-aaa-border rounded-xl text-[10px] font-black text-aaa-blue uppercase tracking-wider hover:bg-aaa-bg transition-all"
        >
          + Add Clause to Category
        </button>
      </div>

      {/* Viewing Category Modal */}
      {viewingCategory && modalRoot && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeAllModals} />
          <div className="relative z-[10000] w-full max-w-4xl max-h-[80vh] rounded-3xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.35)] flex flex-col">
            {/* HEADER – category name always visible */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.22em] text-slate-400 uppercase">
                  Category
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  {viewingCategory}
                </div>
              </div>
              <button
                onClick={closeAllModals}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* BODY – only this part scrolls */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3 space-y-3 custom-scrollbar">
              {categoryClauses.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">No clauses in this category.</p>
              ) : (
                categoryClauses.map(clause => (
                  <div
                    key={clause.clause_number}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:shadow-md transition-all flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-semibold text-slate-900">{clause.clause_number}</span>
                        <span className="text-sm font-medium text-slate-700">{clause.clause_title}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{clause.clause_text.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                    </div>
                    <button
                      onClick={() => handleRemoveClause(clause.clause_number, viewingCategory)}
                      className="ml-2 p-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all shrink-0"
                      title="Remove from category"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        modalRoot
      )}

      {/* Create Category Modal */}
      {showCreateModal && modalRoot && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => {
            closeAllModals();
            setNewCategoryName('');
          }} />

          <div className="relative z-[2001] w-full max-w-xl rounded-3xl bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.35)] border border-slate-100">
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.22em] text-slate-400 uppercase">
                  Matrix Category
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  Create new category
                </div>
              </div>
              <button
                onClick={() => {
                  closeAllModals();
                  setNewCategoryName('');
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Category name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. Interpretation, Notices, Payment, Variations…"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Add clauses to this category
                </label>
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-500">
                  Later you can select clauses (C.1.2, C.1.3, 22.1, etc.) and assign
                  them to this category from the matrix view.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 pb-5">
              <button
                onClick={() => {
                  closeAllModals();
                  setNewCategoryName('');
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Save category
              </button>
            </div>
          </div>
        </div>,
        modalRoot
      )}

      {/* Rename Category Modal */}
      {showRenameModal && modalRoot && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-[6px]" style={{ backgroundColor: 'rgba(0, 16, 56, 0.4)' }}>
          <div className="absolute inset-0" onClick={() => {
            closeAllModals();
            setRenameOldName('');
            setRenameNewName('');
          }} />
          <div className="relative z-[10000] bg-white w-full max-w-md rounded-[32px] shadow-xl p-6">
            <h3 className="text-xl font-black text-aaa-blue mb-4">Rename Category</h3>
            <input
              type="text"
              value={renameNewName}
              onChange={(e) => setRenameNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory()}
              placeholder="New category name..."
              className="w-full px-4 py-3 bg-aaa-bg border border-aaa-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-aaa-blue focus:border-aaa-blue outline-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  closeAllModals();
                  setRenameOldName('');
                  setRenameNewName('');
                }}
                className="flex-1 px-4 py-2.5 bg-white border border-aaa-border rounded-xl text-[10px] font-black text-aaa-muted uppercase tracking-wider hover:bg-aaa-bg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleRenameCategory();
                  closeAllModals();
                }}
                className="flex-1 px-4 py-2.5 bg-aaa-blue text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-aaa-hover transition-all shadow-sm"
              >
                Rename
              </button>
            </div>
          </div>
        </div>,
        modalRoot
      )}

      {/* Add Clause to Category Modal */}
      {showAddClauseModal && modalRoot && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-[6px]" style={{ backgroundColor: 'rgba(0, 16, 56, 0.4)' }}>
          <div className="absolute inset-0" onClick={closeAllModals} />
          <div className="relative z-[10000] bg-white w-full max-w-md rounded-[32px] shadow-xl p-6">
            <h3 className="text-xl font-black text-aaa-blue mb-4">Add Clause to Category</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-aaa-blue uppercase tracking-wider mb-2 block">Clause Number</label>
                <input
                  type="text"
                  value={addClauseNumber}
                  onChange={(e) => setAddClauseNumber(e.target.value)}
                  placeholder="e.g., 1.2"
                  className="w-full px-4 py-3 bg-aaa-bg border border-aaa-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-aaa-blue focus:border-aaa-blue outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-aaa-blue uppercase tracking-wider mb-2 block">Category</label>
                <select
                  value={addClauseCategory}
                  onChange={(e) => setAddClauseCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-aaa-bg border border-aaa-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-aaa-blue focus:border-aaa-blue outline-none"
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddClauseModal(false);
                  setAddClauseNumber('');
                  setAddClauseCategory('');
                }}
                className="flex-1 px-4 py-2.5 bg-white border border-aaa-border rounded-xl text-[10px] font-black text-aaa-muted uppercase tracking-wider hover:bg-aaa-bg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClause}
                className="flex-1 px-4 py-2.5 bg-aaa-blue text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-aaa-hover transition-all shadow-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>,
        modalRoot
      )}

      {/* Multi-Select Organize Modal */}
      {showMultiSelectModal && modalRoot && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 backdrop-blur-[6px]" style={{ backgroundColor: 'rgba(0, 16, 56, 0.4)' }}>
          <div className="absolute inset-0" onClick={() => {
            closeAllModals();
            setMultiSelectCategoryName('');
            setSelectedClauseNumbers(new Set());
          }} />
          <div className="relative z-[10000] bg-white w-full max-w-2xl rounded-[32px] shadow-xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-aaa-border flex items-center justify-between">
              <h3 className="text-xl font-black text-aaa-blue">Organize Clauses into Category</h3>
              <button
                onClick={() => {
                  closeAllModals();
                  setMultiSelectCategoryName('');
                  setSelectedClauseNumbers(new Set());
                }}
                className="p-2 hover:bg-aaa-bg rounded-lg transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="mb-6">
                <label className="text-[10px] font-black text-aaa-blue uppercase tracking-wider mb-2 block">Category Name</label>
                <input
                  type="text"
                  value={multiSelectCategoryName}
                  onChange={(e) => setMultiSelectCategoryName(e.target.value)}
                  placeholder="Enter category name (e.g., Definitions, Communication, etc.)"
                  className="w-full px-4 py-3 bg-aaa-bg border border-aaa-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-aaa-blue focus:border-aaa-blue outline-none"
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.name}
                      onClick={() => setMultiSelectCategoryName(cat.name)}
                      className="px-3 py-1 text-[9px] font-bold text-aaa-blue bg-white border border-aaa-blue rounded-lg hover:bg-aaa-blue hover:text-white transition-all"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-black text-aaa-blue">Select Clauses</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Select only unassigned clauses or clauses not in this category
                      const categoryClauseNumbers = new Set(
                        categories.find(c => c.name === multiSelectCategoryName)?.clauseNumbers || []
                      );
                      const unassignedOrDifferent = clauses
                        .filter(c => !c.category || c.category !== multiSelectCategoryName)
                        .map(c => c.clause_number);
                      setSelectedClauseNumbers(new Set(unassignedOrDifferent));
                    }}
                    className="text-[9px] font-bold text-aaa-blue hover:text-aaa-hover"
                  >
                    Select Available
                  </button>
                  <span className="text-aaa-muted">|</span>
                  <button
                    onClick={() => setSelectedClauseNumbers(new Set(clauses.map(c => c.clause_number)))}
                    className="text-[9px] font-bold text-aaa-blue hover:text-aaa-hover"
                  >
                    Select All
                  </button>
                  <span className="text-aaa-muted">|</span>
                  <button
                    onClick={() => setSelectedClauseNumbers(new Set())}
                    className="text-[9px] font-bold text-aaa-muted hover:text-aaa-blue"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {clauses.map(clause => {
                  const isInThisCategory = clause.category === multiSelectCategoryName;
                  return (
                    <label
                      key={clause.clause_number}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                        isInThisCategory 
                          ? 'bg-emerald-50 border-emerald-200 opacity-60' 
                          : 'bg-aaa-bg border-aaa-border hover:border-aaa-blue'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClauseNumbers.has(clause.clause_number)}
                        onChange={() => handleMultiSelectToggle(clause.clause_number)}
                        disabled={isInThisCategory}
                        className="w-4 h-4 rounded border-aaa-border text-aaa-blue focus:ring-aaa-blue disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-black text-aaa-blue mr-2">{clause.clause_number}</span>
                        <span className="text-xs font-semibold text-aaa-text">{clause.clause_title || 'Untitled'}</span>
                        {clause.category && clause.category !== multiSelectCategoryName && (
                          <span className="ml-2 text-[9px] font-bold text-aaa-muted bg-white px-2 py-0.5 rounded border border-aaa-border">
                            {clause.category}
                          </span>
                        )}
                        {isInThisCategory && (
                          <span className="ml-2 text-[9px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                            Already in category
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-aaa-border flex items-center justify-between bg-slate-50/50">
              <span className="text-[10px] font-bold text-aaa-muted">
                {selectedClauseNumbers.size} clause{selectedClauseNumbers.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    closeAllModals();
                    setMultiSelectCategoryName('');
                    setSelectedClauseNumbers(new Set());
                  }}
                  className="px-6 py-2.5 bg-white border border-aaa-border rounded-xl text-[10px] font-black text-aaa-muted uppercase tracking-wider hover:bg-aaa-bg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAddToCategory}
                  disabled={!multiSelectCategoryName.trim() || selectedClauseNumbers.size === 0}
                  className="px-6 py-2.5 bg-aaa-blue text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-aaa-hover transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add {selectedClauseNumbers.size > 0 ? `${selectedClauseNumbers.size} ` : ''}to Category
                </button>
              </div>
            </div>
          </div>
        </div>,
        modalRoot
      )}
    </div>
  );
};
