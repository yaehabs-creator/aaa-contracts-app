import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContextPill } from '@/types';
import { useChatContext } from '@/contexts/ChatContext';
import { processUploadedContract, type UploadProgress } from '@/services/chatContractUploadService';

interface ChatInputProps {
    onSend: (content: string) => void;
    onCancel: () => void;
    isProcessing: boolean;
    contextPills: ContextPill[];
    onRemovePill: (id: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
    onSend,
    onCancel,
    isProcessing,
    contextPills,
    onRemovePill
}) => {
    const { uploadedContract, setUploadedContract, clearUploadedContract } = useChatContext();
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleSend = () => {
        if (input.trim() && !isProcessing) {
            onSend(input.trim());
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
        if (!isPdf && !isTxt) {
            setUploadError('Please upload a .pdf or .txt file.');
            return;
        }
        setUploadError(null);
        setUploadProgress({ phase: 'reading', message: 'Reading file…' });
        try {
            const result = await processUploadedContract(file, (p) => setUploadProgress(p));
            setUploadedContract(result);
            setUploadProgress(null);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed.');
            setUploadProgress(null);
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    return (
        <div className="space-y-4">
            <AnimatePresence>
                {contextPills.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-wrap gap-2 px-2"
                    >
                        {contextPills.map(pill => (
                            <div
                                key={pill.id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-aaa-blue/10 border border-aaa-blue/20 rounded-full group transition-all hover:bg-aaa-blue/20"
                            >
                                <span className="text-[10px] font-black text-aaa-blue uppercase tracking-widest">{pill.label}</span>
                                <button
                                    onClick={() => onRemovePill(pill.id)}
                                    className="opacity-40 hover:opacity-100 transition-opacity"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {uploadProgress && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-aaa-blue/10 border border-aaa-blue/20 text-[11px] font-semibold text-aaa-blue">
                    <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {uploadProgress.message}
                </div>
            )}
            {uploadError && (
                <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-[11px] font-semibold text-red-700">
                    {uploadError}
                </div>
            )}
            {uploadedContract && !uploadProgress && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[11px] font-semibold text-emerald-800 truncate">Contract loaded: {uploadedContract.name}</span>
                    <button
                        type="button"
                        onClick={clearUploadedContract}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-wider shrink-0"
                    >
                        Clear
                    </button>
                </div>
            )}

            <div className="relative flex items-end gap-3 p-2 bg-black/[0.03] border border-black/[0.05] rounded-[2rem] focus-within:bg-white focus-within:shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,application/pdf,text/plain"
                    className="hidden"
                    onChange={handleFileSelect}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!uploadProgress || isProcessing}
                    className="w-11 h-11 rounded-full flex items-center justify-center bg-black/[0.05] text-black/40 hover:bg-black/10 hover:text-black/60 transition-all shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                    title="Upload contract (PDF or TXT)"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                    </svg>
                </button>
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask OpenClaw anything..."
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm font-medium text-black placeholder:text-black/30 max-h-[200px] scrollbar-hide"
                    rows={1}
                />

                <button
                    type="button"
                    onClick={isProcessing ? onCancel : handleSend}
                    disabled={!input.trim() && !isProcessing}
                    className={`
            w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0
            ${isProcessing
                            ? 'bg-black text-white'
                            : input.trim()
                                ? 'bg-aaa-blue text-white shadow-lg shadow-aaa-blue/20 rotate-0'
                                : 'bg-black/5 text-black/20 pointer-events-none'}
          `}
                >
                    {isProcessing ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><circle cx="12" cy="12" r="10"></circle><path d="M22 12a10 10 0 0 1-10 10"></path></svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    )}
                </button>
            </div>

            <div className="flex justify-center">
                <p className="text-[10px] font-bold text-black/20 uppercase tracking-[0.2em] px-4 py-1">
                    Precision AI Assistant <span className="mx-2">•</span> v2.0 Modular
                </p>
            </div>
        </div>
    );
};

export default React.memo(ChatInput);
