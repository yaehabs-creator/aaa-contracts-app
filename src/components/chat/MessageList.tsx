import React, { useEffect, useRef } from 'react';
import { BotMessage } from '@/types';
import MessageItem from './MessageItem';

interface MessageListProps {
    messages: BotMessage[];
    atBottom: boolean;
    setAtBottom: (val: boolean) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, atBottom, setAtBottom }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (atBottom) {
            scrollToBottom();
        }
    }, [messages, atBottom]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50;
            setAtBottom(isAtBottom);
        }
    };

    return (
        <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-8 py-6 space-y-8 scrollbar-hide"
        >
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                    <div className="w-16 h-16 rounded-3xl bg-black/[0.03] flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-widest text-black">Precision Analysis Ready</p>
                        <p className="text-xs font-medium text-black/60 mt-1">Ask anything about your contract documents</p>
                    </div>
                </div>
            ) : (
                messages.map((msg, idx) => (
                    <MessageItem
                        key={msg.id}
                        message={msg}
                        isLast={idx === messages.length - 1}
                    />
                ))
            )}
        </div>
    );
};

export default React.memo(MessageList);
