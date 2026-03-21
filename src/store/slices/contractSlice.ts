
import { StateCreator } from 'zustand';
import { 
    Clause, 
    SavedContract, 
    ConditionType,
    SearchResult
} from '@/types';

export interface ContractSlice {
    contract: SavedContract | null;
    clauses: Clause[];
    library: SavedContract[];
    activeContractId: string | null;
    projectName: string;
    searchFilter: string;
    smartSearchQuery: string;
    selectedTypes: ConditionType[];
    sortMode: 'default' | 'status' | 'chapter' | 'category';
    librarySearchQuery: string;
    searchResults: SearchResult[] | null;
    searchError: string | null;
    isSearching: boolean;

    setContract: (contract: SavedContract | null) => void;
    setClauses: (clauses: Clause[] | ((prev: Clause[]) => Clause[])) => void;
    setLibrary: (library: SavedContract[] | ((prev: SavedContract[]) => SavedContract[])) => void;
    setActiveContractId: (id: string | null) => void;
    setProjectName: (name: string) => void;
    setSearchFilter: (filter: string) => void;
    setSmartSearchQuery: (query: string) => void;
    setSelectedTypes: (types: ConditionType[]) => void;
    setSortMode: (mode: 'default' | 'status' | 'chapter' | 'category') => void;
    setIsSearching: (isSearching: boolean) => void;
    setSearchResults: (results: SearchResult[] | null) => void;
    setSearchError: (error: string | null) => void;
    setLibrarySearchQuery: (query: string) => void;
    smartSearchClauses: (query: string) => Promise<void>;
    
    // Clause Management
    editClause: (clause: Clause) => void;
    deleteClause: (index: number) => void;
    reorderClauses: (fromIndex: number, toIndex: number) => void;
}

import { AppState } from '../useAppStore';

export const createContractSlice: StateCreator<AppState, [], [], ContractSlice> = (set, get) => ({
    contract: null,
    clauses: [],
    library: [],
    activeContractId: null,
    projectName: '',
    searchFilter: '',
    smartSearchQuery: '',
    selectedTypes: ['General', 'Particular'],
    sortMode: 'default',
    librarySearchQuery: '',
    searchResults: null,
    searchError: null,
    isSearching: false,

    setContract: (contract) => set({ contract }),
    setClauses: (clauses) => set((state) => ({ clauses: typeof clauses === 'function' ? clauses(state.clauses) : clauses })),
    setLibrary: (library) => set((state) => ({ library: typeof library === 'function' ? library(state.library) : library })),
    setActiveContractId: (activeContractId) => set({ activeContractId }),
    setProjectName: (projectName) => set({ projectName }),
    setSearchFilter: (searchFilter) => set({ searchFilter }),
    setSmartSearchQuery: (smartSearchQuery) => set({ smartSearchQuery }),
    setSelectedTypes: (selectedTypes) => set({ selectedTypes }),
    setSortMode: (sortMode) => set({ sortMode }),
    setIsSearching: (isSearching) => set({ isSearching }),
    setSearchResults: (searchResults) => set({ searchResults }),
    setSearchError: (searchError) => set({ searchError }),
    setLibrarySearchQuery: (librarySearchQuery) => set({ librarySearchQuery }),

    smartSearchClauses: async (query: string) => {
        if (!query.trim()) return;
        const { clauses } = get();
        set({ isSearching: true, searchError: null });

        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const lowerQuery = query.toLowerCase();
            const searchTerms = lowerQuery.split(/\s+/).filter(t => t.length > 2);

            const scoredResults = clauses.map(c => {
                let score = 0;
                let reason = '';
                const titleLower = c.clause_title.toLowerCase();
                const textLower = (c.clause_text || '').toLowerCase();

                if (titleLower.includes(lowerQuery)) {
                    score += 0.8;
                    reason = 'Exact match in title';
                } else if (textLower.includes(lowerQuery)) {
                    score += 0.6;
                    reason = 'Exact phrase match in text';
                }

                let matchedTerms = 0;
                for (const term of searchTerms) {
                    if (titleLower.includes(term)) {
                        score += 0.3;
                        matchedTerms++;
                        if (!reason) reason = `Contains keyword "${term}" in title`;
                    } else if (textLower.includes(term)) {
                        score += 0.1;
                        matchedTerms++;
                        if (!reason) reason = `Contains keyword "${term}" in text`;
                    }
                }

                if (matchedTerms > 1) score += (matchedTerms * 0.1);

                return {
                    clause_id: `C.${c.clause_number}`,
                    clause_number: c.clause_number,
                    title: c.clause_title,
                    condition_type: c.condition_type,
                    relevance_score: Math.min(score, 1.0),
                    reason: reason || 'Matches search terms'
                };
            });

            const results = scoredResults
                .filter(r => r.relevance_score > 0)
                .sort((a, b) => b.relevance_score - a.relevance_score)
                .slice(0, 10);

            set({ searchResults: results });
        } catch (err) {
            console.error("Local Search Error:", err);
            set({ searchError: "Search failed. Please try again." });
        } finally {
            set({ isSearching: false });
        }
    },

    editClause: (clause) => set((state) => {
        const newClauses = [...state.clauses];
        const index = newClauses.findIndex(c => c.clause_number === clause.clause_number);
        if (index !== -1) {
            newClauses[index] = clause;
        }
        return { clauses: newClauses };
    }),

    deleteClause: (index) => set((state) => {
        const newClauses = [...state.clauses];
        newClauses.splice(index, 1);
        return { clauses: newClauses };
    }),

    reorderClauses: (fromIndex, toIndex) => set((state) => {
        const newClauses = [...state.clauses];
        const [moved] = newClauses.splice(fromIndex, 1);
        newClauses.splice(toIndex, 0, moved);
        return { clauses: newClauses };
    }),
});
