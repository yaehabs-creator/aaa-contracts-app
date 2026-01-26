import { Clause } from '../../types';
import { normalizeClauseId, generateClauseIdVariants } from './navigation';

/**
 * Converts clause references in text to clickable hyperlinks.
 * Supports formats like "Clause 2.1", "Sub-clause 22A.1", etc.
 * Only creates links for clauses that exist in the availableClauseIds set.
 */
export const linkifyText = (text: string | undefined, availableClauseIds?: Set<string>): string => {
    if (!text) return "";

    // If no available clause IDs provided, return text without links
    if (!availableClauseIds || availableClauseIds.size === 0) {
        return text;
    }

    // Strict pattern for clause references:
    // - Must have "Clause" or "Sub-clause" followed by a proper clause number
    // - Number must have at least one digit, optionally followed by decimal parts and letters
    // - Must be followed by word boundary, punctuation, or end of string
    // Examples: "Clause 1", "Clause 1.1", "Clause 2A", "Clause 6A.2", "Clause 2.1.3", "Sub-clause 1.6 (b)"
    const pattern = /(?:[Cc]lause|[Ss]ub-[Cc]lause)\s+([0-9]+[A-Za-z]?(?:\.[0-9]+[A-Za-z]?)*(?:\s*\([a-z0-9]+\))?)(?=[\s,;:.)\\]"]|$)/g;

    return text.replace(pattern, (match, number) => {
        // Normalize the clause number to match the ID format used in ClauseCard
        const cleanId = normalizeClauseId(number);

        // Try exact match first
        if (availableClauseIds.has(cleanId)) {
            return `<a href="#clause-${cleanId}" class="clause-link" data-clause-id="${cleanId}">${match}</a>`;
        }

        // Try fuzzy matching with variants (for alphanumeric clauses like 6A.2)
        const variants = generateClauseIdVariants(number);
        for (const variant of variants) {
            if (availableClauseIds.has(variant)) {
                return `<a href="#clause-${variant}" class="clause-link" data-clause-id="${variant}">${match}</a>`;
            }
        }

        // Clause doesn't exist, return original text without link
        return match;
    });
};

/**
 * Re-processes all clause links in a contract's clauses.
 * Builds a set of available clause IDs and applies linkifyText to all text fields.
 */
export const reprocessClauseLinks = (clausesList: Clause[]): Clause[] => {
    // Build Set of all available clause IDs including variants for fuzzy matching
    const availableClauseIds = new Set<string>();

    clausesList.forEach(c => {
        // Add the normalized ID
        const normalizedId = normalizeClauseId(c.clause_number);
        availableClauseIds.add(normalizedId);

        // Also add all variants for fuzzy matching
        const variants = generateClauseIdVariants(c.clause_number);
        variants.forEach(v => availableClauseIds.add(v));
    });

    // Re-process each clause's text fields
    return clausesList.map(c => ({
        ...c,
        clause_text: linkifyText(c.clause_text, availableClauseIds),
        general_condition: linkifyText(c.general_condition, availableClauseIds),
        particular_condition: linkifyText(c.particular_condition, availableClauseIds)
    }));
};
