/**
 * contractUtils.ts
 *
 * Pure utility functions for contract data manipulation.
 * These functions have NO React dependencies and can be imported anywhere.
 * Extracted from App.tsx to improve maintainability.
 */

import { Clause, SavedContract } from '@/types';
import { getAllClausesFromContract } from '@/services/contractMigrationService';
import { normalizeClauseId, generateClauseIdVariants } from '@/utils/navigation';

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/** Claude Sonnet token limits used for input estimation */
export const CLAUDE_TOKEN_LIMITS = {
  maxInputTokens: 200000,  // Context window
  maxOutputTokens: 16384,  // Output limit (as set in analyzeContract)
  totalBudget: 200000,     // Total context window
};

// ---------------------------------------------------------------------------
// CLAUSE STATUS
// ---------------------------------------------------------------------------

/**
 * Determines the display status of a clause based on its GC/PC fields.
 * - 'added'    → has PC but no GC (net-new clause)
 * - 'modified' → has both GC and PC (modified from baseline)
 * - 'gc-only'  → has only GC (untouched baseline clause)
 */
export const getClauseStatus = (clause: Clause): 'added' | 'modified' | 'gc-only' => {
  const hasPC = clause.particular_condition && clause.particular_condition.length > 0;
  const hasGC = clause.general_condition && clause.general_condition.length > 0;

  if (hasPC && !hasGC) return 'added';
  if (hasPC && hasGC) return 'modified';
  if (hasGC) return 'gc-only';

  // Fallback for single-source contracts (only condition_type is set)
  if (clause.condition_type === 'Particular') return 'added';
  return 'gc-only';
};

// ---------------------------------------------------------------------------
// TOKEN ESTIMATION
// ---------------------------------------------------------------------------

/**
 * Rough estimate of token count from a string.
 * Uses 4 chars/token approximation + 500 token system overhead.
 */
export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / 4) + 500;
};

// ---------------------------------------------------------------------------
// CLAUSE LINK PROCESSING
// ---------------------------------------------------------------------------

/**
 * Strips existing `<a class="clause-link">` tags from text, keeping inner text.
 * Used before re-processing to avoid stacking duplicate links.
 */
export const stripClauseLinks = (text: string | undefined): string => {
  if (!text) return '';
  return text.replace(/<a\s+href="#clause-[^"]*"[^>]*class="clause-link"[^>]*>([^<]*)<\/a>/gi, '$1');
};

/** Module-level LRU cache for linkifyText results */
const linkifyCache = new Map<string, string>();

/**
 * Scans a text string for clause references (e.g. "Clause 4.1") and wraps
 * them in anchor tags pointing to the local clause ID.
 *
 * @param text              - Raw clause text to process
 * @param availableClauseIds - Set of valid clause IDs in the current contract
 * @returns                 - Text with linkified clause references
 */
