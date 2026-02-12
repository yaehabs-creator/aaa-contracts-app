import React, { useState, useMemo, useEffect } from 'react';
import { SavedContract, ContractSection, SectionType, SectionItem, Clause } from '../types';
import { SectionEditor } from './SectionEditor';
import { ensureContractHasSections } from '../services/contractMigrationService';
import { getCategoriesForContract, ContractCategory } from '../src/services/supabaseService';

// Helper: Get clause status (added, modified, gc-only) for sorting/display
const getClauseStatusFromItem = (item: SectionItem): 'added' | 'modified' | 'gc-only' => {
  const hasPC = item.particular_condition && item.particular_condition.length > 0;
  const hasGC = item.general_condition && item.general_condition.length > 0;

  if (hasPC && !hasGC) return 'added';
  if (hasPC && hasGC) return 'modified';
  if (hasGC) return 'gc-only';

  // Fallback for single-source contracts
  if (item.condition_type === 'Particular') return 'added';
  return 'gc-only';
};

interface ContractSectionsTabsProps {
  contract: SavedContract;
  onUpdate: (updatedContract: SavedContract) => void;
  onSave?: (contract: SavedContract) => Promise<void>;
  onEditClause?: (clause: Clause) => void;
  onCompareClause?: (clause: Clause) => void;
  onDeleteClause?: (index: number, sectionType: SectionType) => void;
  onReorderClause?: (fromIndex: number, toIndex: number, sectionType: SectionType) => void;
  onAddClause?: () => void;
  sortMode?: 'default' | 'status' | 'chapter' | 'category';
  onSortModeChange?: (mode: 'default' | 'status' | 'chapter' | 'category') => void;
}

