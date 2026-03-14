import React from 'react';
import {
  AnalysisStatus,
  SavedContract,
  Clause,
  SectionType,
} from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { ContractSectionsTabs } from '@/components/ContractSectionsTabs';
import {
  ensureContractHasSections,
} from '@/services/contractMigrationService';
import { getClausesWithProcessedLinks } from '@/utils/contractUtils';

interface CompletedViewProps {
  persistCurrentProject: (clauses?: Clause[], name?: string, immediate?: boolean) => Promise<void>;
  onOpenClause: (clauseNumber: string) => void;
  handleEditClause: (clause: Clause) => void;
  handleDeleteClause: (index: number, sectionType?: SectionType) => Promise<void>;
  handleReorder: (fromIndex: number, toIndex: number, sectionType?: SectionType) => Promise<void>;
  handleAskAI: (item: any) => void;
}

export const CompletedView: React.FC<CompletedViewProps> = ({
  persistCurrentProject,
  onOpenClause,
  handleEditClause,
  handleDeleteClause,
  handleReorder,
  handleAskAI,
}) => {
  const {
    projectName,
    setProjectName,
    isSaving,
    clauses,
    setClauses,
    searchResults,
    setSearchResults,
    searchError,
    isSearching,
    setSmartSearchQuery,
    contract,
    setContract,
    activeContractId,
    organizerSubfolders,
    organizerExtractedData,
    organizerSchemas,
    activeTab,
    setActiveTab,
    sortMode,
    setSortMode,
    setCompareClause,
    setIsAddModalOpen,
  } = useAppStore();

  const handleUpdateContract = async (updatedContract: SavedContract) => {
    // Update local state immediately for responsive UI (no auto-save)
    // Reprocess clause links to ensure internal references work
    setContract(updatedContract);
    setClauses(getClausesWithProcessedLinks(updatedContract));
  };

  // Fallback: if contract not set but clauses exist, create contract
  const renderFallbackContract = () => {
    const fallbackContract = ensureContractHasSections({
      id: activeContractId || crypto.randomUUID(),
      name: projectName || "Untitled Contract",
      timestamp: Date.now(),
      clauses,
      metadata: {
        totalClauses: clauses.length,
        generalCount: clauses.filter(c => c.condition_type === 'General').length,
        particularCount: clauses.filter(c => c.condition_type === 'Particular').length,
        highRiskCount: 0,
        conflictCount: clauses.filter(c => c.comparison && c.comparison.length > 0).length,
        timeSensitiveCount: clauses.filter(c => c.time_frames && c.time_frames.length > 0).length
      }
    });

    // In a real app, you might want to call setContract(fallbackContract) in a useEffect
    // but here we just pass it to the child for rendering
    return (
      <ContractSectionsTabs
        contract={fallbackContract}
        onUpdate={handleUpdateContract}
        onEditClause={handleEditClause}
        onCompareClause={setCompareClause}
        onDeleteClause={handleDeleteClause}
        onReorderClause={handleReorder}
        onAddClause={() => setIsAddModalOpen(true)}
        onAskAI={handleAskAI}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        organizerSubfolders={organizerSubfolders}
        organizerExtractedData={organizerExtractedData}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    );
  };

  return (
    <div className="space-y-16 animate-in slide-in-from-bottom-12 pb-20">
      <div className="flex flex-col gap-6 border-b border-aaa-border pb-12">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => persistCurrentProject()}
              className="text-7xl font-black text-aaa-blue bg-transparent border-none focus:ring-0 w-full tracking-tighter hover:bg-aaa-bg/50 rounded-2xl transition-all cursor-text outline-none"
              placeholder="Enter Project Name..."
            />
          </div>

        </div>
      </div>

      {(searchResults || searchError || isSearching) && (
        <div className="bg-white p-10 rounded-[32px] border border-aaa-blue/10 shadow-premium animate-in slide-in-from-bottom-6">
          <div className="flex items-center justify-between mb-8 border-b border-aaa-border pb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-aaa-blue rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-aaa-blue tracking-tighter">Smart Search Results</h3>
            </div>
            <button
              onClick={() => { setSearchResults(null); setSmartSearchQuery(''); }}
              className="text-[10px] font-black text-aaa-muted uppercase tracking-widest hover:text-red-500 transition-colors"
            >
              Clear Results
            </button>
          </div>

          {isSearching && (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-aaa-muted">
              <div className="w-8 h-8 border-4 border-aaa-blue border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black uppercase tracking-[0.3em]">Querying Semantic Matrix...</p>
            </div>
          )}

          {!isSearching && searchResults && searchResults.length > 0 && (
            <div className="space-y-4">
              {searchResults.map((res) => (
                <div
                  key={res.clause_id}
                  onClick={() => onOpenClause(res.clause_number)}
                  className="group p-6 bg-aaa-bg/30 border border-aaa-border rounded-2xl hover:border-aaa-blue hover:bg-white hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute right-0 top-0 h-full w-1 bg-aaa-blue transform translate-x-full group-hover:translate-x-0 transition-transform" />
                  <div className="flex items-start justify-between gap-6">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-aaa-blue mono">C.{res.clause_number}</span>
                        <h4 className="text-lg font-black text-aaa-text tracking-tight group-hover:text-aaa-blue transition-colors">{res.title}</h4>
                      </div>
                      <p className="text-[11px] font-bold text-aaa-muted leading-relaxed italic">" {res.reason} "</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-aaa-blue opacity-30 uppercase tracking-widest mb-1">Relevance</div>
                      <div className="text-2xl font-black text-aaa-blue tracking-tighter">{(res.relevance_score * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contract Documents Tabs */}
      {contract ? (
        <ContractSectionsTabs
          contract={contract}
          onUpdate={handleUpdateContract}
          onEditClause={handleEditClause}
          onCompareClause={setCompareClause}
          onDeleteClause={handleDeleteClause}
          onReorderClause={handleReorder}
          onAddClause={() => setIsAddModalOpen(true)}
          onAskAI={handleAskAI}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          organizerSubfolders={organizerSubfolders}
          organizerExtractedData={organizerExtractedData}
          organizerSchemas={organizerSchemas}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : clauses.length > 0 ? (
        renderFallbackContract()
      ) : (
        <div className="bg-white border border-aaa-border rounded-3xl p-16 text-center">
          <p className="text-aaa-muted font-semibold">No contract data available</p>
        </div>
      )}
    </div>
  );
};
