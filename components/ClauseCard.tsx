
import React, { useState, useEffect } from 'react';
import { Clause } from '../types';

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

// Helper function to normalize clause IDs (matches App.tsx)
const normalizeClauseId = (clauseNumber: string): string => {
  if (!clauseNumber) return '';
  return clauseNumber
    .replace(/\s+/g, '')  // Remove all spaces
    .replace(/[()]/g, ''); // Remove parentheses
};

export const ClauseCard: React.FC<ClauseCardProps> = ({ clause, onCompare, onEdit, onDelete, isCompareTarget, searchKeywords = [] }) => {
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
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if clicked element is a link or inside a link
      const link = target.closest('a') as HTMLAnchorElement;
      if (!link) return;
      
      const href = link.getAttribute('href') || '';
      const dataClauseId = link.getAttribute('data-clause-id');
      const linkText = link.textContent || '';
      
      // Extract clause ID from various formats
      let clauseId: string | null = null;
      
      // Priority 1: data-clause-id attribute (most reliable)
      if (dataClauseId) {
        clauseId = normalizeClauseId(dataClauseId);
      }
      // Priority 2: href="#clause-X" format
      else if (href.startsWith('#clause-')) {
        clauseId = normalizeClauseId(href.replace('#clause-', ''));
      }
      // Priority 3: href="clause-X" format (without #)
      else if (href.startsWith('clause-')) {
        clauseId = normalizeClauseId(href.replace('clause-', ''));
      }
      // Priority 4: href="#X.X" format (direct clause number)
      else if (href.match(/^#\d+(?:[A-Za-z])?(?:\.\d+[A-Za-z]?)*$/)) {
        clauseId = normalizeClauseId(href.replace('#', ''));
      }
      // Priority 5: href="#" with clause reference in text
      else if (href === '#' || href === '') {
        // Try to extract clause number from link text
        const clauseMatch = linkText.match(/(?:Clause|Sub-[Cc]lause)\s+([0-9]+(?:[A-Za-z])?(?:\.[0-9]+[A-Za-z]?)*(?:\s*\([a-z0-9]+\))?)/i);
        if (clauseMatch) {
          clauseId = normalizeClauseId(clauseMatch[1]);
        }
      }
      // Priority 6: Check if link text itself is a clause reference pattern
      else if (!href.startsWith('http') && !href.startsWith('mailto:')) {
        const clauseMatch = linkText.match(/(?:Clause|Sub-[Cc]lause)\s+([0-9]+(?:[A-Za-z])?(?:\.[0-9]+[A-Za-z]?)*(?:\s*\([a-z0-9]+\))?)/i);
        if (clauseMatch) {
          clauseId = normalizeClauseId(clauseMatch[1]);
        }
      }
      
      // If we found a clause ID, try to scroll to it
      if (clauseId) {
        const targetElement = document.getElementById(`clause-${clauseId}`);
        if (targetElement) {
          e.preventDefault();
          e.stopPropagation();
          
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Highlight the target clause briefly
          targetElement.classList.add('clause-highlight');
          targetElement.style.transition = 'box-shadow 0.3s ease';
          targetElement.style.boxShadow = '0 0 0 4px rgba(15, 46, 107, 0.3)';
          
          setTimeout(() => {
            targetElement.style.boxShadow = '';
            targetElement.classList.remove('clause-highlight');
          }, 2000);
        } else {
          // Clause element not found - prevent navigation to broken link
          if (href === '#' || href.startsWith('#clause-') || href.startsWith('clause-')) {
            e.preventDefault();
            console.warn(`Clause element not found: clause-${clauseId}`);
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
    <div
      id={`clause-${normalizedClauseId}`}
      className={`relative group bg-white border rounded-3xl shadow-premium transition-all duration-500 hover:shadow-2xl overflow-hidden card-enter ${isCompareTarget ? 'border-aaa-blue ring-4 ring-aaa-blue/10 scale-[1.01]' : 'border-aaa-border'
        }`}
      style={{
        animation: 'slideInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        animationFillMode: 'both'
      }}
    >
      <div className="flex flex-wrap items-center justify-between px-10 py-6 border-b border-aaa-border bg-slate-50/30">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-aaa-muted mb-2">Matrix Coordinate</span>
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 bg-aaa-blue rounded-lg shadow-lg">
                <span className="text-xl font-black text-white tracking-tighter mono">C.{clause.clause_number}</span>
              </div>
              <h3 className="text-2xl font-black text-aaa-text tracking-tight group-hover:text-aaa-blue transition-colors">
                {clause.clause_number}
              </h3>
            </div>
          </div>
          <div className="hidden sm:block h-10 w-px bg-aaa-border mx-2" />
          <div className="flex flex-wrap gap-2">
            <span className={`px-4 py-1 text-[9px] font-black rounded-full uppercase tracking-widest border ${clause.condition_type === 'General' ? 'bg-white text-aaa-blue border-aaa-blue/30 shadow-sm' : 'bg-aaa-accent text-white border-none shadow-lg'
              }`}>
              {clause.condition_type} Dataset
            </span>
            {isAddedClause && (
              <span className="px-4 py-1 text-[9px] font-black rounded-full uppercase tracking-widest bg-emerald-500 text-white border-none shadow-lg">
                Added Clause
              </span>
            )}
            {clause.section && (
              <span className="px-3 py-1 bg-aaa-blue text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg">
                Section {clause.section}
              </span>
            )}
            {modCount > 0 && (
              <span className="px-3 py-1 bg-aaa-text text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg">
                {modCount} Modifications
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onEdit && (
            <button
              onClick={() => onEdit(clause)}
              className="p-3 bg-white border border-aaa-border text-aaa-muted hover:text-emerald-600 hover:border-emerald-600 rounded-xl transition-all shadow-sm"
              title="Edit Clause"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(clause)}
              className="p-3 bg-white border border-aaa-border text-aaa-muted hover:text-red-600 hover:border-red-600 rounded-xl transition-all shadow-sm"
              title="Delete Clause"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button onClick={handleCopy} className="p-3 bg-white border border-aaa-border text-aaa-muted hover:text-aaa-blue hover:border-aaa-blue rounded-xl transition-all shadow-sm group/copy relative">
            {copied ? <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1" /></svg>}
          </button>
          {onCompare && (
            <button onClick={() => onCompare(clause)} className="px-8 py-3 bg-aaa-blue text-white hover:bg-aaa-hover text-[10px] font-black rounded-xl transition-all uppercase tracking-widest shadow-xl flex items-center gap-3">
              Intelligence View
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-aaa-border">
          {/* Baseline Side */}
          <div className="p-10 bg-aaa-bg/10">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-aaa-muted uppercase tracking-[0.2em]">Baseline: General Conditions</span>
            </div>
            <div className={`font-mono text-[13px] leading-[1.8] text-aaa-text whitespace-pre-wrap transition-all duration-700 overflow-hidden ${isCollapsed ? 'max-h-[350px]' : 'max-h-none'}`}>
              <div className="font-extrabold text-aaa-blue mb-4 border-b border-aaa-blue/5 pb-2">{clause.clause_number} {clause.clause_title}</div>
              {clause.general_condition ? (
                <div dangerouslySetInnerHTML={{ __html: searchKeywords.length > 0 ? highlightKeywordsInHTML(clause.general_condition, searchKeywords) : clause.general_condition }} className="verbatim-content" />
              ) : clause.condition_type === 'General' && clause.clause_text ? (
                <div dangerouslySetInnerHTML={{ __html: searchKeywords.length > 0 ? highlightKeywordsInHTML(clause.clause_text, searchKeywords) : clause.clause_text }} className="verbatim-content" />
              ) : (
                <div className="h-20 flex items-center justify-center border-2 border-dashed border-aaa-border/50 rounded-2xl bg-white/50 text-[10px] font-black uppercase text-aaa-muted opacity-40">Not Present in Baseline</div>
              )}
            </div>
          </div>

          {/* Modification Side */}
          <div className="p-10 bg-aaa-bg/40">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-aaa-muted uppercase tracking-[0.2em]">Revision: Particular Conditions</span>
            </div>
            <div className={`font-mono text-[13px] leading-[1.8] text-aaa-text whitespace-pre-wrap font-medium transition-all duration-700 overflow-hidden ${isCollapsed ? 'max-h-[350px]' : 'max-h-none'}`}>
              <div className="font-extrabold text-aaa-blue mb-4 border-b border-aaa-blue/5 pb-2">
                {searchKeywords.length > 0 ? (
                  <span dangerouslySetInnerHTML={{ __html: highlightKeywordsInHTML(clause.clause_number + ' ' + clause.clause_title, searchKeywords) }} />
                ) : (
                  <span>{clause.clause_number} {clause.clause_title}</span>
                )}
              </div>
              {clause.particular_condition ? (
                <div dangerouslySetInnerHTML={{ __html: searchKeywords.length > 0 ? highlightKeywordsInHTML(clause.particular_condition, searchKeywords) : clause.particular_condition }} className="verbatim-content" />
              ) : clause.condition_type === 'Particular' ? (
                <div dangerouslySetInnerHTML={{ __html: searchKeywords.length > 0 ? highlightKeywordsInHTML(clause.clause_text, searchKeywords) : clause.clause_text }} className="verbatim-content" />
              ) : (
                <div className="h-20 flex items-center justify-center border-2 border-dashed border-aaa-border/50 rounded-2xl bg-white/50 text-[10px] font-black uppercase text-aaa-muted opacity-40">No Particular Revision</div>
              )}
            </div>
          </div>
        </div>

        {isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 h-48 flex items-end justify-center pb-10 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
            <button onClick={() => setIsCollapsed(false)} className="px-12 py-4 bg-aaa-blue text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl pointer-events-auto hover:scale-105 transition-all">Expand Full Verbatim Data</button>
          </div>
        )}
      </div>
    </div>
  );
};
