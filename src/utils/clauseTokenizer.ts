
import { normalizeClauseId } from './navigation';

export type TokenType = 'text' | 'ref';

export interface LinkToken {
    t: TokenType;
    v: string;
}

/**
 * Tokenizes text into plain text and clause reference tokens.
 * 
 * Rules:
 * - Match \d+[A-Z]?(?:\.\d+)+ (e.g. 2.1, 10.2.3, 22A.1)
 * - Match "Clause X" where X is the above.
 * - Strip prefixes "Clause", "Sub-Clause", "Cl.", "Clause:" and surrounding parens.
 * - Convert the reference part to a 'ref' token, effectively linking it.
 * - Everything else is 'text'.
 */
export const buildLinkTokens = (text: string | null | undefined): LinkToken[] => {
    if (!text) return [];

    const tokens: LinkToken[] = [];

    // Regex to find potential references
    // We want to capture the Prefix + Number to decide how to split.
    // Then inside the handler, we separate the prefix (text) from the number (ref).

    // Regex breakdown:
    // Prefix Group 1: (?:(?:Clause|Sub-Clause|Cl\.|Clause:)\s*\(?)?
    // Number Group 2: (\d+[A-Z]?(?:\.\d+)+)  <-- Multi-segment required by user regex: \d+[A-Z]?(?:\.\d+)+
    // But user also said "Clause 22A.1".
    // User regex provided: `\d+[A-Z]?(?:\.\d+)+`
    // Wait, if I use JUST that regex, I miss "Clause 1" if "1" is not multi-segment.
    // The user says: "Must link: 2.1, 10.2.3, 2A.5, 6B.3.2, 22A.1".
    // "Must NOT link: dates like 5/2/2026, decimals like 3.14".

    // Strategy:
    // 1. Find matches for the number pattern.
    // 2. Check context (prefix).
    // 3. Check for exclusions (date/decimal-like context if ambiguous).

    // User regex `\d+[A-Z]?(?:\.\d+)+` implies at least one dot.
    // This safely excludes "Clause 1" if it has no dot. The user examples all have dots.
    // "22A.1" has dot. "6B.3.2" has dots.

    // What about `(22A.1)`? The user says "Strip surrounding brackets/punctuation: (22A.1), -> 22A.1".

    const tokenRegex = /((?:(?:Clause|Sub-Clause|Cl\.|Clause:)\s*)?\(?)(\b\d+[A-Z]?(?:\.\d+)+[A-Z]?\b)(\)?)/gi;

    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
        const fullMatch = match[0];
        const prefix = match[1] || ''; // e.g. "Clause ("
        const number = match[2];       // e.g. "22A.1"
        const suffix = match[3] || ''; // e.g. ")"
        const index = match.index;

        // Validation:
        // Avoid dates: 5/2/2026. The regex `\b` boundary might helps but `.` vs `/` is key.
        // My regex enforces `\.`. So 5/2/2026 won't match unless it is 5.2.2026.
        // If text is "5.2.2026", it matches `5.2.2026`.
        // We should check if it looks like a year at the end?

        // Avoid common decimals: "3.14". 
        // User says "Preceded by Clause... OR ... clause-like structural".
        // 3.14 is technically `\d+\.\d+`.
        // If prefix is present ("Clause 3.14"), we link it.
        // If no prefix, we must be careful.

        let isRef = true;

        // Check for date-like (year at end or start?)
        // Basic heuristic: if last segment is 4 digits starting with 19 or 20, likely a year.
        const segments = number.split('.');
        if (segments.length >= 3) {
            const last = segments[segments.length - 1];
            if (last.length === 4 && (last.startsWith('19') || last.startsWith('20'))) {
                isRef = false;
            }
        }

        // Check for decimal-like (no prefix, 2 segments, second segment is just numbers)
        // "3.14" -> segments [3, 14]. 
        // "2.1" -> [2, 1].
        // It's hard to distinguish "Clause 2.1" from "Pi is 3.14" without prefix.
        // However, user said "Match clause numbers... Avoid common decimal false positives".
        // If I strictly follow the "prefix OR structure" advice:
        // Structure `\d+[A-Z]?(?:\.\d+)+` matches 3.14.
        // Maybe checking if we have letters? "22A.1" is clearly a clause. "3.14" is ambiguous.
        // If pure numeric X.Y, we risk false positives.
        // But user gave "2.1" as an example to link.
        // I will assume if it matches the pattern it is a candidate. 
        // I'll rely on the specific regex provided: `\d+[A-Z]?(?:\.\d+)+`.

        if (isRef) {
            // Add preceding text
            if (index > lastIndex) {
                tokens.push({ t: 'text', v: text.substring(lastIndex, index) });
            }

            // Add Prefix as text
            if (prefix) {
                tokens.push({ t: 'text', v: prefix });
            }

            // Add Reference
            // Normalize: Strip parens is handled by groups.
            // normalizeClauseId handles "22A.1".
            tokens.push({ t: 'ref', v: number });

            // Add Suffix as text
            if (suffix) {
                tokens.push({ t: 'text', v: suffix });
            }

            lastIndex = index + fullMatch.length;
        }
    }

    // Add remaining text
    if (lastIndex < text.length) {
        tokens.push({ t: 'text', v: text.substring(lastIndex) });
    }

    return tokens;
};
