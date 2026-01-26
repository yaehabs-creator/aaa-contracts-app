import React, { useState } from 'react';
import { useAdminEditor, CreateClauseParams } from '../../hooks/useAdminEditor';
import { adminEditorService } from '../../services/adminEditorService';
import { toast } from 'react-hot-toast';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { ContractPicker } from '../../components/admin/ContractPicker';
import { CategoryManagerPanel } from '../../components/admin/CategoryManagerPanel';
import { ClauseEditorPanel } from '../../components/admin/ClauseEditorPanel';
import { SaveStatusIndicator } from '../../components/admin/SaveStatusIndicator';
import { AddClauseModal } from '../../components/admin/AddClauseModal';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ContractEditorPage Component
 * Admin-only page for editing contracts, categories, and clauses
 */
const ContractEditorPageContent: React.FC = () => {
  const { user } = useAuth();
  const {
    // Data
    contracts,
    selectedContractId,
    categories,
    clauses,
    selectedCategoryId,

    // Loading states
    contractsLoading,
    categoriesLoading,
    clausesLoading,

    // Errors
    error,

    // Actions
    selectContract,
    selectCategory,

    // Category operations
    createCategory,
    renameCategory,
    reorderCategories,
    deleteCategory,
    syncCategories,

    // Clause operations
    createClause,
    updateClauseText,
    assignClauseToCategory,
    removeClauseFromCategory,
    deleteClause
  } = useAdminEditor();

  const [globalSaveStatus, setGlobalSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isAddClauseModalOpen, setIsAddClauseModalOpen] = useState(false);
  const [isUpdatingLinks, setIsUpdatingLinks] = useState(false);

  const handleUpdateHyperlinks = async () => {
    if (!selectedContractId) return;

    try {
      setIsUpdatingLinks(true);
      toast.loading('Updating hyperlinks...', { id: 'update-links' });

      const count = await adminEditorService.updateClauseHyperlinks(selectedContractId);

      toast.success(`Hyperlinks saved to Supabase (${count} clauses)`, { id: 'update-links' });
      // Reload clauses to get new tokens
      selectContract(selectedContractId);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update hyperlinks', { id: 'update-links' });
    } finally {
      setIsUpdatingLinks(false);
    }
  };

  // Handle global error display
  const handleError = (message: string) => {
    console.error('Admin Editor Error:', message);
    setGlobalSaveStatus('error');
    setTimeout(() => setGlobalSaveStatus('idle'), 3000);
  };

  // Handle creating a new clause
  const handleCreateClause = async (params: CreateClauseParams): Promise<boolean> => {
    setGlobalSaveStatus('saving');

    const result = await createClause(params);

    if (result) {
      setGlobalSaveStatus('saved');
      setTimeout(() => setGlobalSaveStatus('idle'), 2000);
      return true;
    } else {
      setGlobalSaveStatus('error');
      setTimeout(() => setGlobalSaveStatus('idle'), 3000);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-aaa-border shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Title and Contract Picker */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-xl font-black text-aaa-text tracking-tight">Contract Editor</h1>
                <p className="text-xs text-aaa-muted">Admin Panel</p>
              </div>

              <div className="w-80">
                <ContractPicker
                  contracts={contracts}
                  selectedContractId={selectedContractId}
                  loading={contractsLoading}
                  onSelect={selectContract}
                />
              </div>
            </div>

            {/* Right: Status and User Info */}
            <div className="flex items-center gap-4">
              {/* Error Display */}
              {error && (
                <div className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Save Status */}
              <SaveStatusIndicator status={globalSaveStatus} />

              {selectedContractId && (
                <button
                  onClick={handleUpdateHyperlinks}
                  disabled={isUpdatingLinks}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors
                    ${isUpdatingLinks
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait'
                      : 'bg-white text-aaa-blue border-aaa-blue hover:bg-aaa-blue hover:text-white'
                    }
                  `}
                >
                  {isUpdatingLinks ? (
                    <>
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <span>🔗</span> UPDATE HYPERLINKS
                    </>
                  )}
                </button>
              )}

              {/* User Info */}
              <div className="flex items-center gap-2 pl-4 border-l border-aaa-border">
                <div className="w-8 h-8 bg-aaa-blue rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-aaa-text">{user?.displayName || 'Admin'}</p>
                  <p className="text-[10px] text-aaa-muted uppercase tracking-wider">{user?.role}</p>
                </div>
              </div>

              {/* Back to App */}
              <a
                href="/"
                className="p-2 text-aaa-muted hover:text-aaa-blue hover:bg-slate-100 rounded-lg transition-colors"
                title="Back to App"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Categories */}
        <div className="w-72 flex-shrink-0">
          <CategoryManagerPanel
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            loading={categoriesLoading}
            totalClauseCount={clauses.filter(c => !c.item_data.is_deleted).length}
            onSelectCategory={selectCategory}
            onCreateCategory={createCategory}
            onRenameCategory={renameCategory}
            onReorderCategories={reorderCategories}
            onDeleteCategory={deleteCategory}
            onSyncCategories={syncCategories}
          />
        </div>

        {/* Main Panel: Clauses */}
        <div className="flex-1 overflow-hidden">
          {selectedContractId ? (
            <ClauseEditorPanel
              clauses={clauses}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              loading={clausesLoading}
              onUpdateClauseText={updateClauseText}
              onAssignClauseToCategory={assignClauseToCategory}
              onRemoveClauseFromCategory={removeClauseFromCategory}
              onDeleteClause={deleteClause}
              onAddClause={() => setIsAddClauseModalOpen(true)}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-50">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-aaa-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-aaa-text mb-2">Select a Contract</h2>
                <p className="text-aaa-muted">
                  Choose a contract from the dropdown above to start editing categories and clauses.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-aaa-border px-6 py-2">
        <div className="flex items-center justify-between text-xs text-aaa-muted">
          <span>Admin Contract Editor v1.0</span>
          <span>
            {selectedContractId && (
              <>
                {categories.length} categories, {clauses.filter(c => !c.item_data.is_deleted).length} clauses
              </>
            )}
          </span>
          <span>Changes are saved automatically</span>
        </div>
      </footer>

      {/* Add Clause Modal */}
      <AddClauseModal
        isOpen={isAddClauseModalOpen}
        onClose={() => setIsAddClauseModalOpen(false)}
        onSave={handleCreateClause}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
      />
    </div>
  );
};

/**
 * Wrapped with AdminGuard for access control
 */
export const ContractEditorPage: React.FC = () => {
  return (
    <AdminGuard>
      <ContractEditorPageContent />
    </AdminGuard>
  );
};

export default ContractEditorPage;
