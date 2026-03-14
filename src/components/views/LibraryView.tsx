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

interface LibraryViewProps {
  isAdmin: () => boolean;
  handleExportContract: (e: React.MouseEvent, contract: SavedContract) => void;
  handleRenameArchive: (e: React.MouseEvent, contract: SavedContract) => void;
  handleDeleteArchive: (e: React.MouseEvent, id: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  isAdmin,
  handleExportContract,
  handleRenameArchive,
  handleDeleteArchive,
}) => {
  const {
    library,
    librarySearchQuery,
    setLibrarySearchQuery,
    setContract,
    setClauses,
    setActiveContractId,
    setProjectName,
    setOrganizerSubfolders,
    setOrganizerSchemas,
    setOrganizerExtractedData,
    setStatus,
    activeContractId,
  } = useAppStore();

  const handleAddContract = () => {
    setContract(null);
    setClauses([]);
    setActiveContractId(null);
    setProjectName('');
    setOrganizerSubfolders([]);
    setOrganizerSchemas({});
    setOrganizerExtractedData([]);
    setStatus(AnalysisStatus.ORGANIZER);
  };

  const handleSelectContract = (c: SavedContract) => {
    const contractWithSections = ensureContractHasSections(c);
    // Re-process clause links to fix any broken hyperlinks
    const allClauses = getAllClausesFromContract(contractWithSections);
    const reprocessedClauses = reprocessClauseLinks(allClauses);
    setContract(contractWithSections);
    setClauses(reprocessedClauses);
    setProjectName(contractWithSections.name);
    setActiveContractId(contractWithSections.id);
    setStatus(AnalysisStatus.COMPLETED);
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20 pt-10 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-aaa-border pb-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-aaa-blue/10 text-aaa-blue text-[10px] font-black uppercase tracking-[0.2em] rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 8h14M5 12h14m-7 4h7" /></svg>
            Project Management Hub
          </div>
          <h2 className="text-6xl font-black text-aaa-text tracking-tighter leading-none">Secured Archive</h2>
          <p className="text-aaa-muted font-medium text-lg">Manage and analyze your contract records. {library.length} records secured.</p>
        </div>

        <div className="flex flex-col gap-6 w-full md:w-auto">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-aaa-blue text-aaa-muted">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              value={librarySearchQuery}
              onChange={(e) => setLibrarySearchQuery(e.target.value)}
              placeholder="Search archives by name..."
              className="w-full md:w-[400px] pl-12 pr-6 py-4 bg-white border border-aaa-border rounded-2xl text-sm font-semibold focus:border-aaa-blue focus:ring-4 focus:ring-aaa-blue/5 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAddContract}
              className="flex-1 md:flex-none px-12 py-4 bg-aaa-blue text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-aaa-hover transition-all active:scale-95 flex items-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              Add Contract
            </button>
          </div>
        </div>
      </div>

      {library.length === 0 ? (
        <div className="py-40 text-center space-y-8 bg-aaa-bg/30 rounded-[40px] border-2 border-dashed border-aaa-border">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-premium flex items-center justify-center mx-auto mb-10 text-aaa-blue">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 12h14m-7 4h7" /></svg>
          </div>
          <div className="space-y-4">
            <h3 className="text-3xl font-black text-aaa-text tracking-tight">Your Archive is Empty</h3>
            <p className="text-aaa-muted max-w-md mx-auto font-medium">Start your first automated contract analysis to see your records appear here for permanent storage.</p>
          </div>
          <button
            onClick={handleAddContract}
            className="px-12 py-5 bg-aaa-blue text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-aaa-hover transition-all transform hover:-translate-y-1 flex items-center gap-3 mx-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            Add Contract
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {library
            .filter(c => c.name.toLowerCase().includes(librarySearchQuery.toLowerCase()))
            .map(c => (
              <div key={c.id} onClick={() => handleSelectContract(c)} className={`group bg-white p-10 rounded-3xl border shadow-premium cursor-pointer transition-all relative flex flex-col hover:-translate-y-1 ${activeContractId === c.id ? 'border-aaa-blue ring-2 ring-aaa-blue/10' : 'border-aaa-border hover:border-aaa-blue'}`}>
                <div className="flex justify-between items-start mb-8">
                  <h4 className="text-3xl font-black text-aaa-text truncate tracking-tighter pr-16">{c.name}</h4>
                  <div className="flex gap-2 absolute top-8 right-8">
                    <button onClick={(e) => handleExportContract(e, c)} title="Export to PC" className="p-2.5 bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                    <button onClick={(e) => handleRenameArchive(e, c)} className="p-2.5 bg-aaa-bg text-aaa-muted hover:text-aaa-blue hover:bg-aaa-blue/10 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button
                      onClick={(e) => handleDeleteArchive(e, c.id)}
                      className={`p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all shadow-sm ${isAdmin() ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      title="Delete Project"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <div className="mt-auto pt-8 border-t border-aaa-border flex justify-between items-center text-[10px] font-black uppercase text-aaa-muted tracking-widest">
                  <span>{new Date(c.timestamp).toLocaleDateString()}</span>
                  <span className="px-3 py-1 bg-aaa-bg rounded-lg text-aaa-blue">{c.clauses?.length || c.metadata?.totalClauses || 0} Nodes</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
