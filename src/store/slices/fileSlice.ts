
import { StateCreator } from 'zustand';
import { FileData, SectionType, TextFixResult } from '@/types';

export interface FileSlice {
    generalFile: FileData | null;
    particularFile: FileData | null;
    pastedGeneralText: string;
    pastedParticularText: string;
    inputMode: 'single' | 'dual' | 'text' | 'fixer';
    textToFix: string;
    fixedText: TextFixResult | null;
    linesToRemove: Set<number>;
    showCorruptionReview: boolean;
    currentCorruptionIndex: number;
    useAICleaning: boolean;
    isAICleaning: boolean;
    aiCleanedText: string | null;
    skipTextCleaning: boolean;

    extractedPdfPages: string[];
    cleanedPdfPages: string[] | null;
    isCleaningPdf: boolean;
    pdfTargetSection: SectionType;
    pdfEditText: string;

    setGeneralFile: (file: FileData | null) => void;
    setParticularFile: (file: FileData | null) => void;
    setPastedGeneralText: (text: string) => void;
    setPastedParticularText: (text: string) => void;
    setInputMode: (mode: 'single' | 'dual' | 'text' | 'fixer') => void;
    setTextToFix: (text: string) => void;
    setFixedText: (text: TextFixResult | null) => void;
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
}

import { AppState } from '../useAppStore';

export const createFileSlice: StateCreator<AppState, [], [], FileSlice> = (set) => ({
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
});
