import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionItem, ItemType, ExtractedData } from '../types';
import { PDFViewer } from './PDFViewer';
import { useAuth } from '../src/contexts/AuthContext';

interface SectionItemCardProps {
  item: SectionItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisibility?: () => void;
  searchKeywords?: string[];
  hideMetadata?: boolean;
  organizerExtractedData?: ExtractedData[];
  onAskAI?: (item: SectionItem) => void;
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
  hideMetadata = false,
  organizerExtractedData = [],
  onAskAI,
  onToggleVisibility
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isAdmin } = useAuth();

  // For integrated items, try to find the original document metadata
  const integratedData = (item as any).isIntegrated ?
    organizerExtractedData.find(d => d.id === item.id || (item.fieldKey && d.field_key === item.fieldKey)) : null;

  const doc_url = item.doc_url || integratedData?.doc_url;
  const doc_name = item.doc_name || integratedData?.doc_name;

  const isParagraph = item.itemType === ItemType.PARAGRAPH;
  const isField = item.itemType === ItemType.FIELD;
  const isImage = item.itemType === ItemType.IMAGE;
  const isPdf = item.itemType === ItemType.PDF || !!doc_url;

  return (
    <div className={`group bg-white border ${isExpanded ? 'border-aaa-blue ring-4 ring-aaa-blue/5' : item.isHidden ? 'border-amber-400 bg-amber-50/20 ring-4 ring-amber-400/5' : 'border-slate-200/60'} rounded-[2rem] shadow-sm overflow-hidden transition-all duration-500 hover:shadow-xl hover:border-aaa-blue/20 ${item.isHidden && !isAdmin() ? 'hidden' : ''}`}>
      <div className={`p-0 ${item.isHidden ? 'opacity-75' : ''}`}>
        {/* Header Area */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className={`px-8 py-7 flex items-start justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-aaa-blue/[0.01]' : 'hover:bg-slate-50/50'}`}
        >
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-3 mb-2.5">
              {item.isHidden && isAdmin() && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 border border-amber-200 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                  <span className="text-[8px] font-black text-amber-700 uppercase tracking-widest">Admin Only (Hidden)</span>
                </div>
              )}
              {(item as any).isIntegrated && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100/50 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">AI Sync</span>
                </div>
              )}
              {isField && !hideMetadata && (
                <span className="text-[8px] font-black text-aaa-blue/50 uppercase tracking-widest px-2 py-0.5 bg-aaa-blue/5 rounded-full">
                  Property
                </span>
              )}
              {isImage && (
                <span className="text-[8px] font-black text-purple-600/50 uppercase tracking-widest px-2 py-0.5 bg-purple-50 rounded-full">
                  Visualization
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-snug group-hover:text-aaa-blue transition-colors">
              {searchKeywords.length > 0 ? (
                <span dangerouslySetInnerHTML={{ __html: highlightKeywords(item.heading || item.fieldKey || doc_name || (isPdf ? 'Document Attachment' : 'Untitled Record'), searchKeywords) }} />
              ) : (
                item.heading || item.fieldKey || doc_name || (isPdf ? 'Document Attachment' : 'Untitled Record')
              )}
            </h3>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Action Buttons - More subtle */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {isAdmin() && (
                <button
                  onClick={onToggleVisibility}
                  className={`p-2 rounded-xl transition-all ${item.isHidden ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-aaa-blue hover:bg-slate-50'}`}
                  title={item.isHidden ? "Make Visible to Everyone" : "Hide from Non-Admins"}
                >
                  {item.isHidden ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              )}
              <button
                onClick={onEdit}
                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                title="Edit"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={onDelete}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Remove"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div className="w-px h-6 bg-slate-100 mx-1" />

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-2 rounded-full transition-all ${isExpanded ? 'bg-aaa-blue text-white shadow-lg shadow-indigo-200' : 'bg-slate-50 text-slate-400 hover:text-aaa-blue hover:bg-white hover:shadow-sm'}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden bg-slate-50/30"
            >
              <div className="px-8 pb-10 space-y-8 pt-2">
                {/* Paragraph/PDF Content */}
                {(isParagraph || isPdf) && (
                  <div className="space-y-6">
                    {!isPdf ? (
                      <div className="text-[13px] leading-[1.8] text-slate-600 font-medium font-inter whitespace-pre-wrap px-4 border-l-2 border-slate-200">
                        {searchKeywords.length > 0 ? (
                          <span dangerouslySetInnerHTML={{ __html: highlightKeywords(item.text || '', searchKeywords) }} />
                        ) : (
                          item.text
                        )}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="flex items-center gap-5 p-5 bg-white border border-slate-200/60 rounded-[1.5rem] shadow-sm">
                          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">{doc_name || 'Verification Document'}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Resource • {isPdf ? 'PDF' : 'Text'}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (doc_url) window.open(doc_url, '_blank');
                            }}
                            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-aaa-blue transition-all"
                          >
                            View Original
                          </button>
                        </div>
                        {doc_url && (
                          <div className="h-[600px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
                            <PDFViewer url={doc_url} title={doc_name} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Field Value */}
                {isField && (
                  <div className="px-6 py-5 bg-white border border-slate-200/60 rounded-[1.5rem] shadow-sm group/field">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Extracted Attribute</span>
                      <div className="flex items-center gap-4">
                        {item.confidence !== undefined && (
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-slate-400">{Math.round(item.confidence * 100)}% Match</span>
                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.confidence > 0.8 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                style={{ width: `${item.confidence * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-[14px] font-bold text-slate-800 leading-relaxed font-inter">
                      {searchKeywords.length > 0 ? (
                        <span dangerouslySetInnerHTML={{ __html: highlightKeywords(item.fieldValue || '', searchKeywords) }} />
                      ) : (
                        item.fieldValue
                      )}
                    </div>
                  </div>
                )}

                {/* Evidence Snippet */}
                {item.evidence?.snippet && (
                  <div className="space-y-3 px-6 py-5 bg-emerald-50/30 border border-emerald-100/50 rounded-[1.5rem]">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Contextual Evidence (Page {item.evidence.page})</span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-emerald-800/70 italic font-medium">
                      "{item.evidence.snippet}"
                    </p>
                  </div>
                )}

                {/* AI Interaction */}
                {onAskAI && (
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAskAI(item);
                      }}
                      className="flex items-center gap-2.5 px-6 py-3 bg-white border border-slate-200/60 rounded-2xl text-[11px] font-black text-aaa-blue uppercase tracking-widest shadow-sm hover:shadow-md hover:border-aaa-blue/30 transition-all group/ai"
                    >
                      <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      Query Intelligent Assistant
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Preview */}
        {!isExpanded && (
          <div className="px-8 pb-7 flex flex-col gap-3">
            <div className="h-px w-full bg-slate-50 mb-1" />
            <div className="text-[13px] leading-relaxed text-slate-400 font-medium line-clamp-2">
              {isPdf ? (doc_name || 'Verification metadata available') : isParagraph ? (item.text || 'No preview available') : (item.fieldValue || 'Null value')}
            </div>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em] hover:text-blue-700 transition-colors flex items-center gap-2 group/btn"
            >
              Examine Detail
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
