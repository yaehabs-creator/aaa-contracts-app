import React, { useState, useEffect } from 'react';
import { EditorCategory } from '@/services/adminEditorService';
import { CreateClauseParams } from '@/hooks/useAdminEditor';

interface AddClauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (params: CreateClauseParams) => Promise<boolean>;
  categories: EditorCategory[];
  selectedCategoryId?: string | null;
}

/**
 * AddClauseModal Component
 * Modal form for creating a new clause in the admin editor
 */
export const AddClauseModal: React.FC<AddClauseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  selectedCategoryId
}) => {
  // Form state
  const [sectionType, setSectionType] = useState<'GENERAL' | 'PARTICULAR'>('PARTICULAR');
  const [categoryId, setCategoryId] = useState<string | null>(selectedCategoryId || null);
  const [clauseNumber, setClauseNumber] = useState('');
  const [clauseTitle, setClauseTitle] = useState('');
  const [clauseText, setClauseText] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or selectedCategoryId changes
  useEffect(() => {
    if (isOpen) {
      setCategoryId(selectedCategoryId || null);
      setClauseNumber('');
      setClauseTitle('');
      setClauseText('');
      setSectionType('PARTICULAR');
      setError(null);
    }
  }, [isOpen, selectedCategoryId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!clauseText.trim()) {
      setError('Clause text is required');
      return;
    }

    setIsSaving(true);

    try {
      const success = await onSave({
        sectionType,
        categoryId: categoryId || undefined,
        clauseNumber: clauseNumber.trim() || undefined,
        clauseTitle: clauseTitle.trim() || undefined,
        clauseText: clauseText.trim()
      });

      if (success) {
        onClose();
      } else {
        setError('Failed to create clause. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSaving && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-aaa-border bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-aaa-text">Add New Clause</h2>
              <p className="text-sm text-aaa-muted mt-0.5">Create a new clause for this contract</p>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-2 text-aaa-muted hover:text-aaa-text hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* Section Type */}
            <div>
              <label className="block text-sm font-bold text-aaa-text mb-2">
                Section Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSectionType('PARTICULAR')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-bold text-sm transition-all ${sectionType === 'PARTICULAR'
                      ? 'border-aaa-blue bg-aaa-blue/5 text-aaa-blue'
                      : 'border-aaa-border text-aaa-muted hover:border-aaa-blue/50'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${sectionType === 'PARTICULAR' ? 'bg-aaa-blue' : 'bg-slate-300'}`} />
                    Particular Condition
                  </div>
                  <p className="text-xs font-normal mt-1 opacity-70">Custom/modified clause</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSectionType('GENERAL')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-bold text-sm transition-all ${sectionType === 'GENERAL'
                      ? 'border-aaa-blue bg-aaa-blue/5 text-aaa-blue'
                      : 'border-aaa-border text-aaa-muted hover:border-aaa-blue/50'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${sectionType === 'GENERAL' ? 'bg-aaa-blue' : 'bg-slate-300'}`} />
                    General Condition
                  </div>
                  <p className="text-xs font-normal mt-1 opacity-70">Standard contract clause</p>
                </button>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-aaa-text mb-2">
                Category
              </label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value || null)}
                className="w-full px-4 py-3 border border-aaa-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue bg-white"
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-aaa-muted mt-1">
                Assign this clause to a category for better organization
              </p>
            </div>

            {/* Clause Number and Title Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Clause Number */}
              <div>
                <label className="block text-sm font-bold text-aaa-text mb-2">
                  Clause Number
                </label>
                <input
                  type="text"
                  value={clauseNumber}
                  onChange={(e) => setClauseNumber(e.target.value)}
                  placeholder="e.g., 1.1, 2.3, 6A.1"
                  className="w-full px-4 py-3 border border-aaa-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue"
                />
              </div>

              {/* Clause Title */}
              <div>
                <label className="block text-sm font-bold text-aaa-text mb-2">
                  Clause Title
                </label>
                <input
                  type="text"
                  value={clauseTitle}
                  onChange={(e) => setClauseTitle(e.target.value)}
                  placeholder="e.g., Payment Terms"
                  className="w-full px-4 py-3 border border-aaa-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue"
                />
              </div>
            </div>

            {/* Clause Text */}
            <div>
              <label className="block text-sm font-bold text-aaa-text mb-2">
                Clause Text <span className="text-red-500">*</span>
              </label>
              <textarea
                value={clauseText}
                onChange={(e) => setClauseText(e.target.value)}
                placeholder="Enter the full clause text here..."
                rows={8}
                className="w-full px-4 py-3 border border-aaa-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue resize-none"
                required
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-aaa-muted">
                  This is the main content of the clause
                </p>
                <p className="text-xs text-aaa-muted">
                  {clauseText.length} characters
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-aaa-border bg-slate-50 flex items-center justify-between">
            <div className="text-xs text-aaa-muted">
              <span className="text-red-500">*</span> Required fields
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-bold text-aaa-muted hover:text-aaa-text hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !clauseText.trim()}
                className="px-5 py-2.5 bg-aaa-blue text-white text-sm font-bold rounded-lg hover:bg-aaa-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Clause
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClauseModal;
