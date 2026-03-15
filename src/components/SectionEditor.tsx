import React, { useState, useMemo } from 'react';
import { ContractSection, SectionItem, SectionType, ItemType, Clause, ContractSubfolder, ExtractedData, FolderSchemaField } from '@/types';
import { ClauseCard } from './ClauseCard';
import { SectionItemCard } from './SectionItemCard';
import { ItemEditorModal } from './ItemEditorModal';
import { sectionItemToClause } from '@/services/contractMigrationService';
import { useAuth } from '@/contexts/AuthContext';

interface SectionEditorProps {
  section: ContractSection;
  onUpdate: (updatedSection: ContractSection) => void;
  onAddItem?: (item: SectionItem) => void;
  onEditItem?: (item: SectionItem, index: number) => void;
  onDeleteItem?: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onEditClause?: (clause: Clause) => void;
  onCompareClause?: (clause: Clause) => void;
  onDeleteClause?: (index: number) => void;
  onReorderClause?: (fromIndex: number, toIndex: number) => void;
  onAddClause?: () => void;
  onAskAI?: (item: any) => void;
  organizerSubfolders?: ContractSubfolder[];
  organizerExtractedData?: ExtractedData[];
  organizerSchemas?: Record<string, FolderSchemaField[]>;
}

const FOLDER_TO_SECTION_MAPPING: Record<string, SectionType[]> = {
  'A': [SectionType.AGREEMENT],
  'B': [SectionType.LOA],
  'C': [SectionType.GENERAL, SectionType.PARTICULAR],
  'D': [SectionType.TENDER, SectionType.ADDENDUM], // Grouped addendas and tender letters
  'E': [SectionType.REPORT], // Soil investigation report
  'F': [SectionType.DRAWINGS],
  'G': [SectionType.SPECIFICATION],
  'H': [SectionType.SCHEDULE], // Cut sheets
  'I': [SectionType.BOQ], // Priced BOQ
  'J': [SectionType.BOQ], // Non-priced BOQ
  'K': [SectionType.REQUIREMENTS], // Health and safety
  'L': [SectionType.FORMS], // Control forms
  'M': [SectionType.REQUIREMENTS], // Hoarding
  'N': [SectionType.AUTOMATION], // User guide
  'O': [SectionType.UNDERTAKING], // Confidentiality undertaking
  'P': [SectionType.INSTRUCTION], // ITT
};

