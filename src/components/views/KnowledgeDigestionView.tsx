
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Search, 
  CheckCircle2, 
  Circle, 
  Brain, 
  FileText, 
  RefreshCcw, 
  ArrowLeft,
  Settings,
  Plus,
  Zap,
  Trash2,
  Lock,
  Globe,
  MoreVertical,
  Activity
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AnalysisStatus } from '@/types';
import toast from 'react-hot-toast';
import { DoclingService } from '@/services/doclingService';
import { listKnowledgeItems, saveKnowledgeItem } from '@/services/dbService';

export const KnowledgeDigestionView: React.FC = () => {
  const { 
    setStatus, 
    library, 
    activeChatContextIds, 
    setActiveChatContextIds,
    digestedKnowledge,
    setDigestedKnowledge
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchKnowledge = async () => {
    setIsLoading(true);
    try {
      const data = await listKnowledgeItems();
      setDigestedKnowledge(data);
    } catch (err) {
      console.error(err);
      toast.error('Could not connect to Knowledge Engine');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading(`Preparing ${file.name}...`);
    setIsProcessing(true);
    setProgress(10);
    setStatusMessage('Preparing file for neural ingestion...');

    try {
      // 1. Process with Docling
      setProgress(30);
      setStatusMessage('Extracting document structure (Docling OCR)...');
      const doclingResult = await DoclingService.processFile(file, file.name);
      
      setProgress(70);
      setStatusMessage('Building intelligent knowledge snapshot...');
      
      // 2. Save as Knowledge Item
      const payload = {
        id: `manual_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        data: {
          title: file.name,
          source: 'manual_upload',
          timestamp: Date.now(),
          text: doclingResult.text,
          page_count: doclingResult.page_count
        }
      };

      setProgress(90);
      setStatusMessage('Committing to local knowledge matrix...');
      
      await saveKnowledgeItem(payload);

      setProgress(100);
      setStatusMessage('Done! Knowledge integration complete.');
      
      toast.success('Successfully added to Knowledge Hub!', { id: toastId });
      setTimeout(() => {
        fetchKnowledge();
        setIsProcessing(false);
        setProgress(0);
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error('Digestion failed. Check backend connection.', { id: toastId });
      setIsProcessing(false);
      setProgress(0);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleContext = (id: string) => {
    if (activeChatContextIds.includes(id)) {
      setActiveChatContextIds(activeChatContextIds.filter(cid => cid !== id));
      toast.success('Removed from AI context');
    } else {
      setActiveChatContextIds([...activeChatContextIds, id]);
      toast.success('Added to active AI context');
    }
  };

  const filteredKnowledge = digestedKnowledge.filter(k => 
    k.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setStatus(AnalysisStatus.LIBRARY)}
              className="p-2 mr-2 rounded-full hover:bg-aaa-blue/5 text-aaa-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-3 rounded-2xl bg-aaa-blue/10 text-aaa-blue">
              <Brain className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-aaa-blue">
              AI Knowledge Hub
            </h1>
          </div>
          <p className="text-aaa-muted font-bold max-w-2xl ml-11">
            Manage digested contract data and control exactly which information the AI agent can access in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 ml-11 md:ml-0">
          <button 
            onClick={fetchKnowledge}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-aaa-border bg-white hover:bg-aaa-bg transition-all text-[10px] font-black uppercase tracking-widest text-aaa-muted disabled:opacity-50"
          >
            <RefreshCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Hub
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.txt,.docx"
          />

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-3 bg-aaa-blue hover:bg-aaa-blue/90 text-white transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-aaa-blue/20 disabled:opacity-50 rounded-xl"
          >
            {isProcessing ? (
              <RefreshCcw className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            {isProcessing ? 'Processing' : 'Digest New'}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: 'Digested Items', value: digestedKnowledge.length, icon: Database, color: 'text-aaa-blue', bg: 'bg-aaa-blue/10' },
          { label: 'Active Context', value: activeChatContextIds.length, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Neural Coverage', value: 'High', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl flex items-center gap-5 border border-aaa-border shadow-sm">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-aaa-muted uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-aaa-blue tracking-tighter">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Tabs */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-aaa-muted group-focus-within:text-aaa-blue transition-colors" />
        <input 
          type="text"
          placeholder="Search knowledge items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-14 pr-4 py-5 rounded-[24px] border border-aaa-border bg-white focus:ring-4 focus:ring-aaa-blue/5 focus:border-aaa-blue transition-all outline-none font-bold text-aaa-text"
        />
      </div>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-8 rounded-[32px] bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-white/20">
              <motion.div 
                className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              />
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <RefreshCcw className="w-8 h-8 animate-spin text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight mb-1">Neural Processing in Progress</h3>
                  <p className="text-indigo-100 font-medium">{statusMessage}</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <div className="text-5xl font-black tracking-tighter mb-1">{progress}%</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">System Pipeline Active</div>
              </div>
            </div>

            {/* Background elements */}
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -left-20 -top-20 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Knowledge List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredKnowledge.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`group flex items-center justify-between p-5 rounded-2xl border transition-all ${
                activeChatContextIds.includes(item.id)
                  ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-5">
                <div 
                  onClick={() => toggleContext(item.id)}
                  className={`cursor-pointer w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                    activeChatContextIds.includes(item.id)
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                  }`}
                >
                  {activeChatContextIds.includes(item.id) ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Brain className="w-6 h-6 opacity-40" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-aaa-text group-hover:text-aaa-blue transition-colors tracking-tight">
                      {item.name}
                    </h3>
                    {activeChatContextIds.includes(item.id) && (
                      <span className="px-2 py-0.5 rounded-lg bg-aaa-blue text-[9px] font-black text-white uppercase tracking-widest">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-aaa-muted uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {(item.size / 1024).toFixed(1)} KB
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Local Storage
                    </span>
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Restricted
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block mr-4">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Last Synced</p>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {new Date(item.timestamp * 1000).toLocaleDateString()}
                  </p>
                </div>
                
                <button 
                  className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-red-500"
                  title="Remove Knowledge"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-400">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredKnowledge.length === 0 && (
          <div className="text-center py-20 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 w-fit mx-auto mb-4">
              <Database className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No knowledge items found</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2">
              Start by digesting a contract or uploading a manual knowledge base file.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeDigestionView;
