
import React, { useRef, useEffect, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnalysisStatus } from '@/types';

// Lazy load heavy components for performance
const ComparisonModal = React.lazy(() => import('@/components/ComparisonModal').then(m => ({ default: m.ComparisonModal })));
const AddClauseModal = React.lazy(() => import('@/components/AddClauseModal').then(m => ({ default: m.AddClauseModal })));
const CategorySuggestionsModal = React.lazy(() => import('@/components/CategorySuggestionsModal').then(m => ({ default: m.CategorySuggestionsModal })));
const Sidebar = React.lazy(() => import('@/components/Sidebar').then(m => ({ default: m.Sidebar })));

import { AppWrapper } from '@/components/AppWrapper';
import { useAuth } from './src/contexts/AuthContext';
import { CategoryManagerService } from '@/services/categoryManagerService';
import {
  getClauseStatus,
  matchesSearchKeywords,
} from './src/utils/contractUtils';
import { useContractStorage } from './src/hooks/useContractStorage';
import { useAnalysisPipeline } from './src/hooks/useAnalysisPipeline';
import { useContractActions } from './src/hooks/useContractActions';
import { useAppStore } from '@/store/useAppStore';
const ChatContainer = React.lazy(() => import('@/components/chat/ChatContainer'));

// Extracted Views
import { IdleView } from '@/components/views/IdleView';
import { LibraryView } from '@/components/views/LibraryView';
import { CompletedView } from '@/components/views/CompletedView';
import { PdfPreviewView } from '@/components/views/PdfPreviewView';
import { AnalyzingView } from '@/components/views/AnalyzingView';
import { ErrorView } from '@/components/views/ErrorView';
import { OrganizerView } from '@/components/views/OrganizerView';
import { ContractSelectorModal } from '@/components/views/ContractSelectorModal';

