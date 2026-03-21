
import { StateCreator } from 'zustand';
import { BotMessage, Clause, ContextPill, SectionItem } from '@/types';
import { APP_CONFIG } from '@/config/appConfig';

export interface ChatSlice {
    isBotOpen: boolean;
    selectedClauseForBot: Clause | null;
    selectedItemForBot: SectionItem | Clause | null;
    activeChatContextIds: string[];
    digestedKnowledge: Array<{ id: string; name: string; timestamp: number; size: number }>;
    
    isOpenClawActive: boolean;
    openClawGateway: string;
    openClawAgents: string[];

    setIsBotOpen: (isOpen: boolean) => void;
    toggleBot: () => void;
    setSelectedClauseForBot: (clause: Clause | null) => void;
    setSelectedItemForBot: (item: SectionItem | Clause | null) => void;
    setActiveChatContextIds: (ids: string[]) => void;
    setDigestedKnowledge: (knowledge: ChatSlice['digestedKnowledge']) => void;
    setIsOpenClawActive: (active: boolean) => void;
    setOpenClawGateway: (gateway: string) => void;
}

import { AppState } from '../useAppStore';

export const createChatSlice: StateCreator<AppState, [], [], ChatSlice> = (set) => ({
    isBotOpen: false,
    selectedClauseForBot: null,
    selectedItemForBot: null,
    activeChatContextIds: [],
    digestedKnowledge: [],
    
    isOpenClawActive: APP_CONFIG.FEATURES.OPENCLAW_ACTIVE_BY_DEFAULT,
    openClawGateway: APP_CONFIG.OPENCLAW_GATEWAY,
    openClawAgents: ['contract-analyzer', 'qa-auditor'],

    setIsBotOpen: (isBotOpen) => set({ isBotOpen }),
    toggleBot: () => set((state) => ({ isBotOpen: !state.isBotOpen })),
    setSelectedClauseForBot: (selectedClauseForBot) => set({ selectedClauseForBot }),
    setSelectedItemForBot: (selectedItemForBot) => set({ selectedItemForBot }),
    setActiveChatContextIds: (activeChatContextIds) => set({ activeChatContextIds }),
    setDigestedKnowledge: (digestedKnowledge) => set({ digestedKnowledge }),
    setIsOpenClawActive: (isOpenClawActive) => set({ isOpenClawActive }),
    setOpenClawGateway: (openClawGateway) => set({ openClawGateway }),
});
