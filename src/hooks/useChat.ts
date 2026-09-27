import { useCallback } from 'react';
import { useChatContext } from '../contexts/ChatContext';
import { chatWithAntigravity } from '@/services/antigravityChatClient';
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
            db.messages.save(contractId || '', userMessage);
            updateSessionFromMessages(conversationId, updatedMessages);
        }
        setIsThinkingOrStreaming(true);

        try {
            const targetContractId = contractId || 'pkg01';
            const response = await chatWithAntigravity(
                targetContractId,
                content,
                messages
            );

            const assistantMessage: BotMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response.response,
                timestamp: Date.now(),
                // @ts-ignore - Display Antigravity agent & tools used
                agentsUsed: response.toolsUsed && response.toolsUsed.length > 0 
                    ? ['antigravity', ...response.toolsUsed] 
                    : ['antigravity'],
                isDualMode: false
            };

            const finalMessages = [...updatedMessages, assistantMessage];
            setMessages(finalMessages);
            if (conversationId) {
                db.messages.save(contractId || '', assistantMessage);
                updateSessionFromMessages(conversationId, finalMessages);
            }
        } catch (error: any) {
            console.error('Chat error:', error);
            const errorMessage: BotMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: error.message 
                    ? `⚠️ **Contract Administration Notice**: ${error.message}`
                    : "I encountered an issue retrieving verified contract data. Please verify your connection and try again.",
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
