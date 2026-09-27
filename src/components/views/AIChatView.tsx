
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Zap, Plus, MessageSquare, Trash2, Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ChatProvider } from '@/contexts/ChatContext';
import { useChat } from '@/hooks/useChat';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import { AnalysisStatus } from '@/types';
import { APP_CONFIG } from '@/config/appConfig';
import { getAllContracts, listKnowledgeItems } from '@/services/dbService';
import { getChatSessions, deleteChatSession, createNewSession, ChatSession } from '@/services/chatHistoryService';

const BACKEND = APP_CONFIG.BACKEND_URL;

interface ContractItem {
  id: string;
  name: string;
  original_filename: string;
  timestamp: number;
  page_count: number;
  text_length: number;
  size: number;
  status: string;
  metadata?: any;
}

interface KnowledgeItem {
  id: string;
  name: string;
  timestamp: number;
  size: number;
}

/* ─── Inner Chat Shell (must be inside ChatProvider) ─── */
const ChatArea: React.FC = () => {
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MessageList messages={messages} atBottom={atBottom} setAtBottom={setAtBottom} />
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
      <footer className="p-6 border-t border-black/[0.04] bg-white/40">
        <ChatInput
          onSend={sendMessage}
          onCancel={cancelCurrent}
          isProcessing={isThinkingOrStreaming}
          contextPills={contextPills}
          onRemovePill={removeContextPill}
        />
      </footer>
    </div>
  );
};

