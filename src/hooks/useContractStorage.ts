/**
 * useContractStorage.ts
 *
 * Custom hook that encapsulates all contract persistence logic:
 * - localStorage draft backup (auto-save & restore)
 * - Library loading (metadata-only for speed)
 * - Debounced contract save to local DB
 * - Supabase save (for cloud sync)
 * - Import / Export / Delete contract archives
 * - Organizer data loading per active contract
 *
 * Extracted from App.tsx to improve separation of concerns.
 */

import { useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { saveContractToDB, getAllContracts, deleteContractFromDB } from '@/services/dbService';
import { saveContractToSupabase, saveOrganizerData, getOrganizerData, getContractFromSupabase } from '@/services/supabaseService';
import { ensureContractHasSections, getAllClausesFromContract } from '@/services/contractMigrationService';
import { Clause, SavedContract, FolderSchemaField, AnalysisStatus } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { reprocessClauseLinks, getClausesWithProcessedLinks } from '@/utils/contractUtils';

export function useContractStorage() {
  const {
    clauses, setClauses,
    contract, setContract,
    projectName, setProjectName,
    activeContractId, setActiveContractId,
    setIsSaving, setSaveStatus,
    library, setLibrary,
    hasDraft, setHasDraft,
    setStatus,
    setOrganizerSubfolders,
    setOrganizerSchemas,
    setOrganizerExtractedData,
  } = useAppStore();

  // Debounce refs (stable across renders, do not trigger re-renders)
  const saveTimeoutRef  = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef  = useRef<{ clauses?: Clause[]; name?: string } | null>(null);

  // ---------------------------------------------------------------------------
  // LIBRARY
  // ---------------------------------------------------------------------------

  /** Fetches contract metadata from DB and populates the library store. */
  const refreshLibrary = async () => {
    try {
      const contracts = await getAllContracts({ metadataOnly: true });
      setLibrary(contracts || []);
    } catch (err: any) {
      console.error('Library load failed:', err?.message);
      setLibrary([]);
    }
  };

  /** Loads a full contract by ID and sets it as active. */
  const loadContract = useCallback(async (id: string) => {
    try {
      const fullContract = await getContractFromSupabase(id);
      if (fullContract) {
        setContract(fullContract);
        const processedClauses = getClausesWithProcessedLinks(fullContract);
        setClauses(processedClauses);
        setActiveContractId(id);
        setProjectName(fullContract.name);
        setStatus(AnalysisStatus.COMPLETED);
        
        // Also load organizer data
        await loadOrganizerData(id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to load contract:', err);
      return false;
    }
  }, [setContract, setClauses, setActiveContractId, setProjectName, setStatus]);

  // ---------------------------------------------------------------------------
  // ORGANIZER DATA
  // ---------------------------------------------------------------------------

  /**
   * Loads organizer data (subfolders, schemas, extractedData) for the given
   * contract ID and pushes the result into the Zustand store.
   */
  const loadOrganizerData = async (contractId: string | null) => {
    if (!contractId) {
      setOrganizerSubfolders([]);
      setOrganizerSchemas({});
      setOrganizerExtractedData([]);
      return;
    }

    try {
      const data = await getOrganizerData(contractId);
      setOrganizerSubfolders(data.subfolders);

      const schemaMap: Record<string, FolderSchemaField[]> = {};
      data.schemas.forEach(field => {
        if (!schemaMap[field.subfolder_id]) schemaMap[field.subfolder_id] = [];
        schemaMap[field.subfolder_id].push(field);
      });
      setOrganizerSchemas(schemaMap);
      setOrganizerExtractedData(data.extractedData);
    } catch (err) {
      console.error('Failed to fetch organizer data:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // DRAFT (localStorage backup)
  // ---------------------------------------------------------------------------

  /** Clears the auto-saved draft from localStorage. */
  const clearDraft = () => {
    localStorage.removeItem('aaa_contract_draft');
    setHasDraft(false);
  };

  /** Restores the last auto-saved draft from localStorage. */
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
      toast.error('Failed to restore draft');
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE TO LOCAL DB (debounced)
  // ---------------------------------------------------------------------------

  /**
   * Internal: performs the actual DB save (local SQLite via dbService).
   * @param silent - if true, suppresses toast notifications and loading states.
   */
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
          totalClauses:       targetClauses.length,
          generalCount:       targetClauses.filter(c => c.condition_type === 'General').length,
          particularCount:    targetClauses.filter(c => c.condition_type === 'Particular').length,
          highRiskCount:      0,
          conflictCount:      targetClauses.filter(c => c.comparison && c.comparison.length > 0).length,
          timeSensitiveCount: targetClauses.filter(c => c.time_frames && c.time_frames.length > 0).length,
        },
      });

      const savedContract = await saveContractToDB(contractWithSections);
      clearDraft();
      setContract(savedContract);
      if (!activeContractId) setActiveContractId(targetId);
      await refreshLibrary();
      if (!silent) toast.success('Contract saved successfully!');
    } catch (err) {
      console.error('Save failed:', err);
      if (!silent) toast.error('Failed to save changes');
    } finally {
      if (!silent) {
        setTimeout(() => setIsSaving(false), 800);
      } else {
        setIsSaving(false);
      }
    }
  };

  /**
   * Saves the current clauses to the local DB with a 1-second debounce.
   * Pass `immediate: true` to skip the debounce (e.g. right after AI analysis).
   */
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

  // ---------------------------------------------------------------------------
  // SAVE TO SUPABASE (cloud sync)
  // ---------------------------------------------------------------------------

  /**
   * Saves a full `SavedContract` object to Supabase.
   * Used for real-time cloud sync after every clause edit.
   */
  const performSaveContract = async (
    targetContract: SavedContract,
    silent: boolean = false,
  ): Promise<SavedContract> => {
    if (!silent) {
      setIsSaving(true);
      setSaveStatus('idle');
    }
    try {
      const savedContract = await saveContractToSupabase(targetContract);
      setContract(savedContract);
      await refreshLibrary();
      if (!silent) {
        toast.success('Changes saved successfully!');
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
      return savedContract;
    } catch (err: any) {
      console.error('Save to Supabase failed:', err);
      if (!silent) {
        toast.error(`Failed to save: ${err.message}`);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
      throw err;
    } finally {
      if (!silent) {
        setTimeout(() => setIsSaving(false), 800);
      } else {
        setIsSaving(false);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // ARCHIVE MANAGEMENT (Library view handlers)
  // ---------------------------------------------------------------------------

  /** Renames a contract in the DB and refreshes the library. */
  const handleRenameArchive = async (e: React.MouseEvent, contractToRename: SavedContract) => {
    e.stopPropagation();
    const newName = prompt('Enter new project name:', contractToRename.name);
    if (newName && newName.trim() !== '' && newName !== contractToRename.name) {
      const updated = { ...contractToRename, name: newName.trim() };
      await saveContractToDB(updated);
      await refreshLibrary();
      if (activeContractId === contractToRename.id) setProjectName(updated.name);
    }
  };

  /** Deletes a contract from the DB, refreshes library, and resets state if it was active. */
  const handleDeleteArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Permanently delete this project from archive?')) return;

    try {
      await deleteContractFromDB(id);
      await refreshLibrary();
      if (activeContractId === id) {
        setStatus(AnalysisStatus.IDLE);
        setActiveContractId(null);
        setClauses([]);
        localStorage.removeItem('aaa_active_contract_id');
      }
      toast.success('Contract deleted successfully!');
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error(`Error: ${err?.message || 'Failed to delete contract.'}`);
    }
  };

  /** Downloads a contract as a JSON backup file. */
  const handleExportContract = (e: React.MouseEvent, contractToExport: SavedContract) => {
    e.stopPropagation();
    const dataStr  = JSON.stringify(contractToExport, null, 2);
    const blob     = new Blob([dataStr], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const link     = document.createElement('a');
    const fileName = `${contractToExport.name.replace(/[^a-z0-9]/gi, '_')}_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Handles importing a contract from a JSON backup file.
   * Assigns a new ID to avoid collisions and immediately loads it.
   */
  const handleImportBackup = (
    e: React.ChangeEvent<HTMLInputElement>,
    importBackupInputRef: React.RefObject<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') return;

        const importedData = JSON.parse(content) as SavedContract;
        if (!importedData.clauses || !Array.isArray(importedData.clauses)) {
          throw new Error('Invalid backup format: missing clauses ledger.');
        }

        const newId              = crypto.randomUUID();
        const contractToSave: SavedContract = {
          ...importedData,
          id:        newId,
          timestamp: Date.now(),
        };

        const contractWithSections = ensureContractHasSections(contractToSave);
        await saveContractToDB(contractWithSections);
        await refreshLibrary();

        const allClauses      = getAllClausesFromContract(contractWithSections);
        const reprocessed     = reprocessClauseLinks(allClauses);
        setContract(contractWithSections);
        setClauses(reprocessed);
        setProjectName(contractWithSections.name);
        setActiveContractId(newId);
        setStatus(AnalysisStatus.COMPLETED);

        if (importBackupInputRef.current) importBackupInputRef.current.value = '';
      } catch (err: any) {
        toast.error('Failed to import backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  /** Clears the debounce save timer. Call this in a useEffect cleanup. */
  const cleanupSaveTimer = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  };

  return {
    // Library
    refreshLibrary,
    loadContract,
    // Organizer
    loadOrganizerData,
    // Draft
    clearDraft,
    restoreDraft,
    // Save
    persistCurrentProject,
    performSave,
    performSaveContract,
    // Archive CRUD
    handleRenameArchive,
    handleDeleteArchive,
    handleExportContract,
    handleImportBackup,
    // Cleanup
    cleanupSaveTimer,
  };
}