export const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  onUpdate,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onReorder,
  onEditClause,
  onCompareClause,
  onDeleteClause,
  onReorderClause,
  onAddClause,
  onAskAI,
  organizerSubfolders = [],
  organizerExtractedData = [],
  organizerSchemas = {}
}) => {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<SectionItem | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number>(-1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showOrganizerData, setShowOrganizerData] = useState(true);

  // Sections that favor Clause-style rendering for primary content
  const isDefaultClauseSection =
    section.sectionType === SectionType.GENERAL ||
    section.sectionType === SectionType.PARTICULAR ||
    section.sectionType === SectionType.TENDER ||
    section.sectionType === SectionType.REQUIREMENTS ||
    section.sectionType === SectionType.PROPOSAL ||
    section.sectionType === SectionType.SPECIFICATION ||
    section.sectionType === SectionType.INSTRUCTION ||
    section.title === 'Conditions';

  const isFormSection =
    section.sectionType === SectionType.AGREEMENT ||
    section.sectionType === SectionType.LOA;

  // Merge section items with organizer data
  const allIntegratedItems = useMemo(() => {
    const nativeItems = section.items || [];

    // Find subfolders that map to this section type
    const relevantSubfolders = organizerSubfolders.filter(sub => {
      const mappedSections = FOLDER_TO_SECTION_MAPPING[sub.folder_code];
      return mappedSections?.includes(section.sectionType);
    });

    // Convert extracted data from these subfolders into SectionItems
    const extractedItems: (SectionItem & { isIntegrated?: boolean })[] = [];
    relevantSubfolders.forEach(sub => {
      // Find all data for this subfolder
      const dataForSub = organizerExtractedData.filter(d => d.subfolder_id === sub.id);

      dataForSub.forEach(data => {
        const isFullText = data.field_key === '__full_text__';
        const fieldSchema = organizerSchemas[sub.id]?.find(f => f.key === data.field_key);

        // Create user-friendly labels
        let label = isFullText ? sub.name : (fieldSchema?.label || data.field_key);

        // Clean up common technical patterns
        if (label === '__claude_analysis__') label = 'AI Analysis Summary';
        if (label === '__full_text__') label = sub.name || 'Extracted Text';
        if (label.startsWith('__') && label.endsWith('__')) {
          label = label.replace(/__/g, '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }

        const isPdf = !!data.doc_url;

        // Deduplicate: Don't add if this item is already in nativeItems (e.g. was promoted/manually added)
        if (nativeItems.some(ni => ni.id === data.id || (ni.fieldKey === label && ni.fieldValue === (data.value as string)))) {
          return;
        }

        extractedItems.push({
          id: data.id,
          itemType: isFullText ? ItemType.PARAGRAPH : ItemType.FIELD,
          heading: isFullText ? label : undefined,
          fieldKey: !isFullText ? label : undefined,
          fieldValue: !isFullText ? data.value as string : undefined,
          text: isFullText ? data.value as string : undefined,
          orderIndex: nativeItems.length + extractedItems.length,
          confidence: data.confidence,
          evidence: data.evidence,
          status: data.status,
          doc_url: data.doc_url,
          doc_name: data.doc_name,
          isIntegrated: true,
          isHidden: data.isHidden
        });
      });
    });

    if (!showOrganizerData) return nativeItems;
    return [...nativeItems, ...extractedItems];
  }, [section.items, section.sectionType, organizerSubfolders, organizerExtractedData, showOrganizerData]);

  // Handle visibility toggle
  const handleToggleVisibility = (item: SectionItem) => {
    if (!isAdmin()) return;

    // Check if it's already a native item
    const nativeIndex = (section.items || []).findIndex(i =>
      i.id === item.id ||
      (i.heading === item.heading && i.text === item.text && i.itemType === item.itemType && i.fieldKey === item.fieldKey)
    );

    if (nativeIndex !== -1) {
      const updatedItems = [...(section.items || [])];
      updatedItems[nativeIndex] = {
        ...updatedItems[nativeIndex],
        isHidden: !updatedItems[nativeIndex].isHidden
      };

      onUpdate({
        ...section,
        items: updatedItems
      });
    } else if ((item as any).isIntegrated) {
      // Integrated item - promote to native and toggle visibility
      const newItem: SectionItem = {
        ...item,
        isHidden: !item.isHidden,
        orderIndex: (section.items || []).length
      };

      onUpdate({
        ...section,
        items: [...(section.items || []), newItem]
      });
    }
  };

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    // Debug logging for troubleshooting
    if (allIntegratedItems.length > 0) {
      console.log(`[SectionEditor] Rendering section: ${section.title}`, {
        type: section.sectionType,
        itemsCount: allIntegratedItems.length
      });
    }

    // Role-based visibility filtering
    let items = allIntegratedItems;
    if (!isAdmin()) {
      items = items.filter(item => !item.isHidden);
    }

    if (!searchQuery.trim()) {
      return items;
    }

    const keywords = searchQuery.trim().toLowerCase().split(/\s+/);

    return items.filter(item => {
      if (item.itemType === ItemType.CLAUSE) {
        const clause = sectionItemToClause(item);
        if (!clause) return false;

        const searchableText = [
          clause.clause_number,
          clause.clause_title,
          clause.clause_text,
          clause.general_condition || '',
          clause.particular_condition || ''
        ].join(' ').toLowerCase();

        return keywords.every(keyword => searchableText.includes(keyword));
      } else if (item.itemType === ItemType.PARAGRAPH) {
        const searchableText = [
          item.heading || '',
          item.text || ''
        ].join(' ').toLowerCase();

        return keywords.every(keyword => searchableText.includes(keyword));
      } else if (item.itemType === ItemType.FIELD) {
        const searchableText = [
          item.fieldKey || '',
          item.fieldValue || ''
        ].join(' ').toLowerCase();

        return keywords.every(keyword => searchableText.includes(keyword));
      } else if (item.itemType === ItemType.IMAGE) {
        const searchableText = [
          item.imageTitle || '',
          item.imageAlt || '',
          item.heading || ''
        ].join(' ').toLowerCase();

        return keywords.every(keyword => searchableText.includes(keyword));
      } else if (item.itemType === ItemType.PDF) {
        const searchableText = [
          item.doc_name || '',
          item.heading || ''
        ].join(' ').toLowerCase();

        return keywords.every(keyword => searchableText.includes(keyword));
      }
      return false;
    });
  }, [allIntegratedItems, searchQuery, section.title, section.sectionType]);

  const searchKeywords = searchQuery.trim().split(/\s+/).filter(k => k.length > 0);

  const handleAddItem = (item: SectionItem) => {
    const newItem: SectionItem = {
      ...item,
      orderIndex: section.items.length
    };

    const updatedSection: ContractSection = {
      ...section,
      items: [...section.items, newItem]
    };

    onUpdate(updatedSection);
    if (onAddItem) {
      onAddItem(newItem);
    }
    setIsAddModalOpen(false);
  };

  const handleEditItem = (item: SectionItem) => {
    const updatedItems = [...section.items];
    updatedItems[editingItemIndex] = item;

    const updatedSection: ContractSection = {
      ...section,
      items: updatedItems
    };

    onUpdate(updatedSection);
    if (onEditItem) {
      onEditItem(item, editingItemIndex);
    }
    setEditingItem(null);
    setEditingItemIndex(-1);
  };

  const handleDeleteItem = (index: number) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    const updatedItems = section.items.filter((_, i) => i !== index);
    // Reorder indices
    updatedItems.forEach((item, i) => {
      item.orderIndex = i;
    });

    const updatedSection: ContractSection = {
      ...section,
      items: updatedItems
    };

    onUpdate(updatedSection);
    if (onDeleteItem) {
      onDeleteItem(index);
    }
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const updatedItems = [...section.items];
    const [moved] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, moved);

    // Update order indices
    updatedItems.forEach((item, i) => {
      item.orderIndex = i;
    });

    const updatedSection: ContractSection = {
      ...section,
      items: updatedItems
    };

    onUpdate(updatedSection);
    if (onReorder) {
      onReorder(fromIndex, toIndex);
    }
  };

  const handleEditClauseClick = (index: number) => {
    const item = filteredItems[index];
    if (item.itemType === ItemType.CLAUSE && onEditClause) {
      const clause = sectionItemToClause(item);
      if (clause) {
        onEditClause(clause);
      }
    }
  };

  const handleDeleteClauseClick = (index: number) => {
    const originalIndex = section.items.indexOf(filteredItems[index]);
    if (onDeleteClause) {
      onDeleteClause(originalIndex);
    } else {
      handleDeleteItem(originalIndex);
    }
  };

  const handleReorderClauseClick = (fromIndex: number, toIndex: number) => {
    const originalFromIndex = section.items.indexOf(filteredItems[fromIndex]);
    const originalToIndex = section.items.indexOf(filteredItems[toIndex]);

    if (onReorderClause) {
      onReorderClause(originalFromIndex, originalToIndex);
    } else {
      handleReorder(originalFromIndex, originalToIndex);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Add Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search within ${section.title}...`}
            className="w-full px-6 py-3 bg-white border border-aaa-border rounded-xl text-sm font-medium focus:ring-4 focus:ring-aaa-blue/5 focus:border-aaa-blue outline-none shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-aaa-muted hover:text-aaa-blue transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-aaa-border rounded-3xl p-16 text-center">
          <p className="text-aaa-muted font-semibold">
            {searchQuery ? 'No items match your search' : `No items in ${section.title}`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredItems.map((item, index) => {
            // Priority 1: Render as Clause if it's a clause item
            if (item.itemType === ItemType.CLAUSE) {
              const clause = sectionItemToClause(item);
              if (!clause) return null;

              return (
                <div key={`clause-${index}-${clause.clause_number}`}>
                  <ClauseCard
                    clause={clause}
                    onEdit={() => handleEditClauseClick(index)}
                    onDelete={() => handleDeleteClauseClick(index)}
                    onCompare={onCompareClause}
                    onAskAI={onAskAI}
                    searchKeywords={searchKeywords}
                    onToggleVisibility={() => handleToggleVisibility(item)}
                  />
                </div>
              );
            }

            // Priority 2: Render as standard SectionItemCard for everything else
            return (
              <div key={`item-${index}-${item.orderIndex}`}>
                <SectionItemCard
                  item={item}
                  onEdit={() => {
                    setEditingItem(item);
                    setEditingItemIndex(section.items.indexOf(item));
                  }}
                  onDelete={() => handleDeleteItem(section.items.indexOf(item))}
                  onAskAI={onAskAI}
                  searchKeywords={searchKeywords}
                  hideMetadata={false}
                  organizerExtractedData={organizerExtractedData}
                  onToggleVisibility={() => handleToggleVisibility(item)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <ItemEditorModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddItem}
          mode="create"
        />
      )}

      {/* Edit Item Modal */}
      {editingItem && editingItemIndex >= 0 && (
        <ItemEditorModal
          onClose={() => {
            setEditingItem(null);
            setEditingItemIndex(-1);
          }}
          onSave={handleEditItem}
          item={editingItem}
          mode="edit"
        />
      )}
    </div>
  );
};
