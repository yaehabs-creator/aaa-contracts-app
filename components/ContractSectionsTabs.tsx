import React, { useState, useMemo } from 'react';
import { SavedContract, ContractSection, SectionType, SectionItem, Clause } from '../types';
import { SectionEditor } from './SectionEditor';
import { ensureContractHasSections } from '../services/contractMigrationService';

interface ContractSectionsTabsProps {
  contract: SavedContract;
  onUpdate: (updatedContract: SavedContract) => void;
  onSave?: (contract: SavedContract) => Promise<void>;
  onEditClause?: (clause: Clause) => void;
  onCompareClause?: (clause: Clause) => void;
  onDeleteClause?: (index: number, sectionType: SectionType) => void;
  onReorderClause?: (fromIndex: number, toIndex: number, sectionType: SectionType) => void;
}

export const ContractSectionsTabs: React.FC<ContractSectionsTabsProps> = ({
  contract,
  onUpdate,
  onSave,
  onEditClause,
  onCompareClause,
  onDeleteClause,
  onReorderClause
}) => {
  // Ensure contract has sections
  const contractWithSections = useMemo(() => ensureContractHasSections(contract), [contract]);
  
  const [activeTab, setActiveTab] = useState<SectionType>(SectionType.AGREEMENT);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Get sections in order
  const sections = useMemo(() => {
    if (!contractWithSections.sections) {
      return [];
    }
    
    // Sort sections to maintain order: AGREEMENT, LOA, GENERAL, PARTICULAR
    return [...contractWithSections.sections].sort((a, b) => {
      const order = [SectionType.AGREEMENT, SectionType.LOA, SectionType.GENERAL, SectionType.PARTICULAR];
      return order.indexOf(a.sectionType) - order.indexOf(b.sectionType);
    });
  }, [contractWithSections.sections]);

  const activeSection = sections.find(s => s.sectionType === activeTab) || sections[0];

  const handleSectionUpdate = (updatedSection: ContractSection) => {
    const updatedSections = sections.map(s =>
      s.sectionType === updatedSection.sectionType ? updatedSection : s
    );

    const updatedContract: SavedContract = {
      ...contractWithSections,
      sections: updatedSections
    };

    onUpdate(updatedContract);
  };

  const handleAddItem = (item: SectionItem, sectionType: SectionType) => {
    const section = sections.find(s => s.sectionType === sectionType);
    if (!section) return;

    const updatedSection: ContractSection = {
      ...section,
      items: [...section.items, { ...item, orderIndex: section.items.length }]
    };

    handleSectionUpdate(updatedSection);
  };

  const handleEditItem = (item: SectionItem, index: number, sectionType: SectionType) => {
    const section = sections.find(s => s.sectionType === sectionType);
    if (!section) return;

    const updatedItems = [...section.items];
    updatedItems[index] = item;

    const updatedSection: ContractSection = {
      ...section,
      items: updatedItems
    };

    handleSectionUpdate(updatedSection);
  };

  const handleDeleteItem = (index: number, sectionType: SectionType) => {
    const section = sections.find(s => s.sectionType === sectionType);
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

  const handleReorder = (fromIndex: number, toIndex: number, sectionType: SectionType) => {
    const section = sections.find(s => s.sectionType === sectionType);
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

  const handleDeleteClause = (index: number, sectionType: SectionType) => {
    if (onDeleteClause) {
      onDeleteClause(index, sectionType);
    } else {
      handleDeleteItem(index, sectionType);
    }
  };

  const handleReorderClause = (fromIndex: number, toIndex: number, sectionType: SectionType) => {
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

  if (!activeSection) {
    return (
      <div className="bg-white border border-aaa-border rounded-3xl p-16 text-center">
        <p className="text-aaa-muted font-semibold">No sections available</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-aaa-border rounded-3xl shadow-premium overflow-hidden">
      {/* Header with Tabs and Save Button */}
      <div className="border-b border-aaa-border bg-slate-50/50">
        <div className="flex items-center justify-between">
          {/* Tabs */}
          <div className="flex overflow-x-auto custom-scrollbar flex-1">
            {sections.map((section) => (
              <button
                key={section.sectionType}
                onClick={() => setActiveTab(section.sectionType)}
                className={`px-8 py-4 text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 ${
                  activeTab === section.sectionType
                    ? 'border-aaa-blue text-aaa-blue bg-white'
                    : 'border-transparent text-aaa-muted hover:text-aaa-blue hover:bg-white/50'
                }`}
              >
                {section.title}
                {section.items.length > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${
                    activeTab === section.sectionType
                      ? 'bg-aaa-blue/10 text-aaa-blue'
                      : 'bg-aaa-bg text-aaa-muted'
                  }`}>
                    {section.items.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          
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
              className={`px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
                isSaving
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
        <SectionEditor
          section={activeSection}
          onUpdate={handleSectionUpdate}
          onAddItem={(item) => handleAddItem(item, activeSection.sectionType)}
          onEditItem={(item, index) => handleEditItem(item, index, activeSection.sectionType)}
          onDeleteItem={(index) => handleDeleteItem(index, activeSection.sectionType)}
          onReorder={(fromIndex, toIndex) => handleReorder(fromIndex, toIndex, activeSection.sectionType)}
          onEditClause={onEditClause}
          onCompareClause={onCompareClause}
          onDeleteClause={(index) => handleDeleteClause(index, activeSection.sectionType)}
          onReorderClause={(fromIndex, toIndex) => handleReorderClause(fromIndex, toIndex, activeSection.sectionType)}
        />
      </div>
    </div>
  );
};
