import React from 'react';
import toast from 'react-hot-toast';
import {
  AnalysisStatus,
} from '@/types';
import { useAppStore } from '@/store/useAppStore';
import {
  saveOrganizerData,
  saveContractToSupabase,
} from '@/services/supabaseService';

const ContractOrganizer = React.lazy(() => import('@/components/ContractOrganizer').then(m => ({ default: m.ContractOrganizer })));

export const OrganizerView: React.FC = () => {
  const {
    contract,
    setContract,
    organizerSubfolders,
    setOrganizerSubfolders,
    organizerSchemas,
    setOrganizerSchemas,
    organizerExtractedData,
    setOrganizerExtractedData,
    setStatus,
    setLibrary,
  } = useAppStore();

  const handleSaveAll = async (data: any, silent = false) => {
    console.log('Save All triggered:', { ...data, silent });

    // Update local state first for responsiveness
    if (data.subfolders) setOrganizerSubfolders(data.subfolders);
    if (data.schemas) setOrganizerSchemas(data.schemas);
    if (data.extractedData) setOrganizerExtractedData(data.extractedData);

    // Persist to Supabase
    try {
      // The contract to save is either the new one from organizer or current state
      const contractToSave = data.contract || contract;
      const targetContractId = contractToSave?.id;

      if (!targetContractId) {
        throw new Error("No contract available to save. Please initialize a contract first.");
      }

      // 1. ALWAYS ensure the contract record exists in the DB first (Foreign Key requirement)
      try {
        if (!silent) console.log('Ensuring contract record is archived...', targetContractId);
        // If it's a new contract from organizer, update global state first
        if (data.contract) {
          setContract(data.contract);
          setLibrary(prev => [data.contract!, ...prev.filter(c => c.id !== data.contract!.id)]);
        }

        // Use silent save if requested
        if (contractToSave) {
          const savedContract = await saveContractToSupabase(contractToSave);
          setContract(savedContract);
          setLibrary(prev => prev.filter(c => c.id !== contract?.id));
        }
        if (!silent) console.log('Contract record verified/saved in archive');
      } catch (contractError: any) {
        console.error('CRITICAL: Failed to save parent contract record:', contractError);
        throw new Error(`Archive Error: ${contractError.message}. We cannot save organizer data without the contract record.`);
      }

      // 2. Save organizer data (depends on contract record)
      if (!silent) console.log('Attempting to save organizer data for contract:', targetContractId);
      await saveOrganizerData(targetContractId, {
        subfolders: data.subfolders,
        schemas: data.schemas,
        extractedData: data.extractedData
      });

      if (!silent) toast.success('All changes successfully saved to database!');
    } catch (error: any) {
      console.error('Full save operation failed:', error);
      if (!silent) toast.error(error.message || 'An unexpected error occurred during save');
      throw error; // Rethrow to update UI state in ContractOrganizer
    }
  };

  return (
    <div className="h-[calc(100vh-140px)]">
      <React.Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-aaa-blue border-t-transparent rounded-full animate-spin" /><p className="text-xs font-black uppercase tracking-[0.3em]">Opening Contract Structure...</p></div>}>
        <ContractOrganizer
          contract={contract}
          subfolders={organizerSubfolders}
          schemas={organizerSchemas}
          extractedData={organizerExtractedData}
          onUpdateSubfolders={setOrganizerSubfolders}
          onUpdateSchemas={setOrganizerSchemas}
          onUpdateExtractedData={setOrganizerExtractedData}
          onClose={() => setStatus(AnalysisStatus.COMPLETED)}
          onSaveAll={handleSaveAll}
        />
      </React.Suspense>
    </div>
  );
};
