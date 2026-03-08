/**
 * Clause Link Utilities — Extracted from App.tsx
 * 
 * Handles clause cross-referencing: linking, stripping, reprocessing, highlighting.
 */

import { Clause } from '@/types';
import { normalizeClauseId, generateClauseIdVariants } from './navigation';

/** Strip existing clause hyperlinks from text and keep the inner text */
export function stripClauseLinks(text: string | undefined): string {
    if (!text) return '';
    return text.replace(
        /<a\s+href="#clause-[^"]*"[^>]*class="clause-link"[^>]*>([^<]*)<\/a>/gi,
        '$1'
    );
}

/** Convert plain-text clause references (e.g. "Clause 14.1") into clickable links */
export function linkifyText(text: string | undefined, availableClauseIds?: Set<string>): string {
    if (!text) return '';

    let cleanText = stripClauseLinks(text);

    if (!availableClauseIds || availableClauseIds.size === 0) {
        return cleanText;
    }

    const pattern =
        /(?:[Cc]lause|[Ss]ub-[Cc]lause)\s+([0-9]+[A-Za-z]?(?:\.[0-9]+[A-Za-z]?)*(?:\s*\([a-z0-9]+\))?)(?=[\s,;:.)\]"]|$)/g;

    return cleanText.replace(pattern, (match, number) => {
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
}

/** Re-process all clause links in a contract's clauses */
export function reprocessClauseLinks(clausesList: Clause[]): Clause[] {
    const availableClauseIds = new Set<string>();

    clausesList.forEach(c => {
        availableClauseIds.add(normalizeClauseId(c.clause_number));
        generateClauseIdVariants(c.clause_number).forEach(v => availableClauseIds.add(v));
    });

    return clausesList.map(c => ({
        ...c,
        clause_text: linkifyText(c.clause_text, availableClauseIds),
        general_condition: linkifyText(c.general_condition, availableClauseIds),
        particular_condition: linkifyText(c.particular_condition, availableClauseIds),
    }));
}

/** Highlight keywords in text for search results */
export function highlightKeywords(text: string, keywords: string[]): string {
    if (!text || keywords.length === 0) return text;

    let highlighted = text;
    keywords.forEach(keyword => {
        if (keyword.trim().length > 0) {
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escaped})`, 'gi');
            highlighted = highlighted.replace(regex, match => {
                if (match.includes('<') || match.includes('>') || match.includes('highlight-keyword')) {
                    return match;
                }
                return `<mark class="highlight-keyword" style="background-color: #FEF3C7; color: #92400E; padding: 2px 4px; border-radius: 3px; font-weight: 600;">${match}</mark>`;
            });
        }
    });

    return highlighted;
}

/** Deduplicate clauses by clause_number + condition_type */
export function deduplicateClauses(clauses: Clause[]): Clause[] {
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
}

/** Get clause status (added, modified, gc-only) for sorting/display */
export function getClauseStatus(clause: Clause): 'added' | 'modified' | 'gc-only' {
    const hasPC = clause.particular_condition && clause.particular_condition.length > 0;
    const hasGC = clause.general_condition && clause.general_condition.length > 0;

    if (hasPC && !hasGC) return 'added';
    if (hasPC && hasGC) return 'modified';
    if (hasGC) return 'gc-only';

    if (clause.condition_type === 'Particular') return 'added';
    return 'gc-only';
}

/** Estimate token count from text (rough: ~4 chars per token) */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4) + 500;
}