const App: React.FC = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const {
    status,
    clauses, setClauses,
    contract, 
    library,
    activeContractId, setActiveContractId,
    projectName,
    isSaving,
    saveStatus,
    setSearchFilter,
    showContractSelector, setShowContractSelector,
    setHasDraft,
    activeTab, setActiveTab,
    isSidebarOpen,
    searchFilter,
    selectedTypes,
    selectedGroup,
    sortMode, setSortMode,
    isBotOpen, setIsBotOpen,
    compareClause, setCompareClause,
    isAddModalOpen, setIsAddModalOpen,
    categorySuggestions, setCategorySuggestions,
    showCategorySuggestions, setShowCategorySuggestions,
  } = useAppStore();

  // --- STORAGE & PERSISTENCE ---
  const {
    refreshLibrary,
    clearDraft,
    restoreDraft,
    persistCurrentProject,
    performSave,
    performSaveContract,
    handleRenameArchive,
    handleDeleteArchive,
    handleExportContract,
    handleImportBackup,
    cleanupSaveTimer,
  } = useContractStorage();

  // Draft: detect if one exists on mount
  useEffect(() => {
    const draft = localStorage.getItem('aaa_contract_draft');
    if (draft) setHasDraft(true);
  }, [setHasDraft]);

  // Draft: keep localStorage in sync with the active contract
  useEffect(() => {
    if (contract) localStorage.setItem('aaa_contract_draft', JSON.stringify(contract));
  }, [contract]);

  // Cleanup debounce timer on unmount
  useEffect(() => { return () => cleanupSaveTimer(); }, [cleanupSaveTimer]);

  // Persist activeContractId to localStorage
  useEffect(() => {
    if (activeContractId) { localStorage.setItem('aaa_active_contract_id', activeContractId); }
    else { localStorage.removeItem('aaa_active_contract_id'); }
  }, [activeContractId]);

  // Library: load when auth is ready
  const hasShownSelectorRef = useRef(false);
  useEffect(() => {
    if (authLoading || !user) return;
    if (hasShownSelectorRef.current) return;
    if (clauses.length > 0) { hasShownSelectorRef.current = true; return; }
    hasShownSelectorRef.current = true;
    refreshLibrary().catch(err => console.error('Failed to load contracts:', err));
  }, [authLoading, user, clauses.length, refreshLibrary]);

  // Close contract selector on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showContractSelector) setShowContractSelector(false);
    };
    if (showContractSelector) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showContractSelector, setShowContractSelector]);

  // File input refs
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const generalFileRef  = useRef<HTMLInputElement>(null);
  const particularFileRef = useRef<HTMLInputElement>(null);
  const importBackupRef = useRef<HTMLInputElement>(null);

  // --- CONTRACT ACTIONS ---
  const {
    editingClause,
    setEditingClause,
    handleUpdateClause,
    onOpenClause,
    handleEditClause,
    handleAskAI,
    handleUpdateClauseFromModal,
    handleSaveManualClause,
    handleDeleteClause,
    handleReorder
  } = useContractActions(persistCurrentProject, performSaveContract);

  // --- AI ANALYSIS PIPELINE ---
  const {
    handleTextAnalysis,
    handlePdfAnalysis,
    handleAICleanPdf,
    handleAddPdfToContract,
    handleDownloadOcrJson,
    processFile,
  } = useAnalysisPipeline(persistCurrentProject, performSaveContract);

  const filteredClauses = clauses.filter(c => {
    const keywords = searchFilter.trim().split(/\s+/).filter(k => k.length > 0);
    const matchesSearch = searchFilter === '' || matchesSearchKeywords(c, keywords);
    const matchesType = selectedTypes.includes(c.condition_type);
    const matchesGroup = !selectedGroup || (selectedGroup === 'Other' && !/^[A-Za-z0-9]+/.test(String(c.clause_number))) || String(c.clause_number).startsWith(selectedGroup);
    return matchesSearch && matchesType && matchesGroup;
  });

  // Sort clauses based on sortMode
  const sortedClauses = useMemo(() => {
    if (sortMode === 'status') {
      const statusOrder = { 'added': 0, 'modified': 1, 'gc-only': 2 };
      return [...filteredClauses].sort((a, b) => {
        const statusDiff = statusOrder[getClauseStatus(a)] - statusOrder[getClauseStatus(b)];
        if (statusDiff !== 0) return statusDiff;
        const numA = parseFloat(a.clause_number) || 0;
        const numB = parseFloat(b.clause_number) || 0;
        return numA - numB;
      });
    }
    if (sortMode === 'chapter') {
      return [...filteredClauses].sort((a, b) => {
        const numA = parseFloat(a.clause_number) || 0;
        const numB = parseFloat(b.clause_number) || 0;
        if (numA !== numB) return numA - numB;
        return a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true });
      });
    }
    return filteredClauses;
  }, [filteredClauses, sortMode]);


  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1A2333',
            border: '1px solid #D1D9E6',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />
      <AppWrapper>
        <div className="min-h-screen flex flex-col">
          <input
            type="file"
            ref={importBackupRef}
            onChange={(e) => handleImportBackup(e, importBackupRef)}
            accept=".json"
            className="hidden"
          />


          <div className="flex-1 flex overflow-hidden">
            {status === AnalysisStatus.COMPLETED && isSidebarOpen && (
              <Sidebar
                contract={contract}
                clauses={clauses}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                searchQuery={searchFilter}
                setSearchQuery={setSearchFilter}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
                isSaving={isSaving}
                saveStatus={saveStatus}
                handleSave={() => contract && performSaveContract(contract)}
              />
            )}

            <main className={`flex-1 overflow-y-auto px-6 py-6 custom-scrollbar transition-all ${status !== AnalysisStatus.COMPLETED ? 'max-w-7xl mx-auto' : isSidebarOpen ? 'lg:ml-80' : ''}`}>
              {status === AnalysisStatus.IDLE && (
                <IdleView
                  isAdmin={isAdmin}
                  clearDraft={clearDraft}
                  restoreDraft={restoreDraft}
                  importBackupRef={importBackupRef}
                  generalFileRef={generalFileRef}
                  particularFileRef={particularFileRef}
                  fileInputRef={fileInputRef}
                  processFile={processFile}
                  handlePdfAnalysis={handlePdfAnalysis}
                  handleTextAnalysis={handleTextAnalysis}
                />
              )}

              {status === AnalysisStatus.PDF_PREVIEW && (
                <PdfPreviewView
                  handleAICleanPdf={handleAICleanPdf}
                  handleDownloadOcrJson={handleDownloadOcrJson}
                  handleAddPdfToContract={handleAddPdfToContract}
                />
              )}

              {status === AnalysisStatus.ANALYZING && (
                <AnalyzingView />
              )}

              {status === AnalysisStatus.ERROR && (
                <ErrorView />
              )}

              {status === AnalysisStatus.COMPLETED && (
                <CompletedView
                  persistCurrentProject={persistCurrentProject}
                  onOpenClause={onOpenClause}
                  handleEditClause={handleEditClause}
                  handleDeleteClause={handleDeleteClause}
                  handleReorder={handleReorder}
                  handleAskAI={handleAskAI}
                />
              )}

              {status === AnalysisStatus.ORGANIZER && (
                <OrganizerView />
              )}

              {status === AnalysisStatus.LIBRARY && (
                <LibraryView
                  isAdmin={isAdmin}
                  handleExportContract={handleExportContract}
                  handleRenameArchive={handleRenameArchive}
                  handleDeleteArchive={handleDeleteArchive}
                />
              )}

              {showContractSelector && (
                <ContractSelectorModal
                  refreshLibrary={refreshLibrary}
                  performSave={performSave}
                />
              )}
            </main>
          </div>
        </div>

        <React.Suspense fallback={null}>
          {compareClause && (
            <ComparisonModal
              baseClause={compareClause}
              allClauses={clauses}
              onClose={() => setCompareClause(null)}
              onUpdateClause={handleUpdateClause}
            />
          )}
        </React.Suspense>

        <React.Suspense fallback={null}>
          {isAddModalOpen && (
            <AddClauseModal
              contractId={activeContractId || 'current-contract'}
              onClose={() => {
                setIsAddModalOpen(false);
                setEditingClause(null);
              }}
              onSave={editingClause ? handleUpdateClauseFromModal : handleSaveManualClause}
              editingClause={editingClause}
            />
          )}
        </React.Suspense>

        <React.Suspense fallback={null}>
          {showCategorySuggestions && categorySuggestions.length > 0 && (
            <CategorySuggestionsModal
              suggestions={categorySuggestions}
              clauses={clauses}
              onAccept={(suggestion) => {
                const categoryService = new CategoryManagerService();
                categoryService.initialize(clauses);
                categoryService.processAction({
                  action: 'create_category',
                  category_name: suggestion.categoryName
                });

                const updatedClauses = [...clauses];
                suggestion.suggestedClauseNumbers.forEach(clauseNumber => {
                  const addResult = categoryService.processAction({
                    action: 'add_clause',
                    clause_number: clauseNumber,
                    category_name: suggestion.categoryName
                  });
                  if (addResult.success) {
                    const clause = updatedClauses.find(c => c.clause_number === clauseNumber);
                    if (clause) clause.category = suggestion.categoryName;
                  }
                });
                setClauses(updatedClauses);
                persistCurrentProject(updatedClauses, projectName);
              }}
              onReject={(suggestion) => {
                setCategorySuggestions(categorySuggestions.filter(s => s.categoryName !== suggestion.categoryName));
              }}
              onAcceptAll={() => {
                const categoryService = new CategoryManagerService();
                categoryService.initialize(clauses);
                const updatedClauses = [...clauses];

                categorySuggestions.forEach(suggestion => {
                  categoryService.processAction({
                    action: 'create_category',
                    category_name: suggestion.categoryName
                  });

                  suggestion.suggestedClauseNumbers.forEach(clauseNumber => {
                    const addResult = categoryService.processAction({
                      action: 'add_clause',
                      clause_number: clauseNumber,
                      category_name: suggestion.categoryName
                    });
                    if (addResult.success) {
                      const clause = updatedClauses.find(c => c.clause_number === clauseNumber);
                      if (clause && !clause.category) clause.category = suggestion.categoryName;
                    }
                  });
                });

                setClauses(updatedClauses);
                persistCurrentProject(updatedClauses, projectName);
                setShowCategorySuggestions(false);
              }}
              onDismiss={() => {
                setShowCategorySuggestions(false);
                setCategorySuggestions([]);
              }}
            />
          )}
        </React.Suspense>

        <footer className="glass border-t border-aaa-border px-10 h-16 flex items-center justify-between z-10 shrink-0">
          <div className="flex flex-col">
            <p className="text-[9px] font-black text-aaa-muted uppercase tracking-[0.5em]">AAA CONTRACT DEPARTMENT © 2025</p>
          </div>
          <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Precision Engine Pro</span>
        </footer>
        <ChatContainer
          isOpen={isBotOpen}
          onClose={() => setIsBotOpen(false)}
          contractClauses={clauses}
          contractId={activeContractId}
        />
      </AppWrapper>
    </>
  );
};

export default App;