/* ─── Main Full-Screen View ─── */
export const AIChatView: React.FC = () => {
  const {
    setStatus,
    activeChatContextIds,
    setActiveChatContextIds,
    setDigestedKnowledge
  } = useAppStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedContractText, setSelectedContractText] = useState<string>('');
  
  // Chat Sessions History State
  const [sessions, setSessions] = useState<ChatSession[]>(() => getChatSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const existing = getChatSessions();
    return existing[0]?.id || crypto.randomUUID();
  });

  const [sidebarTab, setSidebarTab] = useState<'chats' | 'contracts' | 'knowledge'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh sessions list
  const refreshSessions = () => {
    setSessions(getChatSessions());
  };

  // Fetch contracts from Supabase
  const fetchContracts = async () => {
    try {
      const data = await getAllContracts();
      setContracts(data as any);
      if (data && data.length > 0) {
        const first = data[0];
        if (activeChatContextIds.length === 0) {
          setActiveChatContextIds([first.id]);
          setSelectedContractId(first.id);
        }
        // Auto-seed initial session if none exist
        const existing = getChatSessions();
        if (existing.length === 0) {
          const initial = createNewSession(first.id, first.name);
          setSessions([initial]);
          setCurrentSessionId(initial.id);
        }
      }
    } catch { /* silent */ }
  };

  // Fetch knowledge items from Supabase
  const fetchKnowledge = async () => {
    try {
      const data = await listKnowledgeItems();
      setKnowledgeItems(data);
      setDigestedKnowledge(data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchContracts();
    fetchKnowledge();
  }, []);

  // Create a brand new chat session
  const handleNewChat = () => {
    const activeContract = contracts.find(c => c.id === activeContractId) || contracts[0];
    const newSession = createNewSession(
      activeContract?.id || '',
      activeContract?.name || 'Mivida Gardens Contract'
    );
    setCurrentSessionId(newSession.id);
    refreshSessions();
    setSidebarTab('chats');
  };

  // Select an existing chat session from history
  const handleSelectSession = (s: ChatSession) => {
    setCurrentSessionId(s.id);
    if (s.contractId) {
      setSelectedContractId(s.contractId);
      setActiveChatContextIds([s.contractId]);
    }
  };

  // Delete a chat session
  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    deleteChatSession(sessionId);
    const updated = getChatSessions();
    setSessions(updated);
    if (currentSessionId === sessionId) {
      if (updated.length > 0) {
        handleSelectSession(updated[0]);
      } else {
        const activeContract = contracts.find(c => c.id === activeContractId) || contracts[0];
        const newSession = createNewSession(activeContract?.id || '', activeContract?.name || 'Mivida Gardens');
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
      }
    }
  };

  // Upload & process a contract PDF
  const handleUploadContract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setUploadProgress('Uploading PDF...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress('Processing with Docling OCR...');
      const res = await fetch(`${BACKEND}/contracts/process`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(err.detail || 'Processing failed');
      }

      const result = await res.json();
      setUploadProgress(`Done! ${result.page_count} pages extracted.`);

      await fetchContracts();
      setSelectedContractId(result.id);
      setActiveChatContextIds([result.id]);

      setTimeout(() => setUploadProgress(''), 2000);
    } catch (err) {
      setUploadProgress(`Error: ${err instanceof Error ? err.message : 'Failed'}`);
      setTimeout(() => setUploadProgress(''), 4000);
    } finally {
      setIsUploading(false);
    }
  };

  // Select a contract package
  const handleSelectContract = (contractId: string) => {
    setSelectedContractId(contractId);
    setActiveChatContextIds([contractId]);
  };

  // Toggle knowledge items
  const toggleKnowledgeItem = (id: string) => {
    if (activeChatContextIds.includes(id)) {
      setActiveChatContextIds(activeChatContextIds.filter(cid => cid !== id));
    } else {
      setActiveChatContextIds([...activeChatContextIds, id]);
    }
  };

  const filteredContracts = contracts.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredKnowledge = knowledgeItems.filter(k =>
    k.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeContractId = selectedContractId ? selectedContractId : (activeChatContextIds[0] || 'all');

  const providerConfig = useMemo(() => ({
    persist: true,
    conversationId: currentSessionId,
    contractId: activeContractId || 'all',
    initialContextPills: []
  }), [currentSessionId, activeContractId]);

  const activeContract = contracts.find(c => c.id === activeContractId) || contracts[0];
  const isSeniorActive = activeContract?.status === 'agentic_ready';

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* ═══════════ SIDEBAR ═══════════ */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 330, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 border-r border-black/[0.04] bg-white/50 backdrop-blur-xl flex flex-col overflow-hidden"
          >
            {/* New Chat Button */}
            <div className="p-3 border-b border-black/[0.04]">
              <button
                onClick={handleNewChat}
                className="w-full py-2.5 px-4 rounded-xl bg-mac-blue text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Chat with AEHab</span>
              </button>
            </div>

            {/* Sidebar Tabs */}
            <div className="p-2 flex gap-1 border-b border-black/[0.04]">
              <button
                onClick={() => { setSidebarTab('chats'); refreshSessions(); }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  sidebarTab === 'chats' ? 'bg-mac-blue text-white shadow-sm' : 'text-mac-navy/50 hover:bg-black/5'
                }`}
              >
                Chats ({sessions.length})
              </button>
              <button
                onClick={() => setSidebarTab('contracts')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  sidebarTab === 'contracts' ? 'bg-mac-blue text-white shadow-sm' : 'text-mac-navy/50 hover:bg-black/5'
                }`}
              >
                Packages ({contracts.length})
              </button>
              <button
                onClick={() => setSidebarTab('knowledge')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  sidebarTab === 'knowledge' ? 'bg-mac-blue text-white shadow-sm' : 'text-mac-navy/50 hover:bg-black/5'
                }`}
              >
                Knowledge
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sidebarTab === 'chats' && (
                <div className="space-y-1.5">
                  {sessions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-black/40">
                      No chat history yet.<br />Click <strong>"+ New Chat"</strong> above to start!
                    </div>
                  ) : (
                    sessions.map(s => {
                      const isSelected = s.id === currentSessionId;
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleSelectSession(s)}
                          className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-mac-blue/10 border-mac-blue/40 shadow-sm'
                              : 'bg-white/60 border-black/[0.04] hover:bg-white hover:border-black/[0.08]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-mac-blue' : 'text-black/40'}`} />
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/5 text-black/60 truncate">
                                {s.contractName?.replace(' Contract', '') || 'Mivida'}
                              </span>
                            </div>
                            <button
                              onClick={(e) => handleDeleteSession(e, s.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"
                              title="Delete conversation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-xs font-bold text-mac-navy truncate">
                            {s.title}
                          </div>
                          {s.preview && (
                            <div className="text-[10px] text-black/40 truncate mt-0.5">
                              {s.preview}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[9px] text-black/35 mt-1.5 font-medium">
                            <span>{new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>{s.messageCount} msg{s.messageCount === 1 ? '' : 's'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {sidebarTab === 'contracts' && (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setSelectedContractId(null);
                      setActiveChatContextIds([]);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                      !selectedContractId && activeChatContextIds.length === 0
                        ? 'bg-mac-blue/10 border-mac-blue/40 shadow-sm ring-1 ring-mac-blue/30'
                        : 'bg-white/50 border-black/[0.03] hover:border-mac-blue/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-black text-mac-blue uppercase tracking-widest">
                        ✨ Cross-Package
                      </span>
                      {(!selectedContractId && activeChatContextIds.length === 0) && (
                        <div className="w-2 h-2 rounded-full bg-mac-blue shadow-[0_0_8px_rgba(4,106,255,0.5)]" />
                      )}
                    </div>
                    <div className="text-sm font-black text-mac-navy">All 8 Contract Packages</div>
                    <div className="text-[10px] text-black/45 font-medium mt-0.5">
                      Unified search across PKG01 - PKG15
                    </div>
                  </button>

                  {filteredContracts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-black/40">
                      No contracts loaded yet
                    </div>
                  ) : (
                    filteredContracts.map(c => {
                      const isSelected = selectedContractId === c.id;
                      const parties = c.metadata?.parties || [];
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSelectContract(c.id)}
                          className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-mac-blue/10 border-mac-blue/40 shadow-sm ring-1 ring-mac-blue/30'
                              : 'bg-white/50 border-black/[0.03] hover:border-mac-blue/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-mac-blue/10 text-mac-blue uppercase tracking-widest">
                              {c.metadata?.package || 'PKG'}
                            </span>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-mac-blue shadow-[0_0_8px_rgba(4,106,255,0.5)]" />
                            )}
                          </div>
                          <div className="text-xs font-black text-mac-navy truncate">{c.name}</div>
                          {parties.length > 0 && (
                            <div className="text-[10px] text-black/55 font-medium truncate mt-0.5">
                              {parties.filter((p: string) => !p.includes('Emaar') && !p.includes('Employer')).join(', ') || parties[0]}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[9px] text-black/40 mt-1 font-medium">
                            {c.metadata?.total_documents ? <span>{c.metadata.total_documents} docs</span> : null}
                            {c.metadata?.total_clauses ? <span>• {c.metadata.total_clauses.toLocaleString()} clauses</span> : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {sidebarTab === 'knowledge' && (
                filteredKnowledge.map(k => (
                  <button
                    key={k.id}
                    onClick={() => toggleKnowledgeItem(k.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      activeChatContextIds.includes(k.id)
                        ? 'bg-purple-500/10 border-purple-500/20 shadow-sm'
                        : 'bg-white/50 border-black/[0.03] hover:border-purple-500/30'
                    }`}
                  >
                    <div className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-1">KI Base</div>
                    <div className="text-sm font-black text-mac-navy truncate">{k.name}</div>
                  </button>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ═══════════ MAIN CHAT AREA ═══════════ */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Chat Header Bar */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-black/[0.04] bg-white/50 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-4">
             <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 rounded-lg hover:bg-black/5 text-mac-navy/40 hover:text-mac-navy transition-all"
            >
              <Database className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[11px] font-black text-black/80 uppercase tracking-widest hidden sm:inline">
                AEHab | Contract Administrator
              </span>
              
              <div className="relative">
                <select
                  value={selectedContractId || 'all'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') {
                      setSelectedContractId(null);
                      setActiveChatContextIds([]);
                    } else {
                      setSelectedContractId(val);
                      setActiveChatContextIds([val]);
                    }
                  }}
                  className="text-xs font-extrabold px-3 py-1 rounded-full bg-white/95 border border-mac-blue/30 text-mac-navy shadow-sm cursor-pointer hover:border-mac-blue focus:outline-none focus:ring-2 focus:ring-mac-blue/20"
                >
                  <option value="all">✨ All Packages (Cross-Contract Analysis)</option>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>
                      📁 {c.metadata?.package || c.name} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-black/35 uppercase tracking-widest">AEHab Engine</span>
              <div className="w-2 h-2 rounded-full bg-mac-blue animate-pulse" />
            </div>
          </div>
        </div>

        {/* Chat Body */}
        <ChatProvider config={providerConfig}>
          <ChatArea />
        </ChatProvider>
      </div>
    </div>
  );
};

export default AIChatView;
