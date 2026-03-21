
import React from 'react';
import toast from 'react-hot-toast';
import {
  AnalysisStatus,
} from '@/types';
import { useAppStore } from '@/store/useAppStore';
import {
  saveOrganizerData,
} from '@/services/supabaseService';
import { saveContractToDB } from '@/services/dbService';

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
    // Update local state first for responsiveness
    if (data.subfolders) setOrganizerSubfolders(data.subfolders);
    if (data.schemas) setOrganizerSchemas(data.schemas);
    if (data.extractedData) setOrganizerExtractedData(data.extractedData);

    try {
      const contractToSave = data.contract || contract;
      const targetContractId = contractToSave?.id;

      if (!targetContractId) {
        throw new Error("No contract available to save.");
      }

      // 1. Save to local Database folder
      if (contractToSave) {
          const savedContract = await saveContractToDB(contractToSave);
          setContract(savedContract);
          setLibrary(prev => [savedContract, ...prev.filter(c => c.id !== savedContract.id)]);
      }

      // 2. Save organizer metadata (currently mocked)
      await saveOrganizerData(targetContractId, {
        subfolders: data.subfolders,
        schemas: data.schemas,
        extractedData: data.extractedData
      });

      if (!silent) toast.success('Changes saved locally');
    } catch (error: any) {
      console.error('Save failed:', error);
      if (!silent) toast.error(error.message || 'Error during save');
      throw error;
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
