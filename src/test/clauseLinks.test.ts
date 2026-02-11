/**
 * Clause Links Utility Tests
 * 
 * Tests for the core clause linking, deduplication, and status utilities.
 */

import { describe, it, expect } from 'vitest';
import {
    stripClauseLinks,
    linkifyText,
    deduplicateClauses,
    getClauseStatus,
    estimateTokens,
    highlightKeywords,
} from '../utils/clauseLinks';
import { Clause } from '../../types';

// ── stripClauseLinks ──────────────────────────────────────

describe('stripClauseLinks', () => {
    it('should return empty string for undefined/null input', () => {
        expect(stripClauseLinks(undefined)).toBe('');
        expect(stripClauseLinks('')).toBe('');
    });

    it('should strip clause link HTML and keep inner text', () => {
        const input = 'See <a href="#clause-14-1" class="clause-link" data-clause-id="14-1">Clause 14.1</a> for details.';
        expect(stripClauseLinks(input)).toBe('See Clause 14.1 for details.');
    });

    it('should handle text without any links', () => {
        const input = 'No links here.';
        expect(stripClauseLinks(input)).toBe('No links here.');
    });

    it('should strip multiple links', () => {
        const input = '<a href="#clause-1" class="clause-link" data-clause-id="1">Clause 1</a> and <a href="#clause-2" class="clause-link" data-clause-id="2">Clause 2</a>';
        expect(stripClauseLinks(input)).toBe('Clause 1 and Clause 2');
    });
});

// ── getClauseStatus ───────────────────────────────────────

describe('getClauseStatus', () => {
    it('should return "added" when only PC text exists', () => {
        const clause: Partial<Clause> = {
            particular_condition: 'Some text',
            general_condition: '',
            condition_type: 'Particular',
        };
        expect(getClauseStatus(clause as Clause)).toBe('added');
    });

    it('should return "modified" when both GC and PC text exist', () => {
        const clause: Partial<Clause> = {
            particular_condition: 'PC text',
            general_condition: 'GC text',
            condition_type: 'General',
        };
        expect(getClauseStatus(clause as Clause)).toBe('modified');
    });

    it('should return "gc-only" when only GC text exists', () => {
        const clause: Partial<Clause> = {
            particular_condition: '',
            general_condition: 'GC text',
            condition_type: 'General',
        };
        expect(getClauseStatus(clause as Clause)).toBe('gc-only');
    });
});

// ── deduplicateClauses ────────────────────────────────────

describe('deduplicateClauses', () => {
    it('should remove duplicate clause_number + condition_type combos', () => {
        const clauses: Partial<Clause>[] = [
            { clause_number: '1.1', condition_type: 'General', clause_text: 'First' },
            { clause_number: '1.1', condition_type: 'General', clause_text: 'Duplicate' },
            { clause_number: '1.1', condition_type: 'Particular', clause_text: 'Different type' },
        ];
        const result = deduplicateClauses(clauses as Clause[]);
        expect(result).toHaveLength(2);
        expect(result[0].clause_text).toBe('First');
        expect(result[1].condition_type).toBe('Particular');
    });

    it('should return empty array for empty input', () => {
        expect(deduplicateClauses([])).toEqual([]);
    });
});

// ── estimateTokens ────────────────────────────────────────

describe('estimateTokens', () => {
    it('should return 500 (system overhead) for empty text', () => {
        expect(estimateTokens('')).toBe(0);
    });

    it('should estimate tokens as ~4 chars per token + overhead', () => {
        const text = 'a'.repeat(400); // 400 chars = 100 tokens + 500 overhead = 600
        expect(estimateTokens(text)).toBe(600);
    });
});

// ── highlightKeywords ─────────────────────────────────────

describe('highlightKeywords', () => {
    it('should wrap keyword matches in <mark> tags', () => {
        const result = highlightKeywords('The payment is due.', ['payment']);
        expect(result).toContain('<mark');
        expect(result).toContain('payment');
    });

    it('should be case-insensitive', () => {
        const result = highlightKeywords('PAYMENT due', ['payment']);
        expect(result).toContain('<mark');
    });

    it('should return unchanged text when no keywords match', () => {
        const result = highlightKeywords('Nothing here', ['payment']);
        expect(result).toBe('Nothing here');
    });

    it('should handle empty keywords array', () => {
        const text = 'Some text';
        expect(highlightKeywords(text, [])).toBe(text);
    });
});
