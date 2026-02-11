/**
 * useSmartSearch — Extracted from App.tsx
 * 
 * Handles AI-powered smart search over contract clauses.
 * Now routes through the AI proxy instead of direct API calls.
 */

import { useState, useCallback } from 'react';
import { Clause } from '../../types';
import { callClaude } from '../services/aiProxyClient';

export interface SearchResult {
    clause_id: string;
    clause_number: string;
    title: string;
    condition_type: string;
    relevance_score: number;
    reason: string;
}

export function useSmartSearch(clauses: Clause[]) {
    const [smartSearchQuery, setSmartSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    const smartSearchClauses = useCallback(
        async (query: string) => {
            if (!query.trim()) return;
            setIsSearching(true);
            setSearchError(null);

            const searchContext = clauses.map(c => ({
                clause_id: `C.${c.clause_number}`,
                clause_number: c.clause_number,
                title: c.clause_title,
                text: c.clause_text.substring(0, 500),
                condition_type: c.condition_type,
            }));

            try {
                const resultText = await callClaude({
                    model: 'claude-sonnet-4-5',
                    max_tokens: 4096,
                    system: `You are the Smart Search Engine for AAA Contract Department.
You receive a natural-language query and a list of clauses.
Your job is to select and rank the top 5 clauses that best match the query by meaning and keywords.
Focus on construction contract concepts: time frames, payment, insurance, liability, termination, etc.
Return ONLY valid JSON with this structure: {"results": [{"clause_id": "...", "clause_number": "...", "title": "...", "condition_type": "...", "relevance_score": 0.0-1.0, "reason": "..."}]}. Do not add any extra text.`,
                    messages: [
                        {
                            role: 'user',
                            content: `USER QUERY: "${query}"\n\nCLAUSE DATA:\n${JSON.stringify(searchContext)}`,
                        },
                    ],
                });

                // Extract JSON from response
                let jsonText = resultText.trim();
                if (jsonText.startsWith('```json')) {
                    jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
                } else if (jsonText.startsWith('```')) {
                    jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
                }

                const result = JSON.parse(jsonText);
                setSearchResults(result.results);
            } catch (err) {
                console.error('Smart Search Error:', err);
                setSearchError('Search failed. Please try again.');
            } finally {
                setIsSearching(false);
            }
        },
        [clauses]
    );

    const clearSearch = useCallback(() => {
        setSearchResults(null);
        setSmartSearchQuery('');
        setSearchError(null);
    }, []);

    return {
        smartSearchQuery,
        setSmartSearchQuery,
        isSearching,
        searchResults,
        searchError,
        smartSearchClauses,
        clearSearch,
    };
}