export const ContractSectionsTabs: React.FC<ContractSectionsTabsProps> = ({
  contract,
  onUpdate,
  onSave,
  onEditClause,
  onCompareClause,
  onDeleteClause,
  onReorderClause,
  onAddClause,
  sortMode = 'default',
  onSortModeChange
}) => {
  // Ensure contract has sections
  const contractWithSections = useMemo(() => ensureContractHasSections(contract), [contract]);

  // Use 'CONDITIONS' as special identifier for the conditions tab
  type TabType = SectionType | 'CONDITIONS';
  const [activeTab, setActiveTab] = useState<TabType>('CONDITIONS');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Categories from Admin Editor
  const [categories, setCategories] = useState<ContractCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Fetch categories when contract changes
  useEffect(() => {
    const loadCategories = async () => {
      if (!contract.id) return;

      setCategoriesLoading(true);
      try {
        const cats = await getCategoriesForContract(contract.id);
        setCategories(cats);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, [contract.id]);

  // Get all sections in order
  const allSections = useMemo(() => {
    if (!contractWithSections.sections) {
      return [];
    }

    // Sort sections to maintain order
    return [...contractWithSections.sections].sort((a, b) => {
      const order = [
        SectionType.AGREEMENT,
        SectionType.LOA,
        SectionType.GENERAL,
        SectionType.PARTICULAR,
        SectionType.ADDENDUM,
        SectionType.BOQ,
        SectionType.AUTOMATION,
        SectionType.INSTRUCTION
      ];
      const idxA = order.indexOf(a.sectionType);
      const idxB = order.indexOf(b.sectionType);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }, [contractWithSections.sections]);

  // Filter sections for tabs (exclude GENERAL, PARTICULAR, AGREEMENT, and LOA)
  // AGREEMENT and LOA tabs are hidden as they are not needed in the UI
  const tabSections = useMemo(() => {
    return allSections.filter(s =>
      s.sectionType !== SectionType.GENERAL &&
      s.sectionType !== SectionType.PARTICULAR &&
      s.sectionType !== SectionType.AGREEMENT &&
      s.sectionType !== SectionType.LOA
    );
  }, [allSections]);

  // Get GENERAL and PARTICULAR sections
  const generalSection = useMemo(() =>
    allSections.find(s => s.sectionType === SectionType.GENERAL),
    [allSections]
  );
  const particularSection = useMemo(() =>
    allSections.find(s => s.sectionType === SectionType.PARTICULAR),
    [allSections]
  );

  // Create combined Conditions section when CONDITIONS tab is active
  const combinedConditionsSection = useMemo((): ContractSection | null => {
    if (activeTab !== 'CONDITIONS') return null;

    const generalItems = generalSection?.items || [];
    const particularItems = particularSection?.items || [];

    // Combine items, marking their origin section
    const combinedItems: (SectionItem & { _originSection?: SectionType })[] = [
      ...generalItems.map(item => ({ ...item, _originSection: SectionType.GENERAL })),
      ...particularItems.map(item => ({ ...item, _originSection: SectionType.PARTICULAR }))
    ];

    // Apply sorting based on sortMode
    if (sortMode === 'category' && categories.length > 0) {
      // Sort by category order, then by clause number within category
      // Create a map of category_id -> order_index
      const categoryOrderMap = new Map<string, number>();
      categories.forEach((cat, idx) => {
        categoryOrderMap.set(cat.id, idx);
      });

      combinedItems.sort((a, b) => {
        const catIdA = (a as any).category_id || '';
        const catIdB = (b as any).category_id || '';

        // Items without category go to the end
        const catOrderA = catIdA ? (categoryOrderMap.get(catIdA) ?? 999) : 1000;
        const catOrderB = catIdB ? (categoryOrderMap.get(catIdB) ?? 999) : 1000;

        if (catOrderA !== catOrderB) return catOrderA - catOrderB;

        // Within same category, sort by clause number
        const numA = parseFloat(a.clause_number || '0') || 0;
        const numB = parseFloat(b.clause_number || '0') || 0;
        return numA - numB;
      });
    } else if (sortMode === 'status') {
      const statusOrder = { 'added': 0, 'modified': 1, 'gc-only': 2 };
      combinedItems.sort((a, b) => {
        const statusDiff = statusOrder[getClauseStatusFromItem(a)] - statusOrder[getClauseStatusFromItem(b)];
        if (statusDiff !== 0) return statusDiff;
        // Secondary sort by clause number within same status
        const numA = parseFloat(a.clause_number || '0') || 0;
        const numB = parseFloat(b.clause_number || '0') || 0;
        return numA - numB;
      });
    } else if (sortMode === 'chapter') {
      combinedItems.sort((a, b) => {
        const numA = parseFloat(a.clause_number || '0') || 0;
        const numB = parseFloat(b.clause_number || '0') || 0;
        if (numA !== numB) return numA - numB;
        return (a.clause_number || '').localeCompare(b.clause_number || '', undefined, { numeric: true });
      });
    } else {
      // Default: sort by orderIndex
      combinedItems.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    }

    return {
      sectionType: SectionType.GENERAL, // Use GENERAL as the type for compatibility
      title: 'Conditions',
      items: combinedItems as SectionItem[]
    };
  }, [activeTab, generalSection, particularSection, sortMode, categories]);

  // Grouping logic for FIDIC Folders
  const folderGroups = useMemo(() => {
    const groups = [
      {
        id: 'FORMS',
        label: 'Forms',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        types: [SectionType.AGREEMENT, SectionType.LOA, SectionType.TENDER]
      },
      {
        id: 'CONDITIONS',
        label: 'Conditions',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        types: ['CONDITIONS' as any]
      },
      {
        id: 'TECHNICAL',
        label: 'Technical',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        ),
        types: [SectionType.REQUIREMENTS, SectionType.SPECIFICATION, SectionType.PROPOSAL, SectionType.DRAWINGS]
      },
      {
        id: 'SCHEDULES',
        label: 'Schedules',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        types: [SectionType.BOQ, SectionType.SCHEDULE, SectionType.ANNEX, SectionType.ADDENDUM, SectionType.INSTRUCTION, SectionType.AUTOMATION, SectionType.EXTRAS]
      }
    ];
    return groups;
  }, []);

  // Get active section based on tab
  const activeSection = useMemo(() => {
    if (activeTab === 'CONDITIONS') {
      return combinedConditionsSection;
    }
    return allSections.find(s => s.sectionType === activeTab);
  }, [activeTab, allSections, combinedConditionsSection]);

  const handleSectionUpdate = (updatedSection: ContractSection) => {
    const updatedSections = allSections.map(s =>
      s.sectionType === updatedSection.sectionType ? updatedSection : s
    );

    const updatedContract: SavedContract = {
      ...contractWithSections,
      sections: updatedSections
    };

    onUpdate(updatedContract);
  };

  // Handle updates for combined Conditions section
  const handleConditionsUpdate = (updatedSection: ContractSection) => {
    const updatedItems = updatedSection.items;

    // Split items back into GENERAL and PARTICULAR based on their origin
    const generalItems: SectionItem[] = [];
    const particularItems: SectionItem[] = [];

    updatedItems.forEach((item, index) => {
      const originSection = (item as any)._originSection;
      const cleanItem = { ...item };
      delete (cleanItem as any)._originSection;
      cleanItem.orderIndex = index;

      if (originSection === SectionType.GENERAL) {
        generalItems.push(cleanItem);
      } else if (originSection === SectionType.PARTICULAR) {
        particularItems.push(cleanItem);
      } else {
        // If no origin, determine based on condition_type
        const conditionType = cleanItem.condition_type;
        if (conditionType === 'General') {
          generalItems.push(cleanItem);
        } else if (conditionType === 'Particular') {
          particularItems.push(cleanItem);
        } else {
          // Default to General if unclear
          generalItems.push(cleanItem);
        }
      }
    });

    // Update both sections
    const updatedSections = allSections.map(s => {
      if (s.sectionType === SectionType.GENERAL) {
        return { ...s, items: generalItems };
      } else if (s.sectionType === SectionType.PARTICULAR) {
        return { ...s, items: particularItems };
      }
      return s;
    });

    const updatedContract: SavedContract = {
      ...contractWithSections,
      sections: updatedSections
    };

    onUpdate(updatedContract);
  };

  const handleAddItem = (item: SectionItem, sectionType: SectionType) => {
    const section = allSections.find(s => s.sectionType === sectionType);
    if (!section) return;

    const updatedSection: ContractSection = {
      ...section,
      items: [...section.items, { ...item, orderIndex: section.items.length }]
    };

    handleSectionUpdate(updatedSection);
  };

  const handleEditItem = (item: SectionItem, index: number, sectionType: SectionType | 'CONDITIONS') => {
    if (sectionType === 'CONDITIONS') {
      // Handle edit in combined view
      if (!activeSection) return;
      const currentItems = activeSection.items || [];
      const updatedItems = [...currentItems];
      updatedItems[index] = item;

      const updatedSection: ContractSection = {
        ...activeSection,
        items: updatedItems
      };
      handleConditionsUpdate(updatedSection);
      return;
    }

    const section = allSections.find(s => s.sectionType === sectionType);
    if (!section) return;

    const updatedItems = [...section.items];
    updatedItems[index] = item;

    const updatedSection: ContractSection = {
      ...section,
      items: updatedItems
    };

    handleSectionUpdate(updatedSection);
  };

  const handleDeleteItem = (index: number, sectionType: SectionType | 'CONDITIONS') => {
    if (sectionType === 'CONDITIONS') {
      // Handle delete in combined view
      if (!activeSection) return;
      const currentItems = activeSection.items || [];
      const updatedItems = currentItems.filter((_, i) => i !== index);

      const updatedSection: ContractSection = {
        ...activeSection,
        items: updatedItems
      };
      handleConditionsUpdate(updatedSection);
      return;
    }

    const section = allSections.find(s => s.sectionType === sectionType);
    if (!section) return;

    const updatedItems = section.items.filter((_, i) => i !== index);
    updatedItems.forEach((item, i) => {
      item.orderIndex = i;
    });

    const updatedSection: ContractSection = {
      ...section,
      items: updatedItems
    };

    handleSectionUpdate(updatedSection);
  };

  const handleReorder = (fromIndex: number, toIndex: number, sectionType: SectionType | 'CONDITIONS') => {
    if (sectionType === 'CONDITIONS') {
      // Handle reorder in combined view
      if (!activeSection) return;
      const currentItems = activeSection.items || [];
      const updatedItems = [...currentItems];
      const [moved] = updatedItems.splice(fromIndex, 1);
      updatedItems.splice(toIndex, 0, moved);

      const updatedSection: ContractSection = {
        ...activeSection,
        items: updatedItems
      };
      handleConditionsUpdate(updatedSection);
      return;
    }

    const section = allSections.find(s => s.sectionType === sectionType);
    if (!section) return;

    const updatedItems = [...section.items];
    const [moved] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, moved);
    updatedItems.forEach((item, i) => {
      item.orderIndex = i;
    });

    const updatedSection: ContractSection = {
      ...section,
      items: updatedItems
    };

    handleSectionUpdate(updatedSection);
  };

  const handleDeleteClause = (index: number, sectionType: SectionType | 'CONDITIONS') => {
    if (sectionType === 'CONDITIONS') {
      // Need to determine which section the clause belongs to
      const item = activeSection?.items[index];
      if (!item) return;

      const originSection = (item as any)._originSection ||
        (item.condition_type === 'Particular' ? SectionType.PARTICULAR : SectionType.GENERAL);

      // Find the original index in the source section
      const sourceSection = originSection === SectionType.GENERAL ? generalSection : particularSection;
      if (!sourceSection) return;

      const sourceIndex = sourceSection.items.findIndex(i =>
        i.clause_number === item.clause_number &&
        i.clause_title === item.clause_title
      );

      if (sourceIndex >= 0 && onDeleteClause) {
        onDeleteClause(sourceIndex, originSection);
      } else {
        handleDeleteItem(index, 'CONDITIONS');
      }
      return;
    }

    if (onDeleteClause) {
      onDeleteClause(index, sectionType);
    } else {
      handleDeleteItem(index, sectionType);
    }
  };

  const handleReorderClause = (fromIndex: number, toIndex: number, sectionType: SectionType | 'CONDITIONS') => {
    if (sectionType === 'CONDITIONS') {
      // Handle reorder in combined view
      handleReorder(fromIndex, toIndex, 'CONDITIONS');
      return;
    }

    if (onReorderClause) {
      onReorderClause(fromIndex, toIndex, sectionType);
    } else {
      handleReorder(fromIndex, toIndex, sectionType);
    }
  };

  const handleSave = async () => {
    if (!onSave) {
      // If no onSave prop, just call onUpdate (fallback to auto-save behavior)
      onUpdate(contractWithSections);
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await onSave(contractWithSections);
      setSaveStatus('success');
      // Clear success message after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save contract:', error);
      setSaveStatus('error');
      // Clear error message after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Only show "No sections available" if there's no active section
  if (!activeSection) {
    return (
      <div className="bg-white border border-aaa-border rounded-3xl p-16 text-center">
        <p className="text-aaa-muted font-semibold">No sections available</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-aaa-border rounded-3xl shadow-premium overflow-hidden">
      {/* Header with Categorized Groups */}
      <div className="border-b border-aaa-border bg-slate-50/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between">
          {/* Folders Navigation */}
          <div className="flex overflow-x-auto custom-scrollbar flex-1 border-r border-aaa-border">
            {folderGroups.map((group) => {
              const groupItemsCount = group.types.reduce((acc, type) => {
                if (type === 'CONDITIONS') {
                  const genCount = generalSection?.items.length || 0;
                  const parCount = particularSection?.items.length || 0;
                  return acc + genCount + parCount;
                }
                const section = allSections.find(s => s.sectionType === type);
                return acc + (section?.items.length || 0);
              }, 0);

              const isGroupActive = group.types.includes(activeTab as any);

              return (
                <div key={group.id} className={`flex flex-col border-r border-aaa-border last:border-r-0 min-w-[200px] ${isGroupActive ? 'bg-white' : ''}`}>
                  <div className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] border-b flex items-center gap-2 ${isGroupActive ? 'bg-aaa-blue text-white border-aaa-blue' : 'bg-slate-100 text-aaa-muted border-aaa-border'
                    }`}>
                    {group.icon}
                    {group.label}
                    {groupItemsCount > 0 && (
                      <span className={`ml-auto px-1.5 py-0.5 rounded-md text-[9px] ${isGroupActive ? 'bg-white text-aaa-blue' : 'bg-aaa-border text-aaa-muted'}`}>
                        {groupItemsCount}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap p-1 gap-1">
                    {group.types.map((type) => {
                      const section = type === 'CONDITIONS' ? { title: 'Conditions', items: [] } : allSections.find(s => s.sectionType === type);
                      if (!section && type !== 'CONDITIONS') return null;

                      const isActive = activeTab === type;
                      const hasItems = type === 'CONDITIONS'
                        ? ((generalSection?.items.length || 0) + (particularSection?.items.length || 0)) > 0
                        : (section?.items.length || 0) > 0;

                      return (
                        <button
                          key={type as string}
                          onClick={() => setActiveTab(type as any)}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${isActive
                            ? 'bg-aaa-bg text-aaa-blue shadow-sm'
                            : 'text-aaa-muted hover:text-aaa-blue hover:bg-aaa-bg/30'
                            }`}
                        >
                          {type === 'CONDITIONS' ? 'Conditions' : section?.title.split(' ').pop()}
                          {hasItems && <span className="w-1 h-1 rounded-full bg-aaa-blue"></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sort Controls (only show for Conditions tab) */}
          {activeTab === 'CONDITIONS' && onSortModeChange && (
            <div className="px-4 py-2 flex items-center gap-2 border-l border-aaa-border">
              <span className="text-[9px] font-bold text-aaa-muted uppercase tracking-wider">Sort:</span>
              <button
                onClick={() => onSortModeChange('default')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${sortMode === 'default'
                  ? 'bg-aaa-blue text-white border-aaa-blue'
                  : 'bg-white text-aaa-muted border-aaa-border hover:border-aaa-blue hover:text-aaa-blue'
                  }`}
              >
                Default
              </button>
              <button
                onClick={() => onSortModeChange('status')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${sortMode === 'status'
                  ? 'bg-aaa-blue text-white border-aaa-blue'
                  : 'bg-white text-aaa-muted border-aaa-border hover:border-aaa-blue hover:text-aaa-blue'
                  }`}
                title="Group by: Added, Modified, GC-only"
              >
                By Status
              </button>
              <button
                onClick={() => onSortModeChange('chapter')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${sortMode === 'chapter'
                  ? 'bg-aaa-blue text-white border-aaa-blue'
                  : 'bg-white text-aaa-muted border-aaa-border hover:border-aaa-blue hover:text-aaa-blue'
                  }`}
                title="Sort by clause number"
              >
                By Chapter
              </button>
              {categories.length > 0 && (
                <button
                  onClick={() => onSortModeChange('category')}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${sortMode === 'category'
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-white text-aaa-muted border-aaa-border hover:border-purple-500 hover:text-purple-600'
                    }`}
                  title="Group by categories from Admin Editor"
                >
                  By Category
                </button>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="px-6 py-2 flex items-center gap-3">
            {saveStatus === 'success' && (
              <span className="text-sm text-green-600 font-semibold">Saved!</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-600 font-semibold">Save failed</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${isSaving
                ? 'bg-aaa-bg text-aaa-muted cursor-not-allowed'
                : saveStatus === 'success'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-aaa-blue text-white hover:bg-aaa-blue/90 shadow-md hover:shadow-lg'
                }`}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Contract'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {activeSection && (
          <SectionEditor
            section={activeSection}
            onUpdate={activeTab === 'CONDITIONS' ? handleConditionsUpdate : handleSectionUpdate}
            onAddItem={(item) => {
              // For Conditions tab, default to General section
              if (activeTab === 'CONDITIONS') {
                handleAddItem(item, SectionType.GENERAL);
              } else {
                handleAddItem(item, activeSection.sectionType as SectionType);
              }
            }}
            onEditItem={(item, index) => handleEditItem(item, index, activeTab === 'CONDITIONS' ? 'CONDITIONS' : activeSection.sectionType)}
            onDeleteItem={(index) => handleDeleteItem(index, activeTab === 'CONDITIONS' ? 'CONDITIONS' : activeSection.sectionType)}
            onReorder={(fromIndex, toIndex) => handleReorder(fromIndex, toIndex, activeTab === 'CONDITIONS' ? 'CONDITIONS' : activeSection.sectionType)}
            onEditClause={onEditClause}
            onCompareClause={onCompareClause}
            onDeleteClause={(index) => handleDeleteClause(index, activeTab === 'CONDITIONS' ? 'CONDITIONS' : activeSection.sectionType)}
            onReorderClause={(fromIndex, toIndex) => handleReorderClause(fromIndex, toIndex, activeTab === 'CONDITIONS' ? 'CONDITIONS' : activeSection.sectionType)}
            onAddClause={onAddClause}
          />
        )}
      </div>
    </div>
  );
};
