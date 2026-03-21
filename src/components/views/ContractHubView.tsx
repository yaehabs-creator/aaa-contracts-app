
import React, { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Search, 
  CheckCircle2, 
  Brain, 
  FileText, 
  RefreshCcw, 
  Plus,
  Trash2,
  Lock,
  Globe,
  Settings,
  FolderOpen,
  Layout,
  ExternalLink,
  ShieldCheck,
  Zap,
  Cpu,
  Network
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AnalysisStatus } from '@/types';
import toast from 'react-hot-toast';
import { getAllContracts, deleteContractFromDB, getContractById } from '@/services/dbService';
import { APP_CONFIG } from '@/config/appConfig';

export const ContractHubView: React.FC = () => {
  const { 
    setStatus, 
    setContract,
    setActiveContractId,
    activeChatContextIds, 
    setActiveChatContextIds
  } = useAppStore();

  const [contracts, setContracts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      const data = await getAllContracts();
      setContracts(data);
    } catch (err) {
      console.error(err);
      toast.error('Could not connect to Contract Engine');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const [currentStep, setCurrentStep] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading(`Starting Neural Digestion: ${file.name}...`);
    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Uploading to Engine...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Start Background Process
      const res = await fetch(`${APP_CONFIG.BACKEND_URL}/contracts/process/background`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to start digestion');
      const { id: contractId } = await res.json();
      
      toast.success('Digestion job queued on Server', { id: toastId });

      // Polling for progress
      const pollInterval = setInterval(async () => {
        try {
          const contractRes = await getContractById(contractId);
          if (contractRes) {
            const prog = typeof contractRes.ingestion_progress === 'number' 
              ? contractRes.ingestion_progress 
              : (contractRes.ingestion_progress?.processed_chunks || 0);
              
            const status = contractRes.status;
            
            setProgress(prog);
            
            if (status === 'processed' || prog >= 100) {
              clearInterval(pollInterval);
              setCurrentStep('Complete!');
              toast.success(`Contract "${contractRes.name}" ready!`, { id: toastId });
              setTimeout(() => {
                fetchContracts();
                setIsProcessing(false);
                setProgress(0);
              }, 1000);
            } else if (status === 'error') {
              clearInterval(pollInterval);
              throw new Error('Server-side processing failed');
            } else {
              setCurrentStep(`Digesting: ${prog}%`);
            }
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 2000);

    } catch (err) {
      console.error(err);
      toast.error('Digestion failed. Check engine logs.', { id: toastId });
      setIsProcessing(false);
      setProgress(0);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await deleteContractFromDB(id);
      toast.success('Contract deleted');
      fetchContracts();
      
      // Remove from context if active
      if (activeChatContextIds.includes(id)) {
        setActiveChatContextIds(activeChatContextIds.filter(cid => cid !== id));
      }
    } catch (err) {
      toast.error('Failed to delete contract');
    }
  };

  const toggleContext = (id: string) => {
    if (activeChatContextIds.includes(id)) {
      setActiveChatContextIds(activeChatContextIds.filter(cid => cid !== id));
      toast.success('Removed from AI Chat context');
    } else {
      setActiveChatContextIds([...activeChatContextIds, id]);
      toast.success('Added to AI Chat context');
    }
  };

  const openOrganizer = async (id: string) => {
    try {
      const fullData = await getContractById(id);
      if (!fullData) throw new Error('Contract not found');
      
      setContract(fullData);
      setActiveContractId(id);
      setStatus(AnalysisStatus.ORGANIZER);
      toast.success(`Opening ${fullData.name} in Organizer`);
    } catch (err) {
      toast.error('Could not open organizer');
    }
  };

  const handleDeployAgent = async (id: string) => {
    const tid = toast.loading('Building Neural RAG Index...');
    try {
      const res = await fetch(`${APP_CONFIG.BACKEND_URL}/contracts/index/${id}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Indexing failed');
      const data = await res.json();
      toast.success(data.message, { id: tid });
      fetchContracts();
    } catch (err) {
      toast.error('Failed to deploy Senior Agent', { id: tid });
    }
  };

  const handleDeployAdvancedRAG = async (id: string) => {
    const tid = toast.loading('Deploying Advanced Dual-Graph RAG (RAG-Anything)...', { duration: 0 });
    try {
      const res = await fetch(`${APP_CONFIG.BACKEND_URL}/contracts/index/advanced/${id}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Advanced indexing failed');
      const data = await res.json();
      toast.success(data.message, { id: tid, duration: 5000 });
      fetchContracts();
    } catch (err) {
      toast.error('Advanced RAG deployment failed. Check backend logs.', { id: tid });
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-8 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-mac-blue text-white shadow-lg shadow-mac-blue/20">
              <Database className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-mac-navy">
              AEhab Intelligence Hub
            </h1>
          </div>
          <p className="text-slate-500 font-medium max-w-2xl ml-1">
            Centrally manage, digest, and organize your contract database. 
            All data is processed locally and stored in your <code className="bg-slate-100 px-1.5 py-0.5 rounded text-mac-blue font-bold">/Database</code> folder.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchContracts}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest text-slate-500 disabled:opacity-50"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Database
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf"
          />

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-3 bg-mac-blue hover:bg-mac-navy text-white transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-mac-blue/20 disabled:opacity-50 rounded-xl"
          >
            {isProcessing ? (
              <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {isProcessing ? 'Digesting...' : 'Digest New Contract'}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        {[
          { label: 'Total Contracts', value: contracts.length, icon: FolderOpen, color: 'text-mac-blue', bg: 'bg-mac-blue/10' },
          { label: 'Active Context', value: activeChatContextIds.length, icon: Brain, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Local Storage', value: `${(contracts.reduce((acc, c) => acc + (c.size || 0), 0) / (1024 * 1024)).toFixed(1)} MB`, icon: Layout, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Engine Status', value: 'Ready', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl flex items-center gap-5 border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-slate-200">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-mac-navy tracking-tighter">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-mac-blue transition-colors" />
        <input 
          type="text"
          placeholder="Search contracts by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-14 pr-6 py-5 rounded-[24px] border border-slate-200 bg-white focus:ring-4 focus:ring-mac-blue/5 focus:border-mac-blue transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
        />
      </div>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="p-10 rounded-[40px] bg-gradient-to-br from-mac-blue to-accent-blue text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20">
              <motion.div 
                className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,1)]"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              />
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-inner">
                  <RefreshCcw className="w-10 h-10 animate-spin text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight mb-2">
                    {currentStep}
                  </h3>
                  <p className="text-blue-100 font-bold text-lg">
                    {totalPages > 0 ? `Processing Segment ${currentPage} / ${totalPages}` : 'Docling Neural Pipeline is active...'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <div className="text-6xl font-black tracking-tighter mb-1">{progress}%</div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200">Processing Layers</div>
              </div>
            </div>

            {/* Background elements */}
            <div className="absolute -right-32 -bottom-32 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -left-32 -top-32 w-80 h-80 bg-accent-blue/20 rounded-full blur-3xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contract List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredContracts.map((item) => (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`group flex items-center justify-between p-6 rounded-[32px] border transition-all duration-300 ${
                activeChatContextIds.includes(item.id)
                  ? 'bg-mac-blue/5 border-mac-blue/20 ring-1 ring-mac-blue/10 shadow-lg shadow-mac-blue/5'
                  : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-xl shadow-sm'
              }`}
            >
              <div className="flex items-center gap-6">
                <div 
                  onClick={() => toggleContext(item.id)}
                  className={`cursor-pointer w-16 h-16 flex items-center justify-center rounded-2xl transition-all duration-500 scale-95 group-hover:scale-100 ${
                    activeChatContextIds.includes(item.id)
                      ? 'bg-mac-blue text-white shadow-xl shadow-mac-blue/30 rotate-0'
                      : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100 group-hover:text-slate-400 rotate-0 hover:rotate-6'
                  }`}
                  title={activeChatContextIds.includes(item.id) ? "Remove from AI Context" : "Add to AI Context"}
                >
                  {activeChatContextIds.includes(item.id) ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    <Brain className="w-8 h-8 opacity-40" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black text-mac-navy group-hover:text-mac-blue transition-colors tracking-tight">
                      {item.name}
                    </h3>
                    {activeChatContextIds.includes(item.id) && (
                      <span className="px-3 py-1 rounded-full bg-mac-blue text-[9px] font-black text-white uppercase tracking-widest shadow-sm">
                        Neural Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {item.page_count} Pages
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5" />
                      {(item.size / 1024).toFixed(1)} KB
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      Local Storage
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" />
                      Secure
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block mr-6">
                  <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest mb-1">Last Digested</p>
                  <p className="text-xs font-bold text-slate-600">
                    {new Date(item.timestamp * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDeployAgent(item.id)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border shadow-sm ${
                      item.status === 'agentic_ready' 
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-200' 
                        : 'bg-white text-mac-blue border-mac-blue/10 hover:bg-mac-blue hover:text-white hover:shadow-mac-blue/20'
                    }`}
                    title="Deploy AEhab Senior Engineer"
                  >
                    {item.status === 'agentic_ready' || item.status === 'advanced_rag_ready' ? (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        AEhab Senior Active
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 animate-pulse text-amber-500" />
                        Deploy AEhab Agent (RAG)
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => handleDeployAdvancedRAG(item.id)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border shadow-sm ${
                      item.status === 'advanced_rag_ready' 
                        ? 'bg-purple-600 text-white border-purple-500 shadow-purple-200' 
                        : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-600 hover:text-white hover:shadow-purple-200'
                    }`}
                    title="Deploy Advanced Multimodal Graph RAG"
                  >
                    {item.status === 'advanced_rag_ready' ? (
                      <>
                        <Network className="w-4 h-4" />
                        Advanced RAG Active
                      </>
                    ) : (
                      <>
                        <Cpu className="w-4 h-4 text-purple-500" />
                        Deploy Advanced RAG
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => openOrganizer(item.id)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-50 hover:bg-mac-navy hover:text-white text-slate-600 transition-all font-black text-[10px] uppercase tracking-widest border border-slate-100 shadow-sm"
                    title="Open Structure Organizer"
                  >
                    <Layout className="w-4 h-4" />
                    Organize
                  </button>

                  <button 
                    onClick={() => {
                        window.open(`${APP_CONFIG.BACKEND_URL}/knowledge-data/${item.id}/metadata.json`, '_blank');
                    }}
                    className="p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors text-slate-400 hover:text-mac-blue"
                    title="View Raw Metadata"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => handleDelete(item.id, item.name)}
                    className="p-3 rounded-xl border border-slate-100 hover:bg-red-50 transition-colors text-slate-400 hover:text-red-600"
                    title="Delete Contract"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredContracts.length === 0 && !isLoading && (
          <div className="text-center py-32 rounded-[40px] border-4 border-dashed border-slate-100 bg-slate-50/30">
            <div className="p-6 rounded-3xl bg-white shadow-sm w-fit mx-auto mb-6">
              <Database className="w-12 h-12 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-mac-navy tracking-tight">Empty Database Cluster</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-3 font-medium">
              Start by uploading a high-priority contract PDF for neural digestion. 
              The system will extract all clauses and build a semantic index for AI Chat.
            </p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="mt-8 px-8 py-4 bg-mac-blue text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-mac-blue/20 hover:bg-mac-navy transition-all"
            >
              Initialize First Contract
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractHubView;
