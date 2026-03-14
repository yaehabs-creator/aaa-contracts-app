import React from 'react';
import {
  AnalysisStatus,
  SavedContract,
} from '@/types';
import { useAppStore } from '@/store/useAppStore';
import {
  ensureContractHasSections,
  getAllClausesFromContract,
} from '@/services/contractMigrationService';
import { reprocessClauseLinks } from '@/utils/contractUtils';

interface ContractSelectorModalProps {
  refreshLibrary: () => Promise<void>;
  performSave: (clauses?: any[], name?: string, id?: string) => Promise<void>;
}

export const ContractSelectorModal: React.FC<ContractSelectorModalProps> = ({
  refreshLibrary,
  performSave,
}) => {
  const {
    library,
    setShowContractSelector,
    setContract,
    setClauses,
    setProjectName,
    setActiveContractId,
    setStatus,
  } = useAppStore();

  const handleSelectContract = (c: SavedContract) => {
    const contractWithSections = ensureContractHasSections(c);
    const allClauses = getAllClausesFromContract(contractWithSections);
    const reprocessedClauses = reprocessClauseLinks(allClauses);
    setContract(contractWithSections);
    setClauses(reprocessedClauses);
    setProjectName(contractWithSections.name);
    setActiveContractId(contractWithSections.id);
    setStatus(AnalysisStatus.COMPLETED);
    setShowContractSelector(false);
  };

  const handleCreateNew = async () => {
    const newContractId = crypto.randomUUID();
    const newContractName = `New Contract ${new Date().toLocaleDateString()}`;

    setClauses([]);
    setProjectName(newContractName);
    setActiveContractId(newContractId);
    setStatus(AnalysisStatus.COMPLETED);
    setShowContractSelector(false);

    try {
      await performSave([], newContractName, newContractId);
    } catch (err) {
      console.error("Failed to save new contract:", err);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowContractSelector(false);
        }
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-8 border-b border-aaa-border flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black text-aaa-text mb-2">Select a Contract</h2>
            <p className="text-aaa-muted text-sm">Choose a contract to continue working, or create a new one</p>
          </div>
          <button
            onClick={() => setShowContractSelector(false)}
            className="p-2 text-aaa-muted hover:text-aaa-text hover:bg-aaa-bg rounded-lg transition-all"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 text-center sm:text-left">
          {library.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-aaa-muted mb-6">No contracts found. Create a new one to get started.</p>
              <div className="mt-6 p-4 bg-aaa-bg/50 rounded-xl border border-aaa-border">
                <p className="text-xs text-aaa-muted mb-2 font-bold uppercase tracking-widest">Troubleshooting:</p>
                <ul className="text-xs text-left text-aaa-muted space-y-1 max-w-md mx-auto">
                  <li>• Check browser console (F12) for errors</li>
                  <li>• Verify you're logged in</li>
                  <li>• Check Supabase Dashboard → Table Editor → contracts</li>
                  <li>• Ensure RLS policies are set up (run migrations)</li>
                </ul>
              </div>
              <button
                onClick={refreshLibrary}
                className="mt-4 px-6 py-2 bg-aaa-blue text-white rounded-xl text-sm font-bold hover:bg-aaa-hover transition-all"
              >
                Refresh Contracts
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {library.map(c => {
                const savedContractId = localStorage.getItem('aaa_active_contract_id');
                const isLastActive = savedContractId === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectContract(c)}
                    className={`group bg-white p-6 rounded-2xl border shadow-lg cursor-pointer transition-all relative flex flex-col hover:-translate-y-1 ${isLastActive
                      ? 'border-aaa-blue ring-2 ring-aaa-blue/20 bg-aaa-blue/5'
                      : 'border-aaa-border hover:border-aaa-blue'
                      }`}
                  >
                    {isLastActive && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-aaa-blue text-white text-[9px] font-black rounded-full uppercase tracking-widest">
                        Last Active
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-2xl font-black text-aaa-text truncate tracking-tighter pr-16">{c.name}</h4>
                    </div>
                    <div className="mt-auto pt-4 border-t border-aaa-border flex justify-between items-center text-[10px] font-black uppercase text-aaa-muted tracking-widest">
                      <span>{new Date(c.timestamp).toLocaleDateString()}</span>
                      <span className="px-3 py-1 bg-aaa-bg rounded-lg text-aaa-blue">{c.clauses?.length || c.metadata?.totalClauses || 0} Nodes</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-8 border-t border-aaa-border flex gap-4 justify-end">
          <button
            onClick={handleCreateNew}
            className="px-8 py-3 bg-emerald-500 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all"
          >
            Create New Contract
          </button>
        </div>
      </div>
    </div>
  );
};
