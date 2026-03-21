
/**
 * useContractStorage.ts
 *
 * Custom hook that encapsulates all contract persistence logic:
 * - localStorage draft backup (auto-save & restore)
 * - Library loading (local IndexedDB)
 * - Debounced contract save to local DB
 * - Import / Export / Delete contract archives
 *
 * Supabase cloud sync has been removed to simplify local usage.
 */

import { useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { saveContractToDB, getAllContracts, deleteContractFromDB, db } from '@/services/dbService';
import { ensureContractHasSections } from '@/services/contractMigrationService';
import { Clause, SavedContract, AnalysisStatus } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { getClausesWithProcessedLinks } from '@/utils/contractUtils';

export function useContractStorage() {
  const {
    clauses, setClauses,
    contract, setContract,
    projectName, setProjectName,
    activeContractId, setActiveContractId,
    setIsSaving, setSaveStatus,
    setLibrary,
    setHasDraft,
    setStatus,
    setOrganizerSubfolders,
    setOrganizerSchemas,
    setOrganizerExtractedData,
    setOrganizerLayout,
  } = useAppStore();

  // Debounce refs
  const saveTimeoutRef  = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef  = useRef<{ clauses?: Clause[]; name?: string } | null>(null);

  /** Fetches contract metadata from local IndexedDB. */
  const refreshLibrary = async () => {
    try {
      const contracts = await getAllContracts({ metadataOnly: true });
      setLibrary(contracts || []);
    } catch (err: any) {
      console.error('Library load failed:', err?.message);
      setLibrary([]);
    }
  };

  /** Loads a full contract from local IndexedDB. */
  const loadContract = useCallback(async (id: string) => {
    try {
      const fullContract = await db.contracts.get(id);
      if (fullContract) {
        setContract(fullContract);
        const processedClauses = getClausesWithProcessedLinks(fullContract);
        setClauses(processedClauses);
        setActiveContractId(id);
        setProjectName(fullContract.name);
        setStatus(AnalysisStatus.COMPLETED);
        
        // Mocked organizer data cleanup
        setOrganizerSubfolders([]);
        setOrganizerSchemas({});
        setOrganizerExtractedData([]);
        setOrganizerLayout([]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to load contract:', err);
      return false;
    }
  }, [setContract, setClauses, setActiveContractId, setProjectName, setStatus]);

  /** Localized organizer data loading (mocked as Supabase is removed) */
  const loadOrganizerData = async (contractId: string | null) => {
    setOrganizerSubfolders([]);
    setOrganizerSchemas({});
    setOrganizerExtractedData([]);
    setOrganizerLayout([]);
  };

  const clearDraft = () => {
    localStorage.removeItem('aaa_contract_draft');
    setHasDraft(false);
  };

  const restoreDraft = () => {
    const draftJson = localStorage.getItem('aaa_contract_draft');
    if (!draftJson) return;

    try {
      const parsedDraft = JSON.parse(draftJson) as SavedContract;
      setContract(parsedDraft);
      setClauses(getClausesWithProcessedLinks(parsedDraft));
      if (parsedDraft.id) setActiveContractId(parsedDraft.id);
      setStatus(AnalysisStatus.COMPLETED);
      toast.success('Unsaved progress restored');
      setHasDraft(false);
    } catch (err) {
      console.error('Failed to restore draft:', err);
    }
  };

  const performSave = async (
    targetClauses: Clause[],
    targetName: string,
    targetId: string,
    silent: boolean = false,
  ) => {
    if (!silent) setIsSaving(true);
    try {
      const contractWithSections = ensureContractHasSections({
        id: targetId,
        name: targetName,
        timestamp: Date.now(),
        clauses: targetClauses,
        metadata: {
          totalClauses: targetClauses.length,
          generalCount: targetClauses.filter(c => c.condition_type === 'General').length,
          particularCount: targetClauses.filter(c => c.condition_type === 'Particular').length,
        },
      });

      const savedContract = await saveContractToDB(contractWithSections);
      clearDraft();
      setContract(savedContract);
      if (!activeContractId) setActiveContractId(targetId);
      await refreshLibrary();
      if (!silent) toast.success('Saved to local matrix');
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const persistCurrentProject = async (
    newClauses?: Clause[],
    newName?: string,
    immediate: boolean = false,
  ) => {
    const targetClauses = newClauses || clauses;
    const targetName    = (newName || projectName).trim() || 'Untitled Project';
    const targetId      = activeContractId || crypto.randomUUID();
    if (targetClauses.length === 0) return;

    pendingSaveRef.current = { clauses: targetClauses, name: targetName };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (immediate) {
      await performSave(targetClauses, targetName, targetId, false);
      return;
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const pending = pendingSaveRef.current;
      if (pending) {
        await performSave(pending.clauses || clauses, pending.name || projectName, targetId, true);
        pendingSaveRef.current = null;
      }
    }, 1000);
  };

  /** Local-only save (replaces Supabase sink) */
  const performSaveContract = async (targetContract: SavedContract, silent: boolean = false) => {
    if (!silent) setIsSaving(true);
    try {
      const saved = await saveContractToDB(targetContract);
      setContract(saved);
      await refreshLibrary();
      if (!silent) toast.success('Changes synced locally');
      return saved;
    } catch (err) {
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleRenameArchive = async (e: React.MouseEvent, contractToRename: SavedContract) => {
    e.stopPropagation();
    const newName = prompt('Enter new project name:', contractToRename.name);
    if (newName && newName.trim() !== '') {
      const updated = { ...contractToRename, name: newName.trim() };
      await saveContractToDB(updated);
      await refreshLibrary();
    }
  };

  const handleDeleteArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this project locally?')) return;
    await deleteContractFromDB(id);
    await refreshLibrary();
    if (activeContractId === id) setStatus(AnalysisStatus.IDLE);
  };

  const handleExportContract = (e: React.MouseEvent, contractToExport: SavedContract) => {
    e.stopPropagation();
    const dataStr = JSON.stringify(contractToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${contractToExport.name}_Local_Backup.json`;
    link.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const importedData = JSON.parse(event.target?.result as string) as SavedContract;
        const newId = crypto.randomUUID();
        const saved = await saveContractToDB({ ...importedData, id: newId, timestamp: Date.now() });
        setContract(saved);
        setClauses(getClausesWithProcessedLinks(saved));
        setActiveContractId(newId);
        setStatus(AnalysisStatus.COMPLETED);
        refreshLibrary();
      } catch (err) {
        toast.error('Import failed');
      }
    };
    reader.readAsText(file);
  };

  const cleanupSaveTimer = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  };

  return {
    refreshLibrary,
    loadContract,
    loadOrganizerData,
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
  };
}
