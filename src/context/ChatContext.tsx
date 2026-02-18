import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { BotMessage, ContextPill } from '../../types';

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
    const [messages, setMessages] = useState<BotMessage[]>([]);
    const [isThinkingOrStreaming, setIsThinkingOrStreaming] = useState(false);
    const [contextPills, setContextPills] = useState<ContextPill[]>(config.initialContextPills || []);
    const [atBottom, setAtBottom] = useState(true);

    const value = useMemo(() => ({
        messages,
        setMessages,
        isThinkingOrStreaming,
        setIsThinkingOrStreaming,
        contextPills,
        setContextPills,
        atBottom,
        setAtBottom,
        conversationId: config.conversationId || null,
        contractClauses: config.contractClauses || []
    }), [messages, isThinkingOrStreaming, contextPills, atBottom, config.conversationId, config.contractClauses]);

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
};
