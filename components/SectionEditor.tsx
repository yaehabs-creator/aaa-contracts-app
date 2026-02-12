import React, { useState, useMemo } from 'react';
import { ContractSection, SectionItem, SectionType, ItemType, Clause } from '../types';
import { ClauseCard } from './ClauseCard';
import { SectionItemCard } from './SectionItemCard';
import { ItemEditorModal } from './ItemEditorModal';
import { sectionItemToClause } from '../services/contractMigrationService';

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
}

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
  onAddClause
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<SectionItem | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number>(-1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Check if this is a clause section
  const isClauseSection =
    section.sectionType === SectionType.GENERAL ||
    section.sectionType === SectionType.PARTICULAR ||
    section.sectionType === SectionType.TENDER ||
    section.sectionType === SectionType.REQUIREMENTS ||
    section.sectionType === SectionType.PROPOSAL ||
    section.sectionType === SectionType.SPECIFICATION ||
    section.sectionType === SectionType.INSTRUCTION ||
    section.title === 'Conditions';

  // Check if this is an item/document section
  const isItemSection =
    section.sectionType === SectionType.AGREEMENT ||
    section.sectionType === SectionType.LOA ||
    section.sectionType === SectionType.DRAWINGS ||
    section.sectionType === SectionType.BOQ ||
    section.sectionType === SectionType.SCHEDULE ||
    section.sectionType === SectionType.ANNEX ||
    section.sectionType === SectionType.ADDENDUM ||
    section.sectionType === SectionType.AUTOMATION ||
    section.sectionType === SectionType.EXTRAS;

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return section.items;
    }

    const keywords = searchQuery.trim().toLowerCase().split(/\s+/);

    return section.items.filter(item => {
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
      }
      return false;
    });
  }, [section.items, searchQuery]);

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

        {isItemSection && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-aaa-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-aaa-hover transition-all shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        )}
        {isClauseSection && onAddClause && (
          <button
            onClick={onAddClause}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
            Add Clause
          </button>
        )}
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-aaa-border rounded-3xl p-16 text-center">
          <p className="text-aaa-muted font-semibold">
            {searchQuery ? 'No items match your search' : `No items in ${section.title}`}
          </p>
          {!searchQuery && isItemSection && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-6 py-2 bg-aaa-blue text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-aaa-hover transition-all"
            >
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredItems.map((item, index) => {
            if (item.itemType === ItemType.CLAUSE && isClauseSection) {
              const clause = sectionItemToClause(item);
              if (!clause) return null;

              return (
                <div key={`clause-${index}-${clause.clause_number}`}>
                  <ClauseCard
                    clause={clause}
                    onEdit={() => handleEditClauseClick(index)}
                    onDelete={() => handleDeleteClauseClick(index)}
                    onCompare={onCompareClause}
                    searchKeywords={searchKeywords}
                  />
                </div>
              );
            } else if (isItemSection) {
              return (
                <div key={`item-${index}-${item.orderIndex}`}>
                  <SectionItemCard
                    item={item}
                    onEdit={() => {
                      setEditingItem(item);
                      setEditingItemIndex(section.items.indexOf(item));
                    }}
                    onDelete={() => handleDeleteItem(section.items.indexOf(item))}
                    searchKeywords={searchKeywords}
                  />
                </div>
              );
            }
            return null;
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
