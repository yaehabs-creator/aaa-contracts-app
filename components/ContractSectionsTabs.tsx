import React, { useState, useMemo } from 'react';
import { SavedContract, ContractSection, SectionType, SectionItem, Clause } from '../types';
import { SectionEditor } from './SectionEditor';
import { ensureContractHasSections } from '../services/contractMigrationService';

interface ContractSectionsTabsProps {
  contract: SavedContract;
  onUpdate: (updatedContract: SavedContract) => void;
  onEditClause?: (clause: Clause) => void;
  onCompareClause?: (clause: Clause) => void;
  onDeleteClause?: (index: number, sectionType: SectionType) => void;
  onReorderClause?: (fromIndex: number, toIndex: number, sectionType: SectionType) => void;
}

export const ContractSectionsTabs: React.FC<ContractSectionsTabsProps> = ({
  contract,
  onUpdate,
  onEditClause,
  onCompareClause,
  onDeleteClause,
  onReorderClause
}) => {
  // Ensure contract has sections
  const contractWithSections = useMemo(() => ensureContractHasSections(contract), [contract]);
  
  const [activeTab, setActiveTab] = useState<SectionType>(SectionType.AGREEMENT);

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

  if (!activeSection) {
    return (
      <div className="bg-white border border-aaa-border rounded-3xl p-16 text-center">
        <p className="text-aaa-muted font-semibold">No sections available</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-aaa-border rounded-3xl shadow-premium overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-aaa-border bg-slate-50/50">
        <div className="flex overflow-x-auto custom-scrollbar">
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
