
/**
 * Normalizes a clause ID for consistent hyperlink matching.
 * Handles various formats:
 * - Standard: "1.1", "2.3.4"
 * - Alphanumeric: "6A", "6A.2", "9.1A"
 * - Sub-parts: "1.6 (b)", "1.6(b)", "1.6 b"
 * 
 * Removes spaces and parentheses to create a safe, consistent ID.
 */
export const normalizeClauseId = (clauseNumber: string): string => {
    if (!clauseNumber) return '';
    return clauseNumber
        .trim()
        .replace(/\s+/g, '')      // Remove all spaces
        .replace(/[()]/g, '')     // Remove parentheses
        .replace(/[[\]]/g, '')    // Remove brackets
        .toLowerCase()            // Normalize case for matching
        .replace(/^clause-?/i, '') // Remove "clause-" prefix if present
        .toUpperCase();           // Convert back to uppercase for display consistency
};

/**
 * Generates multiple possible ID formats for fuzzy matching.
 * This helps find clauses even if the stored ID format differs slightly.
 */
export const generateClauseIdVariants = (clauseNumber: string): string[] => {
    if (!clauseNumber) return [];
    
    const base = clauseNumber.trim();
    const normalized = normalizeClauseId(base);
    
    // Generate various formats that might match
    const variants = new Set<string>();
    
    // Add normalized version
    variants.add(normalized);
    
    // Add with different case combinations for alphanumeric
    variants.add(normalized.toLowerCase());
    variants.add(normalized.toUpperCase());
    
    // Add version without any letters (for cases like "6A" -> "6")
    const numericOnly = normalized.replace(/[A-Za-z]/g, '');
    if (numericOnly && numericOnly !== normalized) {
        variants.add(numericOnly);
    }
    
    // Add version with sub-part variations
    // "1.6b" -> "1.6.b", "1.6(b)"
    const subPartMatch = normalized.match(/^(\d+(?:\.\d+)*)([A-Za-z])$/);
    if (subPartMatch) {
        variants.add(`${subPartMatch[1]}.${subPartMatch[2]}`);
        variants.add(`${subPartMatch[1]}${subPartMatch[2].toLowerCase()}`);
        variants.add(`${subPartMatch[1]}${subPartMatch[2].toUpperCase()}`);
    }
    
    return Array.from(variants);
};

/**
 * Highlights a clause element with a brief animation.
 */
const highlightClause = (el: HTMLElement): void => {
    const originalTransition = el.style.transition;
    const originalBoxShadow = el.style.boxShadow;

    el.style.transition = 'box-shadow 0.3s ease';
    el.style.boxShadow = '0 0 0 4px rgba(15, 46, 107, 0.3)';

    // Remove highlight after animation
    setTimeout(() => {
        el.style.boxShadow = originalBoxShadow;
        el.style.transition = originalTransition;
    }, 2000);
};

/**
 * Finds a clause element by trying multiple ID formats.
 * Returns the element if found, null otherwise.
 */
export const findClauseElement = (clauseNumber: string): HTMLElement | null => {
    if (!clauseNumber) return null;
    
    // Try exact normalized ID first
    const normalizedId = normalizeClauseId(clauseNumber);
    let el = document.getElementById(`clause-${normalizedId}`);
    if (el) return el;
    
    // Try all variants
    const variants = generateClauseIdVariants(clauseNumber);
    for (const variant of variants) {
        el = document.getElementById(`clause-${variant}`);
        if (el) return el;
    }
    
    // Fuzzy search: look for elements with IDs starting with "clause-" 
    // and check if any contain our clause number
    const allClauseElements = document.querySelectorAll('[id^="clause-"]');
    for (const element of allClauseElements) {
        const elementId = element.id.replace('clause-', '');
        // Check if the element ID matches any of our variants (case-insensitive)
        if (variants.some(v => v.toLowerCase() === elementId.toLowerCase())) {
            return element as HTMLElement;
        }
    }
    
    return null;
};

/**
 * Scrolls to a specific clause by its ID.
 * Highlights the clause briefly after scrolling.
 */
export const scrollToClause = (clauseNumber: string): boolean => {
    if (!clauseNumber) return false;

    const el = findClauseElement(clauseNumber);

    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightClause(el);
        return true;
    }

    console.warn(`Clause element not found for: ${clauseNumber}`);
    return false;
};

/**
 * Scrolls to a clause by its number with fuzzy matching.
 * Tries multiple ID formats and falls back to searching all clause elements.
 * This is the preferred function for hyperlink click handlers.
 */
export const scrollToClauseByNumber = (clauseNumber: string): boolean => {
    if (!clauseNumber) return false;
    
    const el = findClauseElement(clauseNumber);
    
    if (el) {
        // Scroll with offset for better visibility
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Small delay before highlighting to let scroll complete
        setTimeout(() => highlightClause(el), 100);
        return true;
    }
    
    console.warn(`Could not find clause element for: ${clauseNumber}`);
    return false;
};
