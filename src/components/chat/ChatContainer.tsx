import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatProvider } from '../../context/ChatContext';
import { useChat } from '../../hooks/useChat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { ContextPill } from '../../../types';


export type ChatContainerProps = {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    width?: number;
    side?: 'left' | 'right';
    conversationId?: string;
    contractClauses?: any[];
    persist?: boolean;
    initialContextPills?: ContextPill[];
    contractId?: string | null;
};

const ChatShell: React.FC<Omit<ChatContainerProps, 'conversationId' | 'contractClauses' | 'persist' | 'initialContextPills'>> = React.memo(({
    isOpen,
    onClose,
    title = "AI Contract Assistant",
    width = 420,
    side = "right",
    contractId = null,
}) => {
    const {
        messages,
        isThinkingOrStreaming,
        sendMessage,
        cancelCurrent,
        contextPills,
        removeContextPill,
        atBottom,
        setAtBottom
    } = useChat();


    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const slideVariants: any = {
        hidden: {
            x: side === 'right' ? '100%' : '-100%',
            opacity: 0,
            transition: { type: 'spring', stiffness: 450, damping: 40 }
        },
        visible: {
            x: 0,
            opacity: 1,
            transition: { type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }
        }
    };

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={backdropVariants}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[60]"
                    />
                    <motion.div
                        ref={containerRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={slideVariants}
                        style={{ width }}
                        className={`fixed top-4 bottom-4 z-[70] flex flex-col overflow-hidden
              ${side === 'right' ? 'right-4' : 'left-4'}
              bg-white/70 backdrop-blur-2xl border border-white/40
              shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem]`}
                    >
                        {/* ── Header ── */}
                        <header className="h-20 px-8 flex items-center justify-between border-b border-black/[0.03] bg-white/30 flex-shrink-0">
                            <div className="flex flex-col">
                                <h2 className="text-xl font-black text-black tracking-tight leading-none">{title}</h2>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Neural Analysis Active</span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-black/[0.03] hover:bg-black/[0.08] transition-colors group"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/60 group-hover:text-black">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </header>

                        {/* ── Contract AI Chat ── */}
                        <main className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-transparent to-black/[0.01]">
                            <MessageList
                                messages={messages}
                                atBottom={atBottom}
                                setAtBottom={setAtBottom}
                            />
                            <AnimatePresence>
                                {isThinkingOrStreaming && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="px-8 py-3"
                                    >
                                        <TypingIndicator />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <footer className="p-6 bg-white/20">
                                <ChatInput
                                    onSend={sendMessage}
                                    onCancel={cancelCurrent}
                                    isProcessing={isThinkingOrStreaming}
                                    contextPills={contextPills}
                                    onRemovePill={removeContextPill}
                                />
                            </footer>
                        </main>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

const ChatContainer: React.FC<ChatContainerProps> = ({
    isOpen,
    onClose,
    title,
    width = 420,
    side = "right",
    conversationId,
    contractClauses,
    persist = true,
    initialContextPills = [],
    contractId = null,
}) => {
    const providerConfig = useMemo(() => ({
        conversationId,
        contractClauses,
        persist,
        initialContextPills
    }), [conversationId, contractClauses, persist, initialContextPills]);

    return (
        <ChatProvider config={providerConfig}>
            <ChatShell
                isOpen={isOpen}
                onClose={onClose}
                title={title}
                width={width}
                side={side}
                contractId={contractId}
            />
        </ChatProvider>
    );
};

export default React.memo(ChatContainer);
