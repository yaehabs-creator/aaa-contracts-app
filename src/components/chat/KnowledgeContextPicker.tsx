
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { listKnowledgeItems } from '@/services/dbService';

interface KnowledgeItem {
  id: string;
  name: string;
  timestamp: number;
  size: number;
}

interface KnowledgeContextPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

const KnowledgeContextPicker: React.FC<KnowledgeContextPickerProps> = ({ isOpen, onClose }) => {
  const {
    activeChatContextIds,
    setActiveChatContextIds,
    digestedKnowledge,
    setDigestedKnowledge
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchKnowledge = async () => {
    setIsLoading(true);
    try {
      const data = await listKnowledgeItems();
      setDigestedKnowledge(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && digestedKnowledge.length === 0) {
      fetchKnowledge();
    }
  }, [isOpen]);

  const toggleItem = (id: string) => {
    if (activeChatContextIds.includes(id)) {
      setActiveChatContextIds(activeChatContextIds.filter(cid => cid !== id));
    } else {
      setActiveChatContextIds([...activeChatContextIds, id]);
    }
  };

  const selectAll = () => {
    setActiveChatContextIds(digestedKnowledge.map(k => k.id));
  };

  const deselectAll = () => {
    setActiveChatContextIds([]);
  };

  const filtered = digestedKnowledge.filter(k =>
    k.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="overflow-hidden border-b border-black/[0.04]"
        >
          <div className="p-4 bg-gradient-to-b from-slate-50/80 to-white/40 max-h-[320px] flex flex-col">
            {/* Picker Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <h3 className="text-[11px] font-black text-black/70 uppercase tracking-widest">Knowledge Context</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={selectAll}
                  className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                >
                  All
                </button>
                <button
                  onClick={deselectAll}
                  className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-black/40 hover:bg-black/5 rounded-md transition-colors"
                >
                  None
                </button>
                <button
                  onClick={onClose}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-black/30">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-black/25">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Filter knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-[12px] font-medium bg-white border border-black/[0.06] rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all placeholder:text-black/25"
              />
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-hide">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[11px] text-black/30 font-medium">
                    {digestedKnowledge.length === 0
                      ? 'No knowledge items yet. Digest files in the Knowledge Hub first.'
                      : 'No items match your filter.'}
                  </p>
                </div>
              ) : (
                filtered.map((item) => {
                  const isActive = activeChatContextIds.includes(item.id);
                  return (
                    <motion.button
                      key={item.id}
                      layout
                      onClick={() => toggleItem(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                          : 'bg-white/60 border border-transparent hover:bg-white hover:border-black/[0.06]'
                      }`}
                    >
                      {/* Toggle Circle */}
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        isActive
                          ? 'bg-indigo-600 shadow-md shadow-indigo-200'
                          : 'bg-black/[0.06]'
                      }`}>
                        {isActive && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-bold truncate ${isActive ? 'text-indigo-900' : 'text-black/70'}`}>
                          {item.name}
                        </p>
                        <p className="text-[10px] text-black/30 font-medium">
                          {(item.size / 1024).toFixed(1)} KB • {new Date(item.timestamp * 1000).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Active Badge */}
                      {isActive && (
                        <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-100 rounded-md">
                          Active
                        </span>
                      )}
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* Footer Status */}
            <div className="mt-3 pt-2 border-t border-black/[0.04] flex items-center justify-between">
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">
                {activeChatContextIds.length} of {digestedKnowledge.length} sources active
              </p>
              <button
                onClick={fetchKnowledge}
                disabled={isLoading}
                className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Syncing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(KnowledgeContextPicker);