export const linkifyText = (text: string | undefined, availableClauseIds?: Set<string>): string => {
  if (!text) return '';

  const cacheKey = `${text}|${availableClauseIds?.size || 0}`;
  if (linkifyCache.has(cacheKey)) return linkifyCache.get(cacheKey)!;

  const cleanText = stripClauseLinks(text);

  if (!availableClauseIds || availableClauseIds.size === 0) {
    linkifyCache.set(cacheKey, cleanText);
    return cleanText;
  }

  const pattern = /(?:[Cc]lause|[Ss]ub-[Cc]lause)\s+([0-9]+[A-Za-z]?(?:\.[0-9]+[A-Za-z]?)*(?:\s*\([a-z0-9]+\))?)(?=[\s,;:.)"\]']|$)/g;

  const result = cleanText.replace(pattern, (match, number) => {
    const cleanId = normalizeClauseId(number);
    if (availableClauseIds.has(cleanId)) {
      return `<a href="#clause-${cleanId}" class="clause-link" data-clause-id="${cleanId}">${match}</a>`;
    }
    const variants = generateClauseIdVariants(number);
    for (const variant of variants) {
      if (availableClauseIds.has(variant)) {
        return `<a href="#clause-${variant}" class="clause-link" data-clause-id="${variant}">${match}</a>`;
      }
    }
    return match;
  });

  linkifyCache.set(cacheKey, result);
  return result;
};

/**
 * Re-processes all clause cross-reference links in a list of clauses.
 * Should be called after loading or modifying a contract's clause list.
 */
export const reprocessClauseLinks = (clausesList: Clause[]): Clause[] => {
  const availableClauseIds = new Set<string>();

  clausesList.forEach(c => {
    const normalizedId = normalizeClauseId(c.clause_number);
    availableClauseIds.add(normalizedId);
    const variants = generateClauseIdVariants(c.clause_number);
    variants.forEach(v => availableClauseIds.add(v));
  });

  return clausesList.map(c => {
    const newText = linkifyText(c.clause_text, availableClauseIds);
    const newGC   = linkifyText(c.general_condition, availableClauseIds);
    const newPC   = linkifyText(c.particular_condition, availableClauseIds);

    // Skip object creation if nothing changed (perf optimisation)
    if (newText === c.clause_text && newGC === c.general_condition && newPC === c.particular_condition) {
      return c;
    }

    return { ...c, clause_text: newText, general_condition: newGC, particular_condition: newPC };
  });
};

/**
 * Convenience wrapper: extracts all clauses from a contract AND reprocesses
 * their internal hyperlinks. Use when loading a contract for display.
 */
export const getClausesWithProcessedLinks = (contract: SavedContract): Clause[] => {
  const allClauses = getAllClausesFromContract(contract);
  return reprocessClauseLinks(allClauses);
};

// ---------------------------------------------------------------------------
// SEARCH & FILTER HELPERS
// ---------------------------------------------------------------------------

/**
 * Highlights keyword matches in an HTML text string using <mark> tags.
 */
export const highlightKeywords = (text: string, keywords: string[]): string => {
  if (!text || keywords.length === 0) return text;

  let highlightedText = text;
  keywords.forEach(keyword => {
    if (keyword.trim().length > 0) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedKeyword})`, 'gi');
      highlightedText = highlightedText.replace(regex, match => {
        if (match.includes('<') || match.includes('>') || match.includes('highlight-keyword')) {
          return match;
        }
        return `<mark class="highlight-keyword" style="background-color: #FEF3C7; color: #92400E; padding: 2px 4px; border-radius: 3px; font-weight: 600;">${match}</mark>`;
      });
    }
  });

  return highlightedText;
};

/**
 * Deduplicates clauses by `clause_number + condition_type`, keeping the first occurrence.
 */
export const deduplicateClauses = (clauses: Clause[]): Clause[] => {
  const seen = new Map<string, Clause>();
  const result: Clause[] = [];

  for (const clause of clauses) {
    const key = `${clause.clause_number}|${clause.condition_type}`;
    if (!seen.has(key)) {
      seen.set(key, clause);
      result.push(clause);
    }
  }

  return result;
};

/**
 * Returns true if every keyword in the array can be found (case-insensitive)
 * across all searchable text fields of a clause.
 */
export const matchesSearchKeywords = (clause: Clause, keywords: string[]): boolean => {
  if (keywords.length === 0) return true;

  const searchableText = [
    clause.clause_number,
    clause.clause_title,
    clause.clause_text,
    clause.general_condition  || '',
    clause.particular_condition || '',
  ].join(' ').toLowerCase();

  return keywords.every(keyword => searchableText.includes(keyword.toLowerCase()));
};

// ---------------------------------------------------------------------------
// SORTING
// ---------------------------------------------------------------------------

/**
 * Compares two clause number strings numerically (e.g. "4.2.1" < "4.10").
 * Handles mixed alphanumeric parts like "2A.1".
 */
export const compareClauseNumbers = (a: string, b: string): number => {
  const parse = (s: string) =>
    s.split('.').map(x => {
      const num = parseInt(x, 10);
      return !isNaN(num) && x === num.toString()
        ? { type: 'number' as const, value: num, str: x }
        : { type: 'string' as const, value: 0,   str: x };
    });

  const aP = parse(a);
  const bP = parse(b);

  for (let i = 0; i < Math.max(aP.length, bP.length); i++) {
    const aPart = aP[i] || { type: 'number' as const, value: 0, str: '' };
    const bPart = bP[i] || { type: 'number' as const, value: 0, str: '' };

    if (aPart.type === 'number' && bPart.type === 'number') {
      if (aPart.value !== bPart.value) return aPart.value - bPart.value;
    } else {
      const aStr = aPart.str.toLowerCase();
      const bStr = bPart.str.toLowerCase();
      if (aStr !== bStr) {
        const aNum = parseInt(aStr, 10);
        const bNum = parseInt(bStr, 10);
        if (!isNaN(aNum) && isNaN(bNum)) return -1;
        if (isNaN(aNum) && !isNaN(bNum)) return 1;
        return aStr.localeCompare(bStr);
      }
    }
  }
  return 0;
};
