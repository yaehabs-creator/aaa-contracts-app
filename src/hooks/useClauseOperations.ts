/**
 * useClauseOperations — Extracted from App.tsx
 * 
 * Handles clause-level CRUD operations:
 * - Update clause (from card or modal)
 * - Add new clause
 * - Delete clause
 * - Reorder clauses
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Clause, SavedContract, SectionType, ConditionType, ItemType } from '../../types';
import {
    ensureContractHasSections,
    getAllClausesFromContract,
    clauseToSectionItem,
    sectionItemToClause,
} from '../../services/contractMigrationService';
import { reprocessClauseLinks, linkifyText } from '../utils/clauseLinks';
import { normalizeClauseId } from '../utils/navigation';

interface UseClauseOperationsProps {
    contract: SavedContract | null;
    clauses: Clause[];
    setContract: (c: SavedContract | null) => void;
    setClauses: (c: Clause[]) => void;
    performSaveContract: (c: SavedContract) => Promise<void>;
    persistCurrentProject: (clauses?: Clause[], name?: string, immediate?: boolean) => Promise<void>;
}

export function useClauseOperations({
    contract,
    clauses,
    setContract,
    setClauses,
    performSaveContract,
    persistCurrentProject,
}: UseClauseOperationsProps) {
    const [compareClause, setCompareClause] = useState<Clause | null>(null);
    const [editingClause, setEditingClause] = useState<Clause | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // ── Update clause (inline edit) ──────────────────────────

    const handleUpdateClause = useCallback(
        (updatedClause: Clause) => {
            if (contract) {
                const contractWithSections = ensureContractHasSections(contract);
                const sectionType =
                    updatedClause.condition_type === 'General' ? SectionType.GENERAL : SectionType.PARTICULAR;
                const section = contractWithSections.sections?.find(s => s.sectionType === sectionType);

                if (section) {
                    const itemIndex = section.items.findIndex(
                        item =>
                            item.itemType === ItemType.CLAUSE &&
                            item.clause_number === updatedClause.clause_number &&
                            item.condition_type === updatedClause.condition_type
                    );

                    if (itemIndex >= 0) {
                        const updatedItem = clauseToSectionItem(updatedClause, section.items[itemIndex].orderIndex);
                        const updatedItems = [...section.items];
                        updatedItems[itemIndex] = updatedItem;

                        const updatedSections = contractWithSections.sections!.map(s =>
                            s.sectionType === sectionType ? { ...s, items: updatedItems } : s
                        );

                        const updatedContract: SavedContract = {
                            ...contractWithSections,
                            sections: updatedSections,
                            clauses: getAllClausesFromContract({ ...contractWithSections, sections: updatedSections }),
                        };

                        setContract(updatedContract);
                        setClauses(reprocessClauseLinks(updatedContract.clauses || []));
                        if (compareClause?.clause_number === updatedClause.clause_number) {
                            setCompareClause(updatedClause);
                        }
                        performSaveContract(updatedContract);
                        return;
                    }
                }
            }

            // Fallback: update clauses array directly
            const updatedClauses = clauses.map(c =>
                c.clause_number === updatedClause.clause_number && c.condition_type === updatedClause.condition_type
                    ? updatedClause
                    : c
            );
            setClauses(updatedClauses);
            if (compareClause?.clause_number === updatedClause.clause_number) {
                setCompareClause(updatedClause);
            }
            persistCurrentProject(updatedClauses);
        },
        [contract, clauses, compareClause, setContract, setClauses, performSaveContract, persistCurrentProject]
    );

    // ── Edit clause from modal ───────────────────────────────

    const handleEditClause = useCallback((clause: Clause) => {
        setEditingClause(clause);
        setIsAddModalOpen(true);
    }, []);

    const handleUpdateClauseFromModal = useCallback(
        async (data: { number: string; title: string; generalText: string; particularText: string; contractId: string }) => {
            if (!editingClause || !contract) return;

            const availableClauseIds = new Set<string>(
                (clauses || []).map(c => normalizeClauseId(c.clause_number))
            );
            availableClauseIds.add(normalizeClauseId(data.number));

            await new Promise(resolve => setTimeout(resolve, 600));
            const conditionType: ConditionType = data.particularText.trim() ? 'Particular' : 'General';
            const updatedClause: Clause = {
                ...editingClause,
                clause_number: data.number,
                clause_title: data.title || 'Untitled Clause',
                clause_text: linkifyText(data.particularText || data.generalText, availableClauseIds),
                condition_type: conditionType,
                general_condition: data.generalText.trim() ? linkifyText(data.generalText, availableClauseIds) : undefined,
                particular_condition: data.particularText.trim() ? linkifyText(data.particularText, availableClauseIds) : undefined,
            };

            const contractWithSections = ensureContractHasSections(contract);
            const sectionType = conditionType === 'General' ? SectionType.GENERAL : SectionType.PARTICULAR;
            const section = contractWithSections.sections?.find(s => s.sectionType === sectionType);

            if (section) {
                const itemIndex = section.items.findIndex(
                    item =>
                        item.itemType === ItemType.CLAUSE &&
                        item.clause_number === editingClause.clause_number &&
                        item.condition_type === editingClause.condition_type
                );

                if (itemIndex >= 0) {
                    const updatedItem = clauseToSectionItem(updatedClause, section.items[itemIndex].orderIndex);
                    const updatedItems = [...section.items];
                    updatedItems[itemIndex] = updatedItem;

                    const updatedSections = contractWithSections.sections!.map(s =>
                        s.sectionType === sectionType ? { ...s, items: updatedItems } : s
                    );

                    const updatedContract: SavedContract = {
                        ...contractWithSections,
                        sections: updatedSections,
                        clauses: getAllClausesFromContract({ ...contractWithSections, sections: updatedSections }),
                    };

                    setContract(updatedContract);
                    setClauses(reprocessClauseLinks(updatedContract.clauses || []));
                    await performSaveContract(updatedContract);
                    setEditingClause(updatedClause);
                }
            }
        },
        [editingClause, contract, clauses, setContract, setClauses, performSaveContract]
    );

    // ── Delete clause ────────────────────────────────────────

    const handleDeleteClause = useCallback(
        async (index: number, sectionType?: SectionType) => {
            if (!contract) return;
            if (!confirm('Permanently remove this clause node?')) return;

            const contractWithSections = ensureContractHasSections(contract);

            const deleteFromSection = (targetSectionType: SectionType, targetIndex: number) => {
                const section = contractWithSections.sections?.find(s => s.sectionType === targetSectionType);
                if (!section) return null;

                const updatedItems = section.items.filter((_, i) => i !== targetIndex);
                updatedItems.forEach((item, i) => { item.orderIndex = i; });

                const updatedSections = contractWithSections.sections!.map(s =>
                    s.sectionType === targetSectionType ? { ...s, items: updatedItems } : s
                );

                return {
                    ...contractWithSections,
                    sections: updatedSections,
                    clauses: getAllClausesFromContract({ ...contractWithSections, sections: updatedSections }),
                } as SavedContract;
            };

            let updatedContract: SavedContract | null = null;

            if (sectionType) {
                updatedContract = deleteFromSection(sectionType, index);
            } else {
                // Legacy: find clause by index and delete from appropriate section
                const clause = clauses[index];
                if (clause) {
                    const targetSectionType = clause.condition_type === 'General' ? SectionType.GENERAL : SectionType.PARTICULAR;
                    const section = contractWithSections.sections?.find(s => s.sectionType === targetSectionType);
                    if (section) {
                        const itemIndex = section.items.findIndex(
                            item =>
                                item.itemType === ItemType.CLAUSE &&
                                item.clause_number === clause.clause_number &&
                                item.condition_type === clause.condition_type
                        );
                        if (itemIndex >= 0) {
                            updatedContract = deleteFromSection(targetSectionType, itemIndex);
                        }
                    }
                }
            }

            if (updatedContract) {
                setContract(updatedContract);
                setClauses(reprocessClauseLinks(updatedContract.clauses || []));
                await performSaveContract(updatedContract);
            }
        },
        [contract, clauses, setContract, setClauses, performSaveContract]
    );

    // ── Reorder clauses ──────────────────────────────────────

    const handleReorder = useCallback(
        async (fromIndex: number, toIndex: number, sectionType?: SectionType) => {
            if (!contract) return;

            const contractWithSections = ensureContractHasSections(contract);

            if (sectionType) {
                const section = contractWithSections.sections?.find(s => s.sectionType === sectionType);
                if (!section) return;

                const updatedItems = [...section.items];
                const [moved] = updatedItems.splice(fromIndex, 1);
                updatedItems.splice(toIndex, 0, moved);
                updatedItems.forEach((item, i) => { item.orderIndex = i; });

                const updatedSections = contractWithSections.sections!.map(s =>
                    s.sectionType === sectionType ? { ...s, items: updatedItems } : s
                );

                const updatedContract: SavedContract = {
                    ...contractWithSections,
                    sections: updatedSections,
                    clauses: getAllClausesFromContract({ ...contractWithSections, sections: updatedSections }),
                };

                setContract(updatedContract);
                setClauses(reprocessClauseLinks(updatedContract.clauses || []));
                await performSaveContract(updatedContract);
            }
        },
        [contract, setContract, setClauses, performSaveContract]
    );

    // ── Navigate to clause ───────────────────────────────────

    const onOpenClause = useCallback(
        (clauseNumber: string) => {
            const clause = clauses.find(c => c.clause_number === clauseNumber);
            if (clause) setCompareClause(clause);
        },
        [clauses]
    );

    const handleClausesUpdateFromCategory = useCallback(
        (updatedClauses: Clause[]) => {
            setClauses(updatedClauses);
            persistCurrentProject(updatedClauses);
        },
        [setClauses, persistCurrentProject]
    );

    return {
        // State
        compareClause,
        editingClause,
        isAddModalOpen,
        // Setters
        setCompareClause,
        setEditingClause,
        setIsAddModalOpen,
        // Actions
        handleUpdateClause,
        handleEditClause,
        handleUpdateClauseFromModal,
        handleDeleteClause,
        handleReorder,
        onOpenClause,
        handleClausesUpdateFromCategory,
    };
}
