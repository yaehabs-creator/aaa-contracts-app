import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionItem, ItemType } from '../types';

interface SectionItemCardProps {
  item: SectionItem;
  onEdit: () => void;
  onDelete: () => void;
  searchKeywords?: string[];
  hideMetadata?: boolean;
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

export const SectionItemCard: React.FC<SectionItemCardProps> = React.memo(({
  item,
  onEdit,
  onDelete,
  searchKeywords = [],
  hideMetadata = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isParagraph = item.itemType === ItemType.PARAGRAPH;
  const isField = item.itemType === ItemType.FIELD;
  const isImage = item.itemType === ItemType.IMAGE;

  // Technical field keys (e.g. field_123456789) should be hidden in presentation
  const isTechnicalKey = item.fieldKey?.startsWith('field_') && !isNaN(Number(item.fieldKey.split('_')[1]));
  const shouldShowFieldHeader = isField;

  return (
    <div className={`bg-white border ${isExpanded ? 'border-aaa-blue ring-2 ring-aaa-blue/5' : 'border-aaa-border'} rounded-3xl shadow-premium overflow-hidden transition-all duration-500 hover:shadow-xl`}>
      <div className="p-0">
        {/* Header - Clickable area */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className={`px-8 py-6 flex items-start justify-between cursor-pointer group/header transition-colors ${isExpanded ? 'bg-aaa-blue/[0.02]' : 'hover:bg-aaa-bg/30'}`}
        >
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

            {(item as any).isIntegrated && (
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Integrated Source</span>
              </div>
            )}

            {shouldShowFieldHeader && (
              <div className="flex items-center gap-3 mb-3">
                {!hideMetadata && (
                  <span className={`px-3 py-1 ${isTechnicalKey ? 'bg-amber-500' : 'bg-aaa-blue'} text-white text-[10px] font-black rounded-full uppercase tracking-widest`}>
                    {isTechnicalKey ? 'Extracted Item' : 'Field'}
                  </span>
                )}
                <h3 className="text-lg font-black text-aaa-blue tracking-tight">
                  {searchKeywords.length > 0 ? (
                    <span dangerouslySetInnerHTML={{ __html: highlightKeywords(isTechnicalKey ? (item.heading || 'Data Segment') : (item.fieldKey || ''), searchKeywords) }} />
                  ) : (
                    isTechnicalKey ? (item.heading || 'Data Segment') : item.fieldKey
                  )}
                </h3>
              </div>
            )}

            {isImage && (
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-purple-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                  Image
                </span>
                <h3 className="text-lg font-black text-aaa-blue tracking-tight">
                  {item.imageTitle || item.heading || 'Image'}
                </h3>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-2.5 rounded-xl transition-all ${isExpanded ? 'bg-aaa-blue text-white' : 'text-aaa-muted hover:text-aaa-blue hover:bg-aaa-bg'}`}
              title={isExpanded ? "Collapse" : "Expand to view full content"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="w-[1px] h-6 bg-aaa-border mx-1" />
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

        {/* Expandable Content Area */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden"
            >
              <div className="px-8 pb-8 space-y-6 pt-2">
                {isParagraph && (
                  <div className={`${hideMetadata ? 'bg-transparent' : 'bg-aaa-bg/30 p-6'} rounded-2xl border ${hideMetadata ? 'border-none' : 'border-aaa-border/50'} space-y-4`}>
                    <div className="font-mono text-sm leading-relaxed text-aaa-text whitespace-pre-wrap">
                      {searchKeywords.length > 0 ? (
                        <span dangerouslySetInnerHTML={{ __html: highlightKeywords(item.text || '', searchKeywords) }} />
                      ) : (
                        item.text
                      )}
                    </div>

                    {!hideMetadata && (item.status || item.confidence !== undefined || item.evidence) && (
                      <div className="pt-4 border-t border-aaa-border/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {item.status && (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${item.status === 'extracted' ? 'bg-emerald-100 text-emerald-700' :
                                item.status === 'uncertain' ? 'bg-amber-100 text-amber-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                {item.status}
                              </span>
                            )}
                            {item.confidence !== undefined && (
                              <div className="flex items-center gap-2">
                                <div className="text-[9px] font-bold text-aaa-muted">
                                  {Math.round(item.confidence * 100)}% Confidence
                                </div>
                                <div className="w-12 h-1 bg-aaa-border rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${item.confidence > 0.8 ? 'bg-emerald-500' :
                                      item.confidence > 0.5 ? 'bg-amber-500' : 'bg-red-500'
                                      }`}
                                    style={{ width: `${item.confidence * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          {item.evidence && item.evidence.page && (
                            <span className="text-[9px] font-black text-aaa-muted uppercase tracking-widest">
                              Page {item.evidence.page}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isField && (
                  <div className={`${hideMetadata ? 'bg-transparent p-0' : 'bg-aaa-bg/30 p-6'} rounded-2xl border ${hideMetadata ? 'border-none' : 'border-aaa-border/50'} space-y-4`}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        {!hideMetadata && (
                          <div className="text-[10px] font-black text-aaa-muted uppercase tracking-widest">
                            Value
                          </div>
                        )}
                        <div className={`font-mono ${hideMetadata ? 'text-base font-medium' : 'text-sm'} leading-relaxed text-aaa-text whitespace-pre-wrap`}>
                          {searchKeywords.length > 0 ? (
                            <span dangerouslySetInnerHTML={{ __html: highlightKeywords(item.fieldValue || '', searchKeywords) }} />
                          ) : (
                            item.fieldValue
                          )}
                        </div>
                      </div>

                      {!hideMetadata && (item.status || item.confidence !== undefined) && (
                        <div className="flex flex-col items-end gap-2 ml-6 pl-6 border-l border-aaa-border/50">
                          {item.status && (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${item.status === 'extracted' ? 'bg-emerald-100 text-emerald-700' :
                              item.status === 'uncertain' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                              {item.status}
                            </span>
                          )}
                          {item.confidence !== undefined && (
                            <div className="flex flex-col items-end gap-1">
                              <div className="text-[9px] font-bold text-aaa-muted">
                                {Math.round(item.confidence * 100)}% Confidence
                              </div>
                              <div className="w-16 h-1 bg-aaa-border rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${item.confidence > 0.8 ? 'bg-emerald-500' :
                                    item.confidence > 0.5 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                  style={{ width: `${item.confidence * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!hideMetadata && item.evidence && item.evidence.snippet && (
                      <div className="pt-4 border-t border-aaa-border/30">
                        <div className="text-[9px] font-black text-aaa-muted uppercase tracking-widest mb-2 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Evidence (Page {item.evidence.page})
                        </div>
                        <div className="text-[11px] leading-relaxed text-aaa-muted italic bg-white/50 p-3 rounded-xl border border-aaa-border/20">
                          "{item.evidence.snippet}"
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isImage && item.imageUrl && (
                  <div className="bg-aaa-bg/30 p-6 rounded-2xl border border-aaa-border/50">
                    <div className="space-y-4">
                      <div className="relative w-full flex justify-center items-center bg-white rounded-xl p-4 border border-aaa-border/50">
                        <img
                          src={item.imageUrl}
                          alt={item.imageAlt || item.imageTitle || 'Image'}
                          title={item.imageTitle}
                          className="max-w-full max-h-[600px] w-auto h-auto rounded-lg shadow-lg object-contain"
                        />
                      </div>
                      {(item.imageAlt || item.imageTitle) && (
                        <div className="text-center space-y-1">
                          {item.imageTitle && <div className="text-sm font-semibold text-aaa-blue">{item.imageTitle}</div>}
                          {item.imageAlt && <div className="text-xs text-aaa-muted italic">{item.imageAlt}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Preview Area */}
        {!isExpanded && (
          <div className="px-8 pb-8 flex flex-col gap-2">
            <div className="font-mono text-sm leading-relaxed text-aaa-text/60 line-clamp-2 italic">
              {isParagraph ? (item.text || 'No content preview') : (item.fieldValue || 'No value preview')}
            </div>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-[10px] font-black text-aaa-blue uppercase tracking-widest hover:text-aaa-navy transition-colors text-left flex items-center gap-2 group"
            >
              Expand to View full content
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
