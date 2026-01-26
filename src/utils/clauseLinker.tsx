
import React from 'react';
import { normalizeClauseId, scrollToClauseByNumber } from './navigation';

interface ClauseLinkerProps {
    text: string;
}

/**
 * Helper to linkify clause references in text.
 * Returns a React Fragment with text and <a> tags.
 */
export const LinkifyClauseReferences: React.FC<ClauseLinkerProps> = ({ text }) => {
    if (!text) return <>{text}</>;

    // Regex breakdown:
    // 1. Prefix (Optional): (Clause|Sub-Clause|Cl\.|Clause:) followed by space(s)
    // 2. Clause Number:
    //    - Starts with digit(s)
    //    - Optional letter immediately after (e.g. 22A)
    //    - Followed by dot and digits/letters (e.g. .1, .3.2)
    //    - Repeat dot segments
    //    - Exclude trailing dots
    // 3. Negative lookahead/checks to avoid dates (e.g. /2026) or simple decimals without prefix?
    //    - The user said "Prefer matching when... Preceded by Clause... OR ... clause-like structure"

    // We will use a function to validate matches to avoid complex regex for "reasonable segment lengths".

    // Matches:
    // Group 1: Prefix (if any)
    // Group 2: The Number
    const regex = /((?:(?:Clause|Sub-Clause|Cl\.|Clause:)\s+)?)((\d+[A-Z]?)(?:\.\d+[A-Z]?)+|(?<=\b(?:Clause|Sub-Clause|Cl\.|Clause:)\s+)\d+[A-Z]?)/gi;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    // We need to use exec to iterate
    // However, since we want to handle the "OR" logic (prefix vs structure), strict regex is better.

    // Let's use a simpler approach that captures candidate patterns and validates them.
    // Candidate: "Clause 22A.1", "22A.1", "6B.3.2", "10C.2.1"
    // We want to capture the whole potential reference including the prefix if present, to preserve it in text, 
    // but wrap the NUMBER in the link (or the whole thing? User said "render IT [the reference] as a clickable link".
    // Example: <a ...>22A.1</a>. Prefix "Clause " should probably remain text?
    // User example: <a href="#clause-22A.1" class="clause-ref">22A.1</a>. So prefix is OUTSIDE.

    // Improved Regex:
    // Look for:
    // (Preceded by ValidPrefix)? (NunberPattern)
    // ValidPrefix: Clause, Sub-Clause, Cl., Clause:
    // NumberPattern: DIGITS[LETTER]? (DOT DIGITS[LETTER]?)+   <-- Multi-segment (2.1, 22A.1)
    // OR
    // (Requires Prefix) DIGITS[LETTER]?                      <-- Single segment (Clause 1, Clause 22A)

    const prefixPattern = /(?:Clause|Sub-Clause|Cl\.|Clause:)\s*/i;

    // Split text by a broad pattern that catches potential numbers
    // Then process each part.
    // Actually, replace() with a callback is easier if we return an array. Note: String.replace returns string.
    // valid react approach: scan string and push to array.

    // Master Regex:
    // Group 1: Prefix (optional)
    // Group 2: The Clause Number
    const masterRegex = /((?:Clause|Sub-Clause|Cl\.|Clause:)\s*)?(\b\d+[A-Za-z]?(?:\.[A-Za-z0-9]+)+\b|\b\d+[A-Za-z]?\b)/gi;

    while ((match = masterRegex.exec(text)) !== null) {
        const fullMatch = match[0];
        const prefix = match[1] || ''; // e.g. "Clause "
        const number = match[2];       // e.g. "22A.1" or "1"
        const index = match.index;

        // Validate the match
        const hasPrefix = !!prefix;
        const isMultiSegment = number.includes('.');

        // Validation Rules:
        // 1. If NO prefix, MUST be multi-segment (e.g. "2.1"). Single numbers "1" without prefix are ignored (could be quantity).
        // 2. If NO prefix, prevent dates/fractions.
        //    - Check if followed by "/" or "-" or preceding "/" (handled by \b boundaries somewhat, but need checks)

        let isValid = false;

        if (hasPrefix) {
            // "Clause 1", "Clause 2.3" -> Valid
            isValid = true;
        } else {
            // "2.1", "22A.1" -> Valid
            // "3.14" -> maybe? User said "Avoid common decimal false positives like 3.14 where there’s no clause context (best-effort)"
            // "5/2/2026" -> Regex strictly matches dot, but we should manually check if it looks like a date/currency? 
            // The Regex `\d+[A-Za-z]?(?:\.[A-Za-z0-9]+)+` ensures at least one dot.
            // We exclude "3.14" if it's just a number. But "2.1" is indistinguishable from "3.14" without context.
            // User recommendation: "number matches a “clause-like” structure: at least one dot segment AND segment lengths are reasonable."

            if (isMultiSegment) {
                // Exclude dates like 1.1.2023 if usage is dot-separated.
                // Check segment counts?
                const segments = number.split('.');
                // Date heuristic: year-like segment? (>1900).
                const hasYear = segments.some(s => s.length === 4 && parseInt(s) > 1900 && parseInt(s) < 2100);

                // Exclude currency logic? 3.14. usually space before/after.

                if (!hasYear) {
                    isValid = true;
                }
            }
        }

        if (isValid) {
            // Push preceding text
            if (index > lastIndex) {
                parts.push(text.substring(lastIndex, index));
            }

            // Push Prefix
            if (prefix) {
                parts.push(prefix);
            }

            // Push Link
            parts.push(
                <a
                    key={`${index}-${number}`}
                    href={`#clause-${normalizeClauseId(number)}`}
                    className="clause-ref text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors cursor-pointer"
                    onClick={(e) => {
                        e.preventDefault();
                        const success = scrollToClauseByNumber(number);
                        if (!success) {
                            // Fallback or toast could go here, but for now just log
                            console.warn(`Clause ${number} not found (ID: clause-${normalizeClauseId(number)})`);
                            // Optional: Trigger a toast if context allows
                        }
                    }}
                    title={`Go to Clause ${number}`}
                >
                    {number}
                </a>
            );

            lastIndex = index + fullMatch.length;
        }
    }

    // Push remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return <>{parts}</>;
};

/**
 * Utility to process a string and return ReactNode array directly if needed outside of component.
 * (Ideally use the Component above)
 */
export const linkifyClauseText = (text: string): React.ReactNode => {
    return <LinkifyClauseReferences text={text} />;
};

/**
 * Processes a list of clauses and enhances them with link metadata if necessary.
 * Currently returns clauses as-is since linking is handled at render time or via tokenization.
 * Kept for backward compatibility with contractMigrationService.
 */
export const reprocessClauseLinks = (clauses: any[]): any[] => {
    return clauses;
};
