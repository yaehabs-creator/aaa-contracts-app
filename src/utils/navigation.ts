
/**
 * Normalizes a clause ID for consistent hyperlink matching.
 * Removes spaces and parentheses to create a safe ID.
 */
export const normalizeClauseId = (clauseNumber: string): string => {
    if (!clauseNumber) return '';
    return clauseNumber
        .replace(/\s+/g, '')  // Remove all spaces
        .replace(/[()]/g, ''); // Remove parentheses
};

/**
 * Scrolls to a specific clause by its ID.
 * Highlights the clause briefly after scrolling.
 */
export const scrollToClause = (clauseNumber: string): boolean => {
    if (!clauseNumber) return false;

    const normalizedId = normalizeClauseId(clauseNumber);
    const elementId = `clause-${normalizedId}`;
    const el = document.getElementById(elementId);

    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight the target clause briefly
        const originalTransition = el.style.transition;
        const originalBoxShadow = el.style.boxShadow;

        el.style.transition = 'box-shadow 0.3s ease';
        el.style.boxShadow = '0 0 0 4px rgba(15, 46, 107, 0.3)';

        // Remove highlight after animation
        setTimeout(() => {
            el.style.boxShadow = originalBoxShadow;
            el.style.transition = originalTransition;
        }, 2000);

        return true;
    }

    console.warn(`Clause element not found: ${elementId}`);
    return false;
};
