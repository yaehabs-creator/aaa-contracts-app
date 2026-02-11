
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Clause } from '../types';
import { normalizeClauseId, findClauseElement, scrollToClauseByNumber } from '../src/utils/navigation';
import { TokenizedTextRenderer } from '../src/components/admin/TokenizedTextRenderer';

interface ClauseCardProps {
  clause: Clause;
  onCompare?: (clause: Clause) => void;
  onEdit?: (clause: Clause) => void;
  onDelete?: (clause: Clause) => void;
  isCompareTarget?: boolean;
  searchKeywords?: string[];
}

// Helper function to highlight keywords in HTML text (simple regex approach)
const highlightKeywordsInHTML = (htmlText: string, keywords: string[]): string => {
  if (!htmlText || !keywords || keywords.length === 0) return htmlText;

  let highlightedText = htmlText;

  keywords.forEach(keyword => {
    if (keyword.trim().length > 0) {
      // Escape special regex characters
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match keyword but avoid matching inside HTML tags or existing mark tags
      // This regex matches the keyword only in text content, not in tag attributes
      const regex = new RegExp(`(?!<[^>]*>)(${escapedKeyword})(?![^<]*</mark>)`, 'gi');

      highlightedText = highlightedText.replace(regex, (match) => {
        // Check if we're inside an HTML tag (simple check)
        const beforeMatch = highlightedText.substring(0, highlightedText.indexOf(match));
        const lastOpenTag = beforeMatch.lastIndexOf('<');
        const lastCloseTag = beforeMatch.lastIndexOf('>');

        // If there's an unclosed tag before the match, skip highlighting
        if (lastOpenTag > lastCloseTag) {
          return match;
        }

        return `<mark class="highlight-keyword" style="background-color: #FEF3C7; color: #92400E; padding: 2px 4px; border-radius: 3px; font-weight: 600;">${match}</mark>`;
      });
    }
  });

  return highlightedText;
};

