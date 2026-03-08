import React from 'react';
import { motion } from 'framer-motion';
import { BotMessage } from '@/types';

interface MessageItemProps {
    message: BotMessage;
    isLast: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isLast }) => {
    const isAssistant = message.role === 'assistant';
    // @ts-ignore
    const agentsUsed = message.agentsUsed as ('openai' | 'claude')[] | undefined;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} group`}
        >
            <div className={`max-w-[85%] flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
                <div className={`
          relative p-5 rounded-[2rem] text-sm leading-relaxed overflow-hidden
          ${isAssistant
                        ? 'bg-white border border-black/[0.04] text-black shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-tl-none'
                        : 'bg-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.15)] rounded-tr-none'}
        `}>
                    {isAssistant && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-aaa-blue to-emerald-500 opacity-20" />
                    )}
                    <div className="relative z-10 whitespace-pre-wrap font-medium tracking-tight">
                        {message.content}
                    </div>
                </div>

                {isAssistant && agentsUsed && agentsUsed.length > 0 && (
                    <div className="flex items-center gap-3 mt-3 px-2">
                        {agentsUsed.map(agent => (
                            <div key={agent} className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-default">
                                <div className={`w-1.5 h-1.5 rounded-full ${agent === 'openai' ? 'bg-aaa-blue' : 'bg-orange-500'}`} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-black">
                                    {agent === 'openai' ? 'Document Specialist' : 'Conditions Specialist'}
                                </span>
                            </div>
                        ))}
                        <div className="h-2 w-[1px] bg-black/10 mx-1" />
                        <span className="text-[9px] font-bold text-black/30 uppercase tracking-widest">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                )}

                {!isAssistant && (
                    <div className="mt-2 px-2 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-black/20 uppercase tracking-widest">Sent</span>
                        <div className="w-1 h-1 rounded-full bg-black/10" />
                        <span className="text-[9px] font-bold text-black/20 uppercase tracking-widest">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default React.memo(MessageItem);
