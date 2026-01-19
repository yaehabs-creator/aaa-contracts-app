import React from 'react';
import { SectionItem, ItemType } from '../types';

interface SectionItemCardProps {
  item: SectionItem;
  onEdit: () => void;
  onDelete: () => void;
  searchKeywords?: string[];
}

const highlightKeywords = (text: string, keywords: string[]): string => {
  if (!keywords || keywords.length === 0) return text;
  
  let highlighted = text;
  keywords.forEach(keyword => {
    if (keyword.trim().length > 0) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="highlight-keyword" style="background-color: #FEF3C7; color: #92400E; padding: 2px 4px; border-radius: 3px; font-weight: 600;">$1</mark>');
    }
  });
  return highlighted;
};

export const SectionItemCard: React.FC<SectionItemCardProps> = ({ item, onEdit, onDelete, searchKeywords = [] }) => {
  const isParagraph = item.itemType === ItemType.PARAGRAPH;
  const isField = item.itemType === ItemType.FIELD;

  return (
    <div className="bg-white border border-aaa-border rounded-3xl shadow-premium overflow-hidden transition-all duration-300 hover:shadow-xl">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            {isParagraph && item.heading && (
              <h3 className="text-xl font-black text-aaa-blue mb-3 tracking-tight">
                {searchKeywords.length > 0 ? (
                  <span dangerouslySetInnerHTML={{ __html: highlightKeywords(item.heading, searchKeywords) }} />
                ) : (
                  item.heading
                )}
              </h3>
            )}
            {isField && (
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-aaa-blue text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                  Field
                </span>
                <h3 className="text-lg font-black text-aaa-blue tracking-tight">
                  {searchKeywords.length > 0 ? (
                    <span dangerouslySetInnerHTML={{ __html: highlightKeywords(item.fieldKey || '', searchKeywords) }} />
                  ) : (
                    item.fieldKey
                  )}
                </h3>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2.5 bg-white border border-aaa-border text-aaa-muted hover:text-emerald-600 hover:border-emerald-600 rounded-xl transition-all shadow-sm"
              title="Edit Item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-2.5 bg-white border border-aaa-border text-aaa-muted hover:text-red-600 hover:border-red-600 rounded-xl transition-all shadow-sm"
              title="Delete Item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {isParagraph && (
            <div className="font-mono text-sm leading-relaxed text-aaa-text whitespace-pre-wrap">
              {searchKeywords.length > 0 ? (
                <span dangerouslySetInnerHTML={{ __html: highlightKeywords(item.text || '', searchKeywords) }} />
              ) : (
                item.text
              )}
            </div>
          )}

          {isField && (
            <div className="bg-aaa-bg/30 p-6 rounded-2xl border border-aaa-border/50">
              <div className="space-y-2">
                <div className="text-[10px] font-black text-aaa-muted uppercase tracking-widest">
                  Value
                </div>
                <div className="font-mono text-sm leading-relaxed text-aaa-text whitespace-pre-wrap">
                  {searchKeywords.length > 0 ? (
                    <span dangerouslySetInnerHTML={{ __html: highlightKeywords(item.fieldValue || '', searchKeywords) }} />
                  ) : (
                    item.fieldValue
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
