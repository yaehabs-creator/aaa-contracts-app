
import { StateCreator } from 'zustand';
import { AnalysisStatus, SectionType, Clause, AnalysisStage, TextFix } from '@/types';

export interface UISlice {
    status: AnalysisStatus;
    activeView: 'chat' | 'hub';
    activeTab: SectionType | 'CONDITIONS';
    isSidebarOpen: boolean;
    showContractSelector: boolean;
    isSaving: boolean;
    saveStatus: 'idle' | 'success' | 'error';
    progress: number;
    activeStage: AnalysisStage | null;
    batchInfo: { current: number; total: number };
    liveStatus: { message: string; detail: string; isActive: boolean };
    preprocessingInfo: {
        generalFixes: number;
        particularFixes: number;
        estimatedClauses: number;
        fixes: TextFix[];
        tokenInfo: {
            inputTokens: number;
            outputTokenLimit: number;
            totalTokenBudget: number;
            usagePercentage: number;
        };
    } | null;
    error: string | null;
    hasDraft: boolean;
    selectedGroup: string | null;
    compareClause: Clause | null;
    isAddModalOpen: boolean;
    categorySuggestions: string[];
    showCategorySuggestions: boolean;

    setStatus: (status: AnalysisStatus) => void;
    setActiveView: (view: 'chat' | 'hub') => void;
    setActiveTab: (tab: SectionType | 'CONDITIONS') => void;
    setIsSidebarOpen: (isOpen: boolean) => void;
    setShowContractSelector: (show: boolean) => void;
    setIsSaving: (payload: boolean) => void;
    setSaveStatus: (status: 'idle' | 'success' | 'error') => void;
    setProgress: (progress: number) => void;
    setActiveStage: (stage: AnalysisStage | null) => void;
    setBatchInfo: (info: { current: number; total: number }) => void;
    setLiveStatus: (status: UISlice['liveStatus'] | ((prev: UISlice['liveStatus']) => UISlice['liveStatus'])) => void;
    setPreprocessingInfo: (info: UISlice['preprocessingInfo']) => void;
    setError: (error: string | null) => void;
    setHasDraft: (hasDraft: boolean) => void;
    setSelectedGroup: (group: string | null) => void;
    setCompareClause: (clause: Clause | null) => void;
    setIsAddModalOpen: (isOpen: boolean) => void;
    setCategorySuggestions: (suggestions: string[]) => void;
    setShowCategorySuggestions: (show: boolean) => void;
}

import { AppState } from '../useAppStore';

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
    status: AnalysisStatus.AI_CHAT,
    activeView: 'chat',
    activeTab: 'CONDITIONS',
    isSidebarOpen: true,
    showContractSelector: false,
    isSaving: false,
    saveStatus: 'idle',
    progress: 0,
    activeStage: null,
    batchInfo: { current: 0, total: 0 },
    liveStatus: { message: '', detail: '', isActive: false },
    preprocessingInfo: null,
    error: null,
    hasDraft: false,
    selectedGroup: null,
    compareClause: null,
    isAddModalOpen: false,
    categorySuggestions: [],
    showCategorySuggestions: false,

    setStatus: (status) => set({ status }),
    setActiveView: (activeView) => set({ activeView }),
    setActiveTab: (activeTab) => set({ activeTab }),
    setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
    setShowContractSelector: (showContractSelector) => set({ showContractSelector }),
    setIsSaving: (payload) => set({ isSaving: payload }),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setProgress: (progress) => set({ progress }),
    setActiveStage: (activeStage) => set({ activeStage }),
    setBatchInfo: (batchInfo) => set({ batchInfo }),
    setLiveStatus: (statusOrUpdater) => set((state) => ({
        liveStatus: typeof statusOrUpdater === 'function' ? statusOrUpdater(state.liveStatus) : statusOrUpdater,
    })),
    setPreprocessingInfo: (preprocessingInfo) => set({ preprocessingInfo }),
    setError: (error) => set({ error }),
    setHasDraft: (hasDraft) => set({ hasDraft }),
    setSelectedGroup: (selectedGroup) => set({ selectedGroup }),
    setCompareClause: (compareClause) => set({ compareClause }),
    setIsAddModalOpen: (isAddModalOpen) => set({ isAddModalOpen }),
    setCategorySuggestions: (categorySuggestions) => set({ categorySuggestions }),
    setShowCategorySuggestions: (showCategorySuggestions) => set({ showCategorySuggestions }),
});
