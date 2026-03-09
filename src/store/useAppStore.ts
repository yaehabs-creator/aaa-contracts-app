
import { create } from 'zustand';
import {
    Clause,
    AnalysisStatus,
    SavedContract,
    ConditionType,
    FileData,
    SectionType,
    ContractSubfolder,
    FolderSchemaField,
    ExtractedData
} from '@/types';

interface AppState {
    // Navigation & UI Status
    status: AnalysisStatus;
    activeTab: SectionType | 'CONDITIONS';
    isSidebarOpen: boolean;
    showContractSelector: boolean;

    // Contract Data
    contract: SavedContract | null;
    clauses: Clause[];
    library: SavedContract[];
    activeContractId: string | null;
    projectName: string;

    // Search & Filters
    searchFilter: string;
    smartSearchQuery: string;
    selectedTypes: ConditionType[];
    sortMode: 'default' | 'status' | 'chapter' | 'category';

    // AI Bot State
    isBotOpen: boolean;
    selectedClauseForBot: Clause | null;
    selectedItemForBot: any | null;

    // Loading & Save Status
    isSaving: boolean;
    saveStatus: 'idle' | 'success' | 'error';
    progress: number;
    activeStage: any;
    batchInfo: { current: number; total: number };

    // Organizer State
    organizerSubfolders: ContractSubfolder[];
    organizerSchemas: Record<string, FolderSchemaField[]>;
    organizerExtractedData: ExtractedData[];

    searchResults: any[] | null;
    searchError: string | null;
    isSearching: boolean;
    hasDraft: boolean;
    librarySearchQuery: string;

    // File/Input State
    generalFile: FileData | null;
    particularFile: FileData | null;
    pastedGeneralText: string;
    pastedParticularText: string;
    inputMode: 'single' | 'dual' | 'text' | 'fixer';
    textToFix: string;
    fixedText: { cleaned: string; fixes: Array<{ original: string; fixed: string; reason: string }>; removedLines: number; corruptedLines?: Array<{ line: string; reason: string; index: number }> } | null;
    linesToRemove: Set<number>;
    showCorruptionReview: boolean;
    currentCorruptionIndex: number;
    useAICleaning: boolean;
    isAICleaning: boolean;
    aiCleanedText: string | null;
    skipTextCleaning: boolean;

    // PDF Processing State
    extractedPdfPages: string[];
    cleanedPdfPages: string[] | null;
    isCleaningPdf: boolean;
    pdfTargetSection: SectionType;
    pdfEditText: string;

    // UI/Modal State
    selectedGroup: string | null;
    compareClause: Clause | null;
    isAddModalOpen: boolean;
    categorySuggestions: any[];
    showCategorySuggestions: boolean;

    // Actions
    setStatus: (status: AnalysisStatus) => void;
    setContract: (contract: SavedContract | null) => void;
    setClauses: (clauses: Clause[]) => void;
    setLibrary: (library: SavedContract[]) => void;
    setActiveContractId: (id: string | null) => void;
    setProjectName: (name: string) => void;
    setSearchFilter: (filter: string) => void;
    setSmartSearchQuery: (query: string) => void;
    setSelectedTypes: (types: ConditionType[]) => void;
    setSortMode: (mode: 'default' | 'status' | 'chapter' | 'category') => void;
    setIsSidebarOpen: (isOpen: boolean) => void;
    setShowContractSelector: (show: boolean) => void;
    setActiveTab: (tab: SectionType | 'CONDITIONS') => void;
    setIsSaving: (payload: boolean) => void;
    setSaveStatus: (status: 'idle' | 'success' | 'error') => void;
    setProgress: (progress: number) => void;
    setActiveStage: (stage: any) => void;
    setBatchInfo: (info: { current: number; total: number }) => void;
    setIsSearching: (isSearching: boolean) => void;
    setSearchResults: (results: any[] | null) => void;
    setSearchError: (error: string | null) => void;
    setHasDraft: (hasDraft: boolean) => void;
    setLibrarySearchQuery: (query: string) => void;