export const ClauseCard: React.FC<ClauseCardProps> = React.memo(({ clause, onCompare, onEdit, onDelete, isCompareTarget, searchKeywords = [] }) => {
  const isDual = !!clause.general_condition || !!clause.particular_condition;
  const textLength = clause.clause_text?.length || 0;
  const [isCollapsed, setIsCollapsed] = useState(textLength > 1200);
  const [copied, setCopied] = useState(false);

  const modCount = clause.comparison?.length || 0;
  const normalizedClauseId = normalizeClauseId(clause.clause_number);

  // Check if this is an "added" clause (has PC content but no GC content)
  const isAddedClause = !!(clause.particular_condition && clause.particular_condition.length > 0) &&
    (!clause.general_condition || clause.general_condition.length === 0);

  // Handle hyperlink clicks for smooth scrolling to clause references
  // Supports multiple link formats: .clause-link, href="#clause-X", href="clause-X", 
  // and text containing clause references
  // Uses fuzzy matching to find clauses even if ID format differs slightly
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if clicked element is a link or inside a link
      const link = target.closest('a') as HTMLAnchorElement;
      if (!link) return;

      const href = link.getAttribute('href') || '';
      const dataClauseId = link.getAttribute('data-clause-id');
      const linkText = link.textContent || '';

      // Skip external links
      if (href.startsWith('http') || href.startsWith('mailto:')) return;

      // Extract clause number from various formats
      let clauseNumber: string | null = null;

      // Priority 1: data-clause-id attribute (most reliable)
      if (dataClauseId) {
        clauseNumber = dataClauseId;
      }
      // Priority 2: href="#clause-X" format
      else if (href.startsWith('#clause-')) {
        clauseNumber = href.replace('#clause-', '');
      }
      // Priority 3: href="clause-X" format (without #)
      else if (href.startsWith('clause-')) {
        clauseNumber = href.replace('clause-', '');
      }
      // Priority 4: href="#X.X" or href="#6A.2" format (direct clause number)
      else if (href.match(/^#\d+[A-Za-z]?(?:\.\d+[A-Za-z]?)*$/)) {
        clauseNumber = href.replace('#', '');
      }
      // Priority 5: Extract from link text containing "Clause X" or "Sub-clause X"
      else if (href === '#' || href === '' || !href.startsWith('http')) {
        const clauseMatch = linkText.match(/(?:Clause|Sub-[Cc]lause)\s+([0-9]+[A-Za-z]?(?:\.[0-9]+[A-Za-z]?)*(?:\s*\([a-z0-9]+\))?)/i);
        if (clauseMatch) {
          clauseNumber = clauseMatch[1];
        }
      }

      // If we found a clause number, try to scroll to it using fuzzy matching
      if (clauseNumber) {
        e.preventDefault();
        e.stopPropagation();

        // Use the fuzzy matching function that tries multiple ID formats
        const found = scrollToClauseByNumber(clauseNumber);

        if (!found) {
          // Also try with findClauseElement for additional fuzzy matching
          const targetElement = findClauseElement(clauseNumber);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            targetElement.classList.add('clause-highlight');
            targetElement.style.transition = 'box-shadow 0.3s ease';
            targetElement.style.boxShadow = '0 0 0 4px rgba(15, 46, 107, 0.3)';
            setTimeout(() => {
              targetElement.style.boxShadow = '';
              targetElement.classList.remove('clause-highlight');
            }, 2000);
          } else {
            console.warn(`Clause not found: ${clauseNumber}`);
            toast.error(`Clause ${clauseNumber} not found in this contract.`, {
              duration: 4000,
              icon: '🔍',
            });
          }
        }
      }
    };

    // Add event listener to document to catch all hyperlink clicks
    document.addEventListener('click', handleLinkClick);
    return () => {
      document.removeEventListener('click', handleLinkClick);
    };
  }, []);

  const handleCopy = () => {
    const temp = document.createElement("div");
    temp.innerHTML = clause.clause_text;
    const cleanText = temp.textContent || temp.innerText || "";
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      id={`clause-${normalizedClauseId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2, boxShadow: '0 8px 32px -4px rgba(29,78,216,0.15), 0 0 0 1px rgba(29,78,216,0.08)' }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        opacity: { duration: 0.3 }
      }}
      className={`relative group bg-white border rounded-mac-lg shadow-mac overflow-hidden ${isCompareTarget ? 'border-mac-blue ring-2 ring-mac-blue/20' : 'border-surface-border'
        }`}
    >
      {/* Header - MacBook style */}
      <div className="flex flex-wrap items-center justify-between px-8 py-5 border-b border-surface-border bg-surface-bg/50">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-medium uppercase tracking-wider text-mac-muted mb-1.5">Clause</span>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-mac-blue rounded-mac-xs">
                <span className="text-lg font-bold text-white tracking-tight mono">{clause.clause_number}</span>
              </div>
              <h3 className="text-xl font-semibold text-mac-navy tracking-tight group-hover:text-mac-blue transition-colors">
                {clause.clause_title || 'Untitled'}
              </h3>
            </div>
          </div>
          <div className="hidden sm:block h-8 w-px bg-surface-border mx-2" />
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 text-[10px] font-medium rounded-full ${clause.condition_type === 'General'
              ? 'bg-slate-100 text-slate-600 border border-slate-200'
              : clause.condition_type === 'Both'
                ? 'bg-blue-600 text-white'
                : 'bg-purple-600 text-white'
              }`}>
              {clause.condition_type}
            </span>
            {isAddedClause && (
              <span className="px-3 py-1 text-[10px] font-medium rounded-full bg-emerald-500 text-white">
                Added
              </span>
            )}
            {clause.section && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-medium rounded-full">
                Section {clause.section}
              </span>
            )}
            {modCount > 0 && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-medium rounded-full">
                {modCount} Modifications
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(clause)}
              className="p-2.5 bg-white border border-surface-border text-mac-muted hover:text-emerald-600 hover:border-emerald-500 rounded-mac-xs transition-all"
              title="Edit Clause"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(clause)}
              className="p-2.5 bg-white border border-surface-border text-mac-muted hover:text-red-500 hover:border-red-400 rounded-mac-xs transition-all"
              title="Delete Clause"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button onClick={handleCopy} className="p-2.5 bg-white border border-surface-border text-mac-muted hover:text-mac-blue hover:border-mac-blue rounded-mac-xs transition-all">
            {copied ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1" /></svg>}
          </button>
          {onCompare && (
            <button onClick={() => onCompare(clause)} className="px-5 py-2.5 bg-mac-blue text-white hover:bg-mac-blue-hover text-xs font-medium rounded-mac-xs transition-all flex items-center gap-2">
              Analyze
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Content - MacBook style */}
      <div className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-surface-border">
          {/* Baseline Side */}
          <div className="p-8 bg-surface-bg/30">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-medium text-mac-muted uppercase tracking-wider">General Conditions</span>
            </div>
            <div className={`font-mono text-sm leading-relaxed text-mac-charcoal whitespace-pre-wrap transition-all duration-500 overflow-hidden ${isCollapsed ? 'max-h-[300px]' : 'max-h-none'}`}>
              <div className="font-semibold text-mac-navy mb-3 border-b border-surface-border pb-2">{clause.clause_number} {clause.clause_title}</div>
              {clause.general_condition ? (
                // Use TokenizedTextRenderer if tokens are available, otherwise fallback to HTML
                clause.gc_link_tokens && clause.gc_link_tokens.length > 0 ? (
                  <TokenizedTextRenderer
                    tokens={clause.gc_link_tokens}
                    rawText={clause.general_condition}
                    className="verbatim-content"
                  />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: searchKeywords.length > 0 ? highlightKeywordsInHTML(clause.general_condition, searchKeywords) : clause.general_condition }} className="verbatim-content" />
                )
              ) : clause.condition_type === 'General' && clause.clause_text ? (
                <div dangerouslySetInnerHTML={{ __html: searchKeywords.length > 0 ? highlightKeywordsInHTML(clause.clause_text, searchKeywords) : clause.clause_text }} className="verbatim-content" />
              ) : (
                <div className="h-16 flex items-center justify-center border border-dashed border-surface-border rounded-mac-sm bg-surface-bg text-xs font-medium text-mac-muted">Not in baseline</div>
              )}
            </div>
          </div>

          {/* Modification Side */}
          <div className="p-8 bg-surface-bg/50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-medium text-mac-muted uppercase tracking-wider">Particular Conditions</span>
            </div>
            <div className={`font-mono text-sm leading-relaxed text-mac-charcoal whitespace-pre-wrap transition-all duration-500 overflow-hidden ${isCollapsed ? 'max-h-[300px]' : 'max-h-none'}`}>
              <div className="font-semibold text-mac-navy mb-3 border-b border-surface-border pb-2">
                {searchKeywords.length > 0 ? (
                  <span dangerouslySetInnerHTML={{ __html: highlightKeywordsInHTML(clause.clause_number + ' ' + clause.clause_title, searchKeywords) }} />
                ) : (
                  <span>{clause.clause_number} {clause.clause_title}</span>
                )}
              </div>
              {clause.particular_condition ? (
                // Use TokenizedTextRenderer if tokens are available, otherwise fallback to HTML
                clause.pc_link_tokens && clause.pc_link_tokens.length > 0 ? (
                  <TokenizedTextRenderer
                    tokens={clause.pc_link_tokens}
                    rawText={clause.particular_condition}
                    className="verbatim-content"
                  />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: searchKeywords.length > 0 ? highlightKeywordsInHTML(clause.particular_condition, searchKeywords) : clause.particular_condition }} className="verbatim-content" />
                )
              ) : clause.condition_type === 'Particular' ? (
                <div dangerouslySetInnerHTML={{ __html: searchKeywords.length > 0 ? highlightKeywordsInHTML(clause.clause_text, searchKeywords) : clause.clause_text }} className="verbatim-content" />
              ) : (
                <div className="h-16 flex items-center justify-center border border-dashed border-surface-border rounded-mac-sm bg-white text-xs font-medium text-mac-muted">No particular revision</div>
              )}
            </div>
          </div>
        </div>

        {/* Expand button - MacBook style */}
        {isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-center pb-6 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
            <button onClick={() => setIsCollapsed(false)} className="px-6 py-3 bg-mac-blue text-white text-sm font-medium rounded-mac-sm shadow-mac pointer-events-auto hover:-translate-y-0.5 hover:shadow-mac-hover transition-all">
              Show full content
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});
