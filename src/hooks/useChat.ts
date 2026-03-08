import { useCallback } from 'react';
import { useChatContext } from '../context/ChatContext';
import { chatWithDualAgents } from '@/services/aiBotService';
import { BotMessage, ContextPill } from '@/types';

export const useChat = () => {
    const {
        messages,
        setMessages,
        isThinkingOrStreaming,
        setIsThinkingOrStreaming,
        contextPills,
        setContextPills,
        atBottom,
        setAtBottom,
        conversationId,
        contractClauses,
        isGraphMode,
        setIsGraphMode
    } = useChatContext();

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isThinkingOrStreaming) return;

        const userMessage: BotMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsThinkingOrStreaming(true);

        try {
            // In a real implementation, we would pass clauses and contractId from a higher context or prop
            // For now, we assume these are available or handled by the service
            const response = await chatWithDualAgents(
                [...messages, userMessage],
                contractClauses,
                conversationId,
                {
                    forceDocumentSearch: content.toLowerCase().startsWith('/search'),
                    forceGraphSearch: isGraphMode,
                    conversationHistory: messages
                }
            );

            const assistantMessage: BotMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response.response,
                timestamp: Date.now(),
                // @ts-ignore - Adding extended fields for the new UI
                agentsUsed: response.agentsUsed,
                isDualMode: response.isDualMode
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: BotMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: "I encountered an error while processing your request. Please try again.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsThinkingOrStreaming(false);
        }
    }, [messages, isThinkingOrStreaming, setMessages, setIsThinkingOrStreaming, conversationId, contractClauses]);

    const cancelCurrent = useCallback(() => {
        // Logic to abort the current fetch/stream
        setIsThinkingOrStreaming(false);
    }, [setIsThinkingOrStreaming]);

    const removeContextPill = useCallback((id: string) => {
        setContextPills(prev => prev.filter(p => p.id !== id));
    }, [setContextPills]);

    const clearChat = useCallback(() => {
        setMessages([]);
    }, [setMessages]);

    return {
        messages,
        isThinkingOrStreaming,
        sendMessage,
        cancelCurrent,
        contextPills,
        removeContextPill,
        clearChat,
        atBottom,
        setAtBottom,
        isGraphMode,
        setIsGraphMode
    };
};