    setGeneralFile: (file: FileData | null) => void;
    setParticularFile: (file: FileData | null) => void;
    setPastedGeneralText: (text: string) => void;
    setPastedParticularText: (text: string) => void;
    setInputMode: (mode: 'single' | 'dual' | 'text' | 'fixer') => void;
    setTextToFix: (text: string) => void;
    setFixedText: (text: any) => void;
    setLinesToRemove: (lines: Set<number>) => void;
    setShowCorruptionReview: (show: boolean) => void;
    setCurrentCorruptionIndex: (index: number) => void;
    setUseAICleaning: (use: boolean) => void;
    setIsAICleaning: (is: boolean) => void;
    setAiCleanedText: (text: string | null) => void;
    setSkipTextCleaning: (skip: boolean) => void;
    setExtractedPdfPages: (pages: string[]) => void;
    setCleanedPdfPages: (pages: string[] | null) => void;
    setIsCleaningPdf: (is: boolean) => void;
    setPdfTargetSection: (section: SectionType) => void;
    setPdfEditText: (text: string) => void;
    setSelectedGroup: (group: string | null) => void;
    setCompareClause: (clause: Clause | null) => void;
    setIsAddModalOpen: (isOpen: boolean) => void;
    setCategorySuggestions: (suggestions: any[]) => void;
    setShowCategorySuggestions: (show: boolean) => void;
    setOrganizerSubfolders: (subfolders: ContractSubfolder[]) => void;
    setOrganizerSchemas: (schemas: Record<string, FolderSchemaField[]>) => void;
    setOrganizerExtractedData: (data: ExtractedData[]) => void;

