
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Zap } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ChatProvider } from '@/contexts/ChatContext';
import { useChat } from '@/hooks/useChat';
import MessageList from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import { AnalysisStatus } from '@/types';
import { APP_CONFIG } from '@/config/appConfig';
import { getAllContracts, listKnowledgeItems } from '@/services/dbService';

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
  const [sidebarTab, setSidebarTab] = useState<'contracts' | 'knowledge'>('contracts');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch contracts from Supabase
  const fetchContracts = async () => {
    try {
      const data = await getAllContracts();
      setContracts(data as any);
      if (data && data.length > 0 && activeChatContextIds.length === 0) {
        setActiveChatContextIds([data[0].id]);
        setSelectedContractId(data[0].id);
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

      // Refresh list & select the new contract
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

  // Select a contract
  const handleSelectContract = (contractId: string) => {
    setSelectedContractId(contractId);
    setActiveChatContextIds([contractId]);
  };

  // Delete a contract
  const handleDeleteContract = async (contractId: string) => {
    try {
      await fetch(`${BACKEND}/contracts/delete/${contractId}`, { method: 'DELETE' });
      if (selectedContractId === contractId) {
        setSelectedContractId(null);
        setSelectedContractText('');
      }
      await fetchContracts();
    } catch { /* silent */ }
  };

  // Toggle knowledge items
  const toggleKnowledgeItem = (id: string) => {
    if (activeChatContextIds.includes(id)) {
      setActiveChatContextIds(activeChatContextIds.filter(cid => cid !== id));
    } else {
      setActiveChatContextIds([...activeChatContextIds, id]);
    }
  };

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  const filteredContracts = contracts.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredKnowledge = knowledgeItems.filter(k =>
    k.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeContractId = activeChatContextIds[0] || selectedContractId || contracts[0]?.id;

  const providerConfig = useMemo(() => ({
    persist: true,
    conversationId: activeContractId || undefined,
    initialContextPills: []
  }), [activeContractId]);

  const activeContract = contracts.find(c => c.id === activeContractId) || contracts[0];
  const isSeniorActive = activeContract?.status === 'agentic_ready';

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* ═══════════ SIDEBAR ═══════════ */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 border-r border-black/[0.04] bg-white/40 backdrop-blur-xl flex flex-col overflow-hidden"
          >
            {/* Sidebar Tabs */}
            <div className="p-4 flex gap-2 border-b border-black/[0.04]">
              <button
                onClick={() => setSidebarTab('contracts')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  sidebarTab === 'contracts' ? 'bg-mac-blue text-white shadow-lg' : 'text-mac-navy/40 hover:bg-black/5'
                }`}
              >
                Contracts ({contracts.length})
              </button>
              <button
                onClick={() => setSidebarTab('knowledge')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  sidebarTab === 'knowledge' ? 'bg-mac-blue text-white shadow-lg' : 'text-mac-navy/40 hover:bg-black/5'
                }`}
              >
                Knowledge
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sidebarTab === 'contracts' ? (
                filteredContracts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-black/40">
                    No contracts loaded yet
                  </div>
                ) : (
                  filteredContracts.map(c => {
                    const isSelected = (activeContractId === c.id) || activeChatContextIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelectContract(c.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-mac-blue/10 border-mac-blue/40 shadow-sm'
                            : 'bg-white/50 border-black/[0.03] hover:border-mac-blue/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-black text-mac-blue uppercase tracking-widest">
                            {c.metadata?.package || 'PKG Contract'}
                          </span>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-mac-blue shadow-[0_0_8px_rgba(4,106,255,0.5)]" />
                          )}
                        </div>
                        <div className="text-sm font-black text-mac-navy truncate">{c.name}</div>
                        {c.metadata?.total_documents ? (
                          <div className="text-[10px] text-black/40 font-medium mt-1">
                            {c.metadata.total_documents} documents indexed
                          </div>
                        ) : null}
                      </button>
                    );
                  })
                )
              ) : (
                filteredKnowledge.map(k => (
                  <button
                    key={k.id}
                    onClick={() => toggleKnowledgeItem(k.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
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
              <span className="text-[11px] font-black text-black/80 uppercase tracking-widest">
                AEHab | Mivida Gardens Contract Administrator
              </span>
              {activeContract && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-mac-blue/10 text-mac-blue border border-mac-blue/20">
                  {activeContract.name}
                </span>
              )}
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
