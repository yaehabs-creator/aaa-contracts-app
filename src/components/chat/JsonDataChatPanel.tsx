import React, { useState, useEffect, useRef } from 'react';
import {
    uploadJsonDataSource,
    getJsonDataSources,
    deleteJsonDataSource,
    JsonDataSource,
    LARGE_FILE_THRESHOLD,
} from '../../services/jsonDataSourceService';

interface JsonDataChatPanelProps {
    contractId: string | null;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    sourcesUsed?: { id: string; name: string }[];
}

export const JsonDataChatPanel: React.FC<JsonDataChatPanelProps> = ({ contractId }) => {
    const [sources, setSources] = useState<JsonDataSource[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadLabel, setUploadLabel] = useState('');
    const [uploadProgress, setUploadProgress] = useState<{ phase: string; pct: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadSources();
    }, [contractId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function loadSources() {
        const data = await getJsonDataSources(contractId);
        setSources(data);
        // Auto-select all by default
        setSelectedIds(new Set(data.map(d => d.id)));
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress({ phase: 'Starting…', pct: 0 });
        setError(null);
        try {
            const source = await uploadJsonDataSource(
                file,
                contractId,
                uploadLabel || undefined,
                undefined,
                (phase, pct) => setUploadProgress({ phase, pct }),
            );
            setSources(prev => [source, ...prev]);
            setSelectedIds(prev => new Set([...prev, source.id]));
            setUploadLabel('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
        }
    }

    async function handleDelete(id: string) {
        await deleteJsonDataSource(id);
        setSources(prev => prev.filter(s => s.id !== id));
        setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }

    function toggleSource(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    async function handleSend() {
        if (!input.trim() || selectedIds.size === 0 || isLoading) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/json-data-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: input,
                    source_ids: [...selectedIds],
                    contract_id: contractId,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                throw new Error(err.error || `Request failed: ${res.status}`);
            }

            const data = await res.json();
            const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: data.answer,
                sourcesUsed: data.sources_used,
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: any) {
            setError(err.message);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ Error: ${err.message}`,
            }]);
        } finally {
            setIsLoading(false);
        }
    }

    const activeSources = sources.filter(s => selectedIds.has(s.id));

    return (
        <div className="flex flex-col h-full bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── Header ── */}
            <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {'{}'}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">JSON Data Chat</h3>
                </div>
                <p className="text-xs text-gray-400">Upload JSON files and ask questions about them</p>
            </div>

            {/* ── Upload Panel ── */}
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        placeholder="Label (optional)"
                        value={uploadLabel}
                        onChange={e => setUploadLabel(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {isUploading ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        )}
                        {isUploading ? 'Uploading…' : 'Upload JSON'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleUpload}
                    />
                </div>

                {/* Upload progress bar */}
                {isUploading && uploadProgress && (
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-indigo-600 font-medium">
                            <span>{uploadProgress.phase}</span>
                            <span>{uploadProgress.pct}%</span>
                        </div>
                        <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress.pct}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Source list */}
                {sources.length > 0 && (
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                        {sources.map(source => (
                            <div
                                key={source.id}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${selectedIds.has(source.id)
                                    ? 'bg-indigo-50 border-indigo-200'
                                    : 'bg-white border-gray-100 opacity-50'
                                    }`}
                                onClick={() => toggleSource(source.id)}
                            >
                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${selectedIds.has(source.id) ? 'bg-indigo-600' : 'bg-gray-200'
                                    }`}>
                                    {selectedIds.has(source.id) && (
                                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-700 truncate">{source.name}</p>
                                    <p className="text-[10px] text-gray-400 truncate">
                                        {source.size_bytes ? (source.size_bytes >= 1024 * 1024
                                            ? `${(source.size_bytes / 1024 / 1024).toFixed(1)} MB`
                                            : `${Math.round(source.size_bytes / 1024)} KB`) : ''}
                                        {source.content_summary ? ` · ${source.content_summary}` : ''}
                                    </p>
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); handleDelete(source.id); }}
                                    className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {sources.length === 0 && (
                    <p className="text-[10px] text-gray-400 text-center py-1">
                        No JSON files uploaded yet. Upload one above to get started.
                    </p>
                )}
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 thin-scrollbar">
                {messages.length === 0 && activeSources.length > 0 && (
                    <div className="text-center py-6">
                        <div className="text-2xl mb-2">🗄️</div>
                        <p className="text-xs text-gray-400">
                            Ask anything about{' '}
                            <span className="font-medium text-indigo-600">
                                {activeSources.map(s => s.name).join(', ')}
                            </span>
                        </p>
                        <div className="mt-3 space-y-1.5">
                            {['Summarize this data', 'What are the key fields?', 'Show me the first 5 records'].map(q => (
                                <button
                                    key={q}
                                    onClick={() => { setInput(q); }}
                                    className="block w-full text-left px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-800'
                            }`}>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            {msg.sourcesUsed && (
                                <p className="text-[9px] mt-1.5 opacity-50">
                                    From: {msg.sourcesUsed.map(s => s.name).join(', ')}
                                </p>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl px-4 py-2.5">
                            <div className="flex gap-1 items-center">
                                {[0, 1, 2].map(i => (
                                    <div
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                                        style={{ animationDelay: `${i * 150}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                        ⚠️ {error}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                {selectedIds.size === 0 && sources.length > 0 && (
                    <p className="text-[10px] text-amber-500 text-center mb-2">
                        Select at least one data source above to chat.
                    </p>
                )}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder={selectedIds.size > 0 ? 'Ask about your data…' : 'Upload a JSON file to start'}
                        disabled={isLoading || selectedIds.size === 0}
                        className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 bg-gray-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim() || selectedIds.size === 0}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-40"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JsonDataChatPanel;