    smartSearchClauses: (query: string) => Promise<void>;
    setIsBotOpen: (isOpen: boolean) => void;
    toggleBot: () => void;
    setSelectedClauseForBot: (clause: Clause | null) => void;
    setSelectedItemForBot: (item: any | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
    // Initial State
    status: AnalysisStatus.LIBRARY,
    activeTab: 'CONDITIONS',
    isSidebarOpen: true,
    showContractSelector: false,

    contract: null,
    clauses: [],
    library: [],
    activeContractId: null,
    projectName: '',

    searchFilter: '',
    smartSearchQuery: '',
    selectedTypes: ['General', 'Particular'],
    sortMode: 'default',

    isBotOpen: false,
    selectedClauseForBot: null,
    selectedItemForBot: null,

    isSaving: false,
    saveStatus: 'idle',
    progress: 0,
    activeStage: null,
    batchInfo: { current: 0, total: 0 },

    organizerSubfolders: [],
    organizerSchemas: {},
    organizerExtractedData: [],

    searchResults: null,
    searchError: null,
    isSearching: false,
    hasDraft: false,
    librarySearchQuery: '',

    generalFile: null,
    particularFile: null,
    pastedGeneralText: '',
    pastedParticularText: '',
    inputMode: 'dual',
    textToFix: '',
    fixedText: null,
    linesToRemove: new Set(),
    showCorruptionReview: false,
    currentCorruptionIndex: 0,
    useAICleaning: false,
    isAICleaning: false,
    aiCleanedText: null,
    skipTextCleaning: false,

    extractedPdfPages: [],
    cleanedPdfPages: null,
    isCleaningPdf: false,
    pdfTargetSection: SectionType.GENERAL,
    pdfEditText: '',

    selectedGroup: null,
    compareClause: null,
    isAddModalOpen: false,
    categorySuggestions: [],
    showCategorySuggestions: false,

    // Simple Actions
    setStatus: (status) => set({ status }),
    setContract: (contract) => set({ contract }),
    setClauses: (clauses) => set({ clauses }),
    setLibrary: (library) => set({ library }),
    setActiveContractId: (activeContractId) => set({ activeContractId }),
    setProjectName: (projectName) => set({ projectName }),
    setSearchFilter: (searchFilter) => set({ searchFilter }),
    setSmartSearchQuery: (smartSearchQuery) => set({ smartSearchQuery }),
    setSelectedTypes: (selectedTypes) => set({ selectedTypes }),
    setSortMode: (sortMode) => set({ sortMode }),
    setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
    setShowContractSelector: (showContractSelector) => set({ showContractSelector }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setIsSaving: (isSaving) => set({ isSaving }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setProgress: (progress) => set({ progress }),
    setActiveStage: (activeStage) => set({ activeStage }),
    setBatchInfo: (batchInfo) => set({ batchInfo }),
    setIsSearching: (isSearching) => set({ isSearching }),
    setSearchResults: (searchResults) => set({ searchResults }),
    setSearchError: (searchError) => set({ searchError }),
    setHasDraft: (hasDraft) => set({ hasDraft }),
    setLibrarySearchQuery: (librarySearchQuery) => set({ librarySearchQuery }),

    setGeneralFile: (generalFile) => set({ generalFile }),
    setParticularFile: (particularFile) => set({ particularFile }),
    setPastedGeneralText: (pastedGeneralText) => set({ pastedGeneralText }),
    setPastedParticularText: (pastedParticularText) => set({ pastedParticularText }),
    setInputMode: (inputMode) => set({ inputMode }),
    setTextToFix: (textToFix) => set({ textToFix }),
    setFixedText: (fixedText) => set({ fixedText }),
    setLinesToRemove: (linesToRemove) => set({ linesToRemove }),
    setShowCorruptionReview: (showCorruptionReview) => set({ showCorruptionReview }),
    setCurrentCorruptionIndex: (currentCorruptionIndex) => set({ currentCorruptionIndex }),
    setUseAICleaning: (useAICleaning) => set({ useAICleaning }),
    setIsAICleaning: (isAICleaning) => set({ isAICleaning }),
    setAiCleanedText: (aiCleanedText) => set({ aiCleanedText }),
    setSkipTextCleaning: (skipTextCleaning) => set({ skipTextCleaning }),
    setExtractedPdfPages: (extractedPdfPages) => set({ extractedPdfPages }),
    setCleanedPdfPages: (cleanedPdfPages) => set({ cleanedPdfPages }),
    setIsCleaningPdf: (isCleaningPdf) => set({ isCleaningPdf }),
    setPdfTargetSection: (pdfTargetSection) => set({ pdfTargetSection }),
    setPdfEditText: (pdfEditText) => set({ pdfEditText }),
    setSelectedGroup: (selectedGroup) => set({ selectedGroup }),
    setCompareClause: (compareClause) => set({ compareClause }),
    setIsAddModalOpen: (isAddModalOpen) => set({ isAddModalOpen }),
    setCategorySuggestions: (categorySuggestions) => set({ categorySuggestions }),
    setShowCategorySuggestions: (showCategorySuggestions) => set({ showCategorySuggestions }),
    setOrganizerSubfolders: (organizerSubfolders) => set({ organizerSubfolders }),
    setOrganizerSchemas: (organizerSchemas) => set({ organizerSchemas }),
    setOrganizerExtractedData: (organizerExtractedData) => set({ organizerExtractedData }),

    setIsBotOpen: (isBotOpen) => set({ isBotOpen }),
    toggleBot: () => set((state) => ({ isBotOpen: !state.isBotOpen })),
    setSelectedClauseForBot: (selectedClauseForBot) => set({ selectedClauseForBot }),
    setSelectedItemForBot: (selectedItemForBot) => set({ selectedItemForBot }),

    smartSearchClauses: async (query: string) => {
        if (!query.trim()) return;
        const { clauses } = useAppStore.getState();
        set({ isSearching: true, searchError: null });

        // Give UI time to show loading state
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const lowerQuery = query.toLowerCase();
            const searchTerms = lowerQuery.split(/\s+/).filter(t => t.length > 2);

            const scoredResults = clauses.map(c => {
                let score = 0;
                let reason = '';
                const titleLower = c.clause_title.toLowerCase();
                const textLower = c.clause_text.toLowerCase();

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
}));
