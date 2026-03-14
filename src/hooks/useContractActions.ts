import { useState } from 'react';
import {
  ensureContractHasSections,
  getAllClausesFromContract,
  clauseToSectionItem,
  sectionItemToClause,
} from '@/services/contractMigrationService';
import { useAppStore } from '@/store/useAppStore';
import {
  Clause,
  SavedContract,
  ConditionType,
  SectionType,
  ItemType,
} from '@/types';
import { linkifyText, reprocessClauseLinks } from '@/utils/contractUtils';
import { normalizeClauseId } from '@/utils/navigation';

export function useContractActions(
  persistCurrentProject: (
    clauses?: Clause[],
    name?: string,
    immediate?: boolean,
  ) => Promise<void>,
  performSaveContract: (
    contract: SavedContract,
    silent?: boolean,
  ) => Promise<SavedContract>,
) {
  const {
    clauses,
    setClauses,
    contract,
    setContract,
    projectName,
    setActiveContractId,
    compareClause,
    setCompareClause,
    setIsAddModalOpen,
    setSelectedClauseForBot,
    setSelectedItemForBot,
    setIsBotOpen,
  } = useAppStore();

  const [editingClause, setEditingClause] = useState<Clause | null>(null);

  const handleUpdateClause = (updatedClause: Clause) => {
    if (contract) {
      const contractWithSections = ensureContractHasSections(contract);
      const sectionType =
        updatedClause.condition_type === 'General'
          ? SectionType.GENERAL
          : SectionType.PARTICULAR;
      const section = contractWithSections.sections?.find(
        (s) => s.sectionType === sectionType,
      );

      if (section) {
        const itemIndex = section.items.findIndex(
          (item) =>
            item.itemType === ItemType.CLAUSE &&
            item.clause_number === updatedClause.clause_number &&
            item.condition_type === updatedClause.condition_type,
        );

        if (itemIndex >= 0) {
          const updatedItem = clauseToSectionItem(
            updatedClause,
            section.items[itemIndex].orderIndex,
          );
          const updatedItems = [...section.items];
          updatedItems[itemIndex] = updatedItem;

          const updatedSections = contractWithSections.sections!.map((s) =>
            s.sectionType === sectionType ? { ...s, items: updatedItems } : s,
          );

          const updatedContract: SavedContract = {
            ...contractWithSections,
            sections: updatedSections,
            clauses: getAllClausesFromContract({
              ...contractWithSections,
              sections: updatedSections,
            }),
          };

          setContract(updatedContract);
          setClauses(reprocessClauseLinks(updatedContract.clauses || []));
          if (
            compareClause &&
            compareClause.clause_number === updatedClause.clause_number
          ) {
            setCompareClause(updatedClause);
          }
          performSaveContract(updatedContract);
          return;
        }
      }
    }

    // Fallback: update clauses array directly
    const updatedClauses = clauses.map((c) =>
      c.clause_number === updatedClause.clause_number &&
      c.condition_type === updatedClause.condition_type
        ? updatedClause
        : c,
    );
    setClauses(updatedClauses);
    if (
      compareClause &&
      compareClause.clause_number === updatedClause.clause_number
    ) {
      setCompareClause(updatedClause);
    }
    persistCurrentProject(updatedClauses);
  };

  const handleClausesUpdateFromCategory = (updatedClauses: Clause[]) => {
    setClauses(updatedClauses);
    persistCurrentProject(updatedClauses);
  };

  const onOpenClause = (clauseNumber: string) => {
    const clause = clauses.find((c) => c.clause_number === clauseNumber);
    if (clause) {
      setCompareClause(clause);
    }
  };

  const handleEditClause = (clause: Clause) => {
    setEditingClause(clause);
    setIsAddModalOpen(true);
  };

  const handleAskAI = (item: any) => {
    // If it's a clause, set both for safety but AIBotSidebar prioritizes selectedItem if we want
    if (item.itemType === ItemType.CLAUSE) {
      const clause = sectionItemToClause(item);
      setSelectedClauseForBot(clause);
      setSelectedItemForBot(null);
    } else if ((item as Clause).clause_number) {
      // It's a clause object
      setSelectedClauseForBot(item as Clause);
      setSelectedItemForBot(null);
    } else {
      // It's a SectionItem (Field, Paragraph, PDF)
      setSelectedItemForBot(item);
      setSelectedClauseForBot(null);
    }

    setIsBotOpen(true);
  };

  const handleUpdateClauseFromModal = async (data: {
    number: string;
    title: string;
    generalText: string;
    particularText: string;
    contractId: string;
  }) => {
    if (!editingClause || !contract) return;

    // Build Set of available clause IDs from current clauses
    const availableClauseIds = new Set<string>(
      (clauses || []).map((c) => normalizeClauseId(c.clause_number)),
    );
    // Also add the new/updated clause number
    availableClauseIds.add(normalizeClauseId(data.number));

    await new Promise((resolve) => setTimeout(resolve, 600));
    const conditionType: ConditionType = data.particularText.trim()
      ? 'Particular'
      : 'General';
    const updatedClause: Clause = {
      ...editingClause,
      clause_number: data.number,
      clause_title: data.title || 'Untitled Clause',
      clause_text: linkifyText(
        data.particularText || data.generalText,
        availableClauseIds,
      ),
      condition_type: conditionType,
      general_condition: data.generalText.trim()
        ? linkifyText(data.generalText, availableClauseIds)
        : undefined,
      particular_condition: data.particularText.trim()
        ? linkifyText(data.particularText, availableClauseIds)
        : undefined,
    };

    // Update in contract sections
    const contractWithSections = ensureContractHasSections(contract);
    const sectionType =
      conditionType === 'General' ? SectionType.GENERAL : SectionType.PARTICULAR;
    const section = contractWithSections.sections?.find(
      (s) => s.sectionType === sectionType,
    );

    if (section) {
      const itemIndex = section.items.findIndex(
        (item) =>
          item.itemType === ItemType.CLAUSE &&
          item.clause_number === editingClause.clause_number &&
          item.condition_type === editingClause.condition_type,
      );

      if (itemIndex >= 0) {
        const updatedItem = clauseToSectionItem(
          updatedClause,
          section.items[itemIndex].orderIndex,
        );
        const updatedItems = [...section.items];
        updatedItems[itemIndex] = updatedItem;

        const updatedSections = contractWithSections.sections!.map((s) =>
          s.sectionType === sectionType ? { ...s, items: updatedItems } : s,
        );

        const updatedContract: SavedContract = {
          ...contractWithSections,
          sections: updatedSections,
          clauses: getAllClausesFromContract({
            ...contractWithSections,
            sections: updatedSections,
          }),
        };

        setContract(updatedContract);
        setClauses(reprocessClauseLinks(updatedContract.clauses || []));
        await performSaveContract(updatedContract);

        // Update editingClause to reflect saved changes (keeps modal open)
        setEditingClause(updatedClause);
      }
    }
  };

  const handleSaveManualClause = async (data: {
    number: string;
    title: string;
    generalText: string;
    particularText: string;
    contractId: string;
  }) => {
    if (!contract) {
      // Create new contract if none exists
      const newId = crypto.randomUUID();
      const newContract = ensureContractHasSections({
        id: newId,
        name: projectName || 'Untitled Contract',
        timestamp: Date.now(),
        clauses: [],
        metadata: {
          totalClauses: 0,
          generalCount: 0,
          particularCount: 0,
          highRiskCount: 0,
          conflictCount: 0,
          timeSensitiveCount: 0,
        },
      });
      setContract(newContract);
      setActiveContractId(newId);
    }

    await new Promise((resolve) => setTimeout(resolve, 600));

    // Build Set of available clause IDs from current clauses
    const availableClauseIds = new Set<string>(
      (clauses || []).map((c) => normalizeClauseId(c.clause_number)),
    );
    // Also add the new clause number
    availableClauseIds.add(normalizeClauseId(data.number));

    const conditionType: ConditionType = data.particularText.trim()
      ? 'Particular'
      : 'General';
    const newClause: Clause = {
      clause_number: data.number,
      clause_title: data.title || 'Untitled Clause',
      clause_text: linkifyText(
        data.particularText || data.generalText,
        availableClauseIds,
      ),
      condition_type: conditionType,
      general_condition: data.generalText.trim()
        ? linkifyText(data.generalText, availableClauseIds)
        : undefined,
      particular_condition: data.particularText.trim()
        ? linkifyText(data.particularText, availableClauseIds)
        : undefined,
      comparison: [],
      time_frames: [],
    };

    const currentContract = ensureContractHasSections(contract!);
    const sectionType =
      conditionType === 'General' ? SectionType.GENERAL : SectionType.PARTICULAR;
    const section = currentContract.sections!.find(
      (s) => s.sectionType === sectionType,
    );

    if (!section) return;

    // Check for existing clause with same number and condition type
    const existingItemIndex = section.items.findIndex(
      (item) =>
        item.itemType === ItemType.CLAUSE &&
        item.clause_number === data.number &&
        item.condition_type === conditionType,
    );

    if (existingItemIndex >= 0 && existingItemIndex < section.items.length) {
      const existingItem = section.items[existingItemIndex];
      const existingClause = sectionItemToClause(existingItem);
      if (existingClause) {
        const shouldUpdate = confirm(
          `Clause ${data.number} (${conditionType}) already exists.\n\n` +
            `Existing: "${existingClause.clause_title}"\n` +
            `New: "${newClause.clause_title}"\n\n` +
            `Click OK to replace the existing clause, or Cancel to abort.`,
        );

        if (!shouldUpdate) {
          return; // User cancelled
        }

        // Replace existing clause
        const updatedItem = clauseToSectionItem(
          newClause,
          section.items[existingItemIndex].orderIndex,
        );
        const updatedItems = [...section.items];
        updatedItems[existingItemIndex] = updatedItem;

        const updatedSections = currentContract.sections!.map((s) =>
          s.sectionType === sectionType ? { ...s, items: updatedItems } : s,
        );

        const updatedContract: SavedContract = {
          ...currentContract,
          sections: updatedSections,
          clauses: getAllClausesFromContract({
            ...currentContract,
            sections: updatedSections,
          }),
        };

        setContract(updatedContract);
        setClauses(reprocessClauseLinks(updatedContract.clauses || []));
        await performSaveContract(updatedContract);
        return;
      }
    }

    // No duplicate found, add new clause
    const updatedItem = clauseToSectionItem(newClause, section.items.length);
    const updatedItems = [...section.items, updatedItem];

    const updatedSections = currentContract.sections!.map((s) =>
      s.sectionType === sectionType ? { ...s, items: updatedItems } : s,
    );

    const updatedContract: SavedContract = {
      ...currentContract,
      sections: updatedSections,
      clauses: getAllClausesFromContract({
        ...currentContract,
        sections: updatedSections,
      }),
    };

    setContract(updatedContract);
    setClauses(reprocessClauseLinks(updatedContract.clauses || []));
    await performSaveContract(updatedContract);
  };

  const handleDeleteClause = async (
    index: number,
    sectionType?: SectionType,
  ) => {
    if (!contract) return;

    if (confirm('Permanently remove this clause node?')) {
      const contractWithSections = ensureContractHasSections(contract);

      if (sectionType) {
        // Delete from specific section
        const section = contractWithSections.sections?.find(
          (s) => s.sectionType === sectionType,
        );
        if (section) {
          const updatedItems = section.items.filter((_, i) => i !== index);
          updatedItems.forEach((item, i) => {
            item.orderIndex = i;
          });

          const updatedSections = contractWithSections.sections!.map((s) =>
            s.sectionType === sectionType ? { ...s, items: updatedItems } : s,
          );

          const updatedContract: SavedContract = {
            ...contractWithSections,
            sections: updatedSections,
            clauses: getAllClausesFromContract({
              ...contractWithSections,
              sections: updatedSections,
            }),
          };

          setContract(updatedContract);
          setClauses(reprocessClauseLinks(updatedContract.clauses || []));
          await performSaveContract(updatedContract);
        }
      } else {
        // Legacy: delete from clauses array
        const clause = clauses[index];
        if (clause) {
          const targetSectionType =
            clause.condition_type === 'General'
              ? SectionType.GENERAL
              : SectionType.PARTICULAR;
          const section = contractWithSections.sections?.find(
            (s) => s.sectionType === targetSectionType,
          );
          if (section) {
            const itemIndex = section.items.findIndex(
              (item) =>
                item.itemType === ItemType.CLAUSE &&
                item.clause_number === clause.clause_number &&
                item.condition_type === clause.condition_type,
            );

            if (itemIndex >= 0) {
              const updatedItems = section.items.filter(
                (_, i) => i !== itemIndex,
              );
              updatedItems.forEach((item, i) => {
                item.orderIndex = i;
              });

              const updatedSections = contractWithSections.sections!.map((s) =>
                s.sectionType === targetSectionType
                  ? { ...s, items: updatedItems }
                  : s,
              );

              const updatedContract: SavedContract = {
                ...contractWithSections,
                sections: updatedSections,
                clauses: getAllClausesFromContract({
                  ...contractWithSections,
                  sections: updatedSections,
                }),
              };

              setContract(updatedContract);
              setClauses(reprocessClauseLinks(updatedContract.clauses || []));
              await performSaveContract(updatedContract);
            }
          }
        }
      }
    }
  };

  const handleReorder = async (
    fromIndex: number,
    toIndex: number,
    sectionType?: SectionType,
  ) => {
    if (!contract) return;

    const contractWithSections = ensureContractHasSections(contract);

    if (sectionType) {
      // Reorder within specific section
      const section = contractWithSections.sections?.find(
        (s) => s.sectionType === sectionType,
      );
      if (section) {
        const updatedItems = [...section.items];
        const [moved] = updatedItems.splice(fromIndex, 1);
        updatedItems.splice(toIndex, 0, moved);
        updatedItems.forEach((item, i) => {
          item.orderIndex = i;
        });

        const updatedSections = contractWithSections.sections!.map((s) =>
          s.sectionType === sectionType ? { ...s, items: updatedItems } : s,
        );

        const updatedContract: SavedContract = {
          ...contractWithSections,
          sections: updatedSections,
          clauses: getAllClausesFromContract({
            ...contractWithSections,
            sections: updatedSections,
          }),
        };

        setContract(updatedContract);
        setClauses(reprocessClauseLinks(updatedContract.clauses || []));
        await performSaveContract(updatedContract);
      }
    } else {
      // Legacy: reorder clauses array
      const newClauses = [...clauses];
      const [movedItem] = newClauses.splice(fromIndex, 1);
      newClauses.splice(toIndex, 0, movedItem);
      setClauses(reprocessClauseLinks(newClauses));
      persistCurrentProject(newClauses);
    }
  };

  return {
    editingClause,
    setEditingClause,
    handleUpdateClause,
    handleClausesUpdateFromCategory,
    onOpenClause,
    handleEditClause,
    handleAskAI,
    handleUpdateClauseFromModal,
    handleSaveManualClause,
    handleDeleteClause,
    handleReorder,
  };
}
