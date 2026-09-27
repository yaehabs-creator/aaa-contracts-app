import { useCallback } from 'react';
import { useChatContext } from '../contexts/ChatContext';
import { chatWithSmartRouting } from '@/services/aiBotService';
import { BotMessage, ContextPill } from '@/types';
import { db } from '@/services/dbService';
import { updateSessionFromMessages } from '@/services/chatHistoryService';

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
        contractId,
        contractClauses,
        uploadedContract
    } = useChatContext();

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isThinkingOrStreaming) return;

        const userMessage: BotMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            timestamp: Date.now()
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        if (conversationId) {
            db.messages.save(conversationId, userMessage);
            updateSessionFromMessages(conversationId, updatedMessages);
        }
        setIsThinkingOrStreaming(true);

        try {
            const response = await chatWithSmartRouting(
                updatedMessages,
                contractClauses,
                contractId || conversationId,
                uploadedContract ?? undefined
            );

            const assistantMessage: BotMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response.response,
                timestamp: Date.now(),
                // @ts-ignore - Adding extended fields for the new UI
                agentsUsed: response.agentsUsed,
                isDualMode: response.mode === 'dual'
            };

            const finalMessages = [...updatedMessages, assistantMessage];
            setMessages(finalMessages);
            if (conversationId) {
                db.messages.save(conversationId, assistantMessage);
                updateSessionFromMessages(conversationId, finalMessages);
            }
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
    }, [messages, isThinkingOrStreaming, setMessages, setIsThinkingOrStreaming, conversationId, contractClauses, uploadedContract]);

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
        setAtBottom
    };
};
