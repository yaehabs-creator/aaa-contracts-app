import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { BotMessage, ContextPill } from '@/types';
import { db } from '@/services/dbService';

export interface UploadedContract {
    name: string;
    fileType: 'pdf' | 'txt';
    extractedText: string;
    openClawAnalysis: string;
    createdAt: number;
}

const STORAGE_KEY_PREFIX = 'aaa_chat_contract_';

function getStorageKey(conversationId: string | null): string {
    return `${STORAGE_KEY_PREFIX}${conversationId || 'default'}`;
}

function loadUploadedContract(conversationId: string | null): UploadedContract | null {
    try {
        const raw = localStorage.getItem(getStorageKey(conversationId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as UploadedContract;
        if (parsed?.name && typeof parsed.extractedText === 'string' && typeof parsed.openClawAnalysis === 'string') {
            return parsed;
        }
    } catch {
        // ignore
    }
    return null;
}

function saveUploadedContract(conversationId: string | null, data: UploadedContract | null): void {
    try {
        const key = getStorageKey(conversationId);
        if (data) localStorage.setItem(key, JSON.stringify(data));
        else localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

interface ChatContextValue {
    messages: BotMessage[];
    setMessages: React.Dispatch<React.SetStateAction<BotMessage[]>>;
    isThinkingOrStreaming: boolean;
    setIsThinkingOrStreaming: (val: boolean) => void;
    contextPills: ContextPill[];
    setContextPills: React.Dispatch<React.SetStateAction<ContextPill[]>>;
    atBottom: boolean;
    setAtBottom: (val: boolean) => void;
    conversationId: string | null;
    contractClauses: any[];
    uploadedContract: UploadedContract | null;
    setUploadedContract: (data: UploadedContract | null) => void;
    clearUploadedContract: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const ChatProvider: React.FC<{
    children: ReactNode;
    config: {
        conversationId?: string;
        contractClauses?: any[];
        persist?: boolean;
        initialContextPills?: ContextPill[];
    };
}> = ({ children, config }) => {
    const conversationId = config.conversationId || null;
    const persist = config.persist !== false;

    const [messages, setMessages] = useState<BotMessage[]>([]);
    const [isThinkingOrStreaming, setIsThinkingOrStreaming] = useState(false);
    const [contextPills, setContextPills] = useState<ContextPill[]>(config.initialContextPills || []);
    const [atBottom, setAtBottom] = useState(true);
    const [uploadedContract, setUploadedContractState] = useState<UploadedContract | null>(() =>
        persist ? loadUploadedContract(conversationId) : null
    );

    useEffect(() => {
        if (persist) saveUploadedContract(conversationId, uploadedContract);
    }, [persist, conversationId, uploadedContract]);

    useEffect(() => {
        if (conversationId && persist) {
            const loadHistory = async () => {
                const history = await db.messages.getHistory(conversationId);
                // Convert timestamp from SQLite (seconds) to JS (ms) if needed, 
                // but checking current data it might be already compatible or needs fix.
                setMessages(history.map((m: any) => ({
                    ...m,
                    // Parse agents_used if it's a string from SQLite
                    agentsUsed: typeof m.agents_used === 'string' ? JSON.parse(m.agents_used) : m.agents_used,
                    timestamp: m.timestamp * (m.timestamp < 10000000000 ? 1000 : 1) // basic heuristic for sec vs ms
                })));
            };
            loadHistory();
        } else {
            setMessages([]);
        }
    }, [conversationId, persist]);

    const setUploadedContract = useCallback((data: UploadedContract | null) => {
        setUploadedContractState(data);
    }, []);

    const clearUploadedContract = useCallback(() => {
        setUploadedContractState(null);
    }, []);

    const value = useMemo(() => ({
        messages,
        setMessages,
        isThinkingOrStreaming,
        setIsThinkingOrStreaming,
        contextPills,
        setContextPills,
        atBottom,
        setAtBottom,
        conversationId,
        contractClauses: config.contractClauses || [],
        uploadedContract,
        setUploadedContract,
        clearUploadedContract
    }), [messages, isThinkingOrStreaming, contextPills, atBottom, conversationId, config.contractClauses, uploadedContract, setUploadedContract, clearUploadedContract]);

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
};
