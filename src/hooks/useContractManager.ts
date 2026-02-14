/**
 * useContractManager — Extracted from App.tsx
 * 
 * Handles all contract CRUD operations:
 * - Loading/saving contracts
 * - Library management (refresh, rename, delete, export, import)
 * - Debounced auto-save
 */

import React, { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Clause, SavedContract, SectionType, ConditionType, ItemType } from '@/types';
import { saveContractToDB, getAllContracts, deleteContractFromDB } from '@/services/dbService';
import {
    ensureContractHasSections,
    getAllClausesFromContract,
    clauseToSectionItem,
    sectionItemToClause,
} from '@/services/contractMigrationService';
import { reprocessClauseLinks } from '../utils/clauseLinks';

export interface ContractManagerState {
    contract: SavedContract | null;
    clauses: Clause[];
    library: SavedContract[];
    projectName: string;
    activeContractId: string | null;
    isSaving: boolean;
    showContractSelector: boolean;
}

export function useContractManager() {
    const [contract, setContract] = useState<SavedContract | null>(null);
    const [clauses, setClauses] = useState<Clause[]>([]);
    const [library, setLibrary] = useState<SavedContract[]>([]);
    const [projectName, setProjectName] = useState('');
    const [activeContractId, setActiveContractId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showContractSelector, setShowContractSelector] = useState(false);

    // Debounce timer ref for auto-save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingSaveRef = useRef<{ clauses?: Clause[]; name?: string } | null>(null);

    // ── Library ──────────────────────────────────────────────

    const refreshLibrary = useCallback(async () => {
        try {
            const contracts = await getAllContracts();
            setLibrary(contracts || []);
        } catch (err: any) {
            console.error('Library load failed:', err);
            setLibrary([]);
        }
    }, []);

    // ── Save helpers ─────────────────────────────────────────

    const performSave = useCallback(
        async (targetClauses: Clause[], targetName: string, targetId: string) => {
            setIsSaving(true);
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
                        highRiskCount: 0,
                        conflictCount: targetClauses.filter(c => c.comparison && c.comparison.length > 0).length,
                        timeSensitiveCount: targetClauses.filter(c => c.time_frames && c.time_frames.length > 0).length,
                    },
                });

                await saveContractToDB(contractWithSections);
                setContract(contractWithSections);
                setActiveContractId(prev => prev || targetId);
                await refreshLibrary();
                toast.success('Contract saved successfully!');
            } catch (err) {
                console.error('Save failed:', err);
            } finally {
                setTimeout(() => setIsSaving(false), 800);
            }
        },
        [refreshLibrary]
    );

    const persistCurrentProject = useCallback(
        async (newClauses?: Clause[], newName?: string, immediate = false) => {
            const targetClauses = newClauses || clauses;
            const targetName = (newName || projectName).trim() || 'Untitled Project';
            const targetId = activeContractId || crypto.randomUUID();
            if (targetClauses.length === 0) return;

            pendingSaveRef.current = { clauses: targetClauses, name: targetName };

            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

            if (immediate) {
                await performSave(targetClauses, targetName, targetId);
                return;
            }

            // Debounce: batch rapid changes
            saveTimeoutRef.current = setTimeout(async () => {
                const pending = pendingSaveRef.current;
                if (pending) {
                    await performSave(pending.clauses || clauses, pending.name || projectName, targetId);
                    pendingSaveRef.current = null;
                }
            }, 1000);
        },
        [clauses, projectName, activeContractId, performSave]
    );

    const performSaveContract = useCallback(
        async (targetContract: SavedContract) => {
            setIsSaving(true);
            try {
                const contractWithSections = ensureContractHasSections(targetContract);
                if (!contractWithSections.id) {
                    contractWithSections.id = activeContractId || crypto.randomUUID();
                }

                await saveContractToDB(contractWithSections);
                setContract(contractWithSections);
                const allClauses = getAllClausesFromContract(contractWithSections);
                setClauses(reprocessClauseLinks(allClauses));
                setActiveContractId(prev => prev || contractWithSections.id);
                await refreshLibrary();
            } catch (err) {
                console.error('Save failed:', err);
                toast.error(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
            } finally {
                setTimeout(() => setIsSaving(false), 800);
            }
        },
        [activeContractId, refreshLibrary]
    );

    // ── Archive operations ───────────────────────────────────

    const handleRenameArchive = useCallback(
        async (e: React.MouseEvent, contractItem: SavedContract) => {
            e.stopPropagation();
            const newName = prompt('Enter new project name:', contractItem.name);
            if (newName && newName.trim() !== '' && newName !== contractItem.name) {
                const updated = { ...contractItem, name: newName.trim() };
                await saveContractToDB(updated);
                await refreshLibrary();
                if (activeContractId === contractItem.id) setProjectName(updated.name);
            }
        },
        [activeContractId, refreshLibrary]
    );

    const handleDeleteArchive = useCallback(
        async (e: React.MouseEvent, id: string) => {
            e.stopPropagation();
            if (!confirm('Permanently delete this project from archive?')) return;
            try {
                await deleteContractFromDB(id);
                await refreshLibrary();
                if (activeContractId === id) {
                    setActiveContractId(null);
                    setClauses([]);
                    setContract(null);
                    setProjectName('');
                    localStorage.removeItem('aaa_active_contract_id');
                }
                toast.success('Contract deleted successfully!');
            } catch (err: any) {
                toast.error(`Error: ${err?.message || 'Failed to delete contract'}`);
            }
        },
        [activeContractId, refreshLibrary]
    );

    const handleExportContract = useCallback((e: React.MouseEvent, contractItem: SavedContract) => {
        e.stopPropagation();
        const dataStr = JSON.stringify(contractItem, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${contractItem.name.replace(/[^a-z0-9]/gi, '_')}_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, []);

    const handleImportBackup = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const content = event.target?.result;
                    if (typeof content !== 'string') return;

                    const importedData = JSON.parse(content) as SavedContract;
                    if (!importedData.clauses || !Array.isArray(importedData.clauses)) {
                        throw new Error('Invalid backup format: missing clauses ledger.');
                    }

                    const newId = crypto.randomUUID();
                    const contractToSave: SavedContract = { ...importedData, id: newId, timestamp: Date.now() };
                    const contractWithSections = ensureContractHasSections(contractToSave);
                    await saveContractToDB(contractWithSections);
                    await refreshLibrary();

                    const allClauses = getAllClausesFromContract(contractWithSections);
                    setContract(contractWithSections);
                    setClauses(reprocessClauseLinks(allClauses));
                    setProjectName(contractWithSections.name);
                    setActiveContractId(newId);
                } catch (err: any) {
                    toast.error('Failed to import backup: ' + err.message);
                }
            };
            reader.readAsText(file);
        },
        [refreshLibrary]
    );

    // ── Cleanup ──────────────────────────────────────────────

    const cleanup = useCallback(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    }, []);

    return {
        // State
        contract,
        clauses,
        library,
        projectName,
        activeContractId,
        isSaving,
        showContractSelector,
        // Setters
        setContract,
        setClauses,
        setLibrary,
        setProjectName,
        setActiveContractId,
        setShowContractSelector,
        // Actions
        refreshLibrary,
        persistCurrentProject,
        performSave,
        performSaveContract,
        handleRenameArchive,
        handleDeleteArchive,
        handleExportContract,
        handleImportBackup,
        cleanup,
    };
}
