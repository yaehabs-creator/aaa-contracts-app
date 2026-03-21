
import React, { useEffect, useState, useMemo } from 'react';
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
  Network,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AnalysisStatus, SavedContract } from '@/types';
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

  const [contracts, setContracts] = useState<SavedContract[]>([]);
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
    // Poll for processing contracts
    const interval = setInterval(() => {
        const processing = contracts.some(c => c.status === 'processing' || c.status === 'queued');
        if (processing) fetchContracts();
    }, 5000);
    return () => clearInterval(interval);
  }, [contracts.length]);

  const [currentStep, setCurrentStep] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading(`Starting Smart Scan: ${file.name}...`);
    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Uploading to Repository...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${APP_CONFIG.BACKEND_URL}/contracts/process/background`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Failed to start scan');
      const { id: contractId } = await res.json();
      
      toast.success('Contract uploaded. AI scanning started.', { id: toastId });
      fetchContracts();

      // Polling for progress
      const pollInterval = setInterval(async () => {
        try {
          const contractRes = await getContractById(contractId);
          if (contractRes) {
            const prog = typeof contractRes.ingestion_progress === 'number' 
              ? contractRes.ingestion_progress 
              : (typeof contractRes.ingestion_progress === 'object' ? (contractRes.ingestion_progress as any).processed_chunks || 0 : 0);
               
            const status = contractRes.status;
            setProgress(prog);
            
            if (status === 'processed' || prog >= 100) {
              clearInterval(pollInterval);
              setCurrentStep('Complete!');
              fetchContracts();
              setIsProcessing(false);
              setProgress(0);
            } else if (status === 'error') {
              clearInterval(pollInterval);
              throw new Error('AI Scan failed');
            } else {
              setCurrentStep(`Scanning Identity... ${prog}%`);
              if (prog > 40) fetchContracts(); // Refresh to catch identity fields
            }
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 3000);

    } catch (err) {
      console.error(err);
      toast.error('Scan failed. Try a high-quality PDF.', { id: toastId });
      setIsProcessing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently remove ${name} from repository?`)) return;
    try {
      await deleteContractFromDB(id);
      toast.success('Contract removed');
      fetchContracts();
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  const toggleContext = (id: string) => {
    if (activeChatContextIds.includes(id)) {
      setActiveChatContextIds(activeChatContextIds.filter(cid => cid !== id));
      toast('Contract context deactivated');
    } else {
      setActiveChatContextIds([...activeChatContextIds, id]);
      toast.success('Added to Neural Context');
    }
  };

  const openOrganizer = async (id: string) => {
    const fullData = await getContractById(id);
    if (!fullData) return;
    setContract(fullData);
    setActiveContractId(id);
    setStatus(AnalysisStatus.ORGANIZER);
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const totalValue = contracts.reduce((acc, c) => acc + (c.value || 0), 0);
    const activeScans = contracts.filter(c => c.status === 'processing' || c.status === 'queued').length;
    const upcomingRenewals = contracts.filter(c => {
        if (!c.end_date) return false;
        const diff = new Date(c.end_date).getTime() - Date.now();
        return diff > 0 && diff < (90 * 24 * 60 * 60 * 1000);
    }).length;

    return {
        total: contracts.length,
        value: totalValue,
        activeScans,
        renewals: upcomingRenewals
    };
  }, [contracts]);

  const filteredContracts = contracts.filter(c => 
    c.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    c.contractor_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-8 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* Smart Hub Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-[24px] bg-mac-navy text-white shadow-2xl shadow-mac-navy/20 ring-4 ring-mac-blue/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-5xl font-black tracking-tighter text-mac-navy leading-none">
                    Intelligence Hub
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 ml-1">
                    Autonomous Contract Management
                </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={fetchContracts}
            className="group flex items-center gap-2 px-6 py-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-mac-blue/20 transition-all text-xs font-black uppercase tracking-widest text-slate-500"
          >
            <RefreshCcw className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Repository
          </button>
          
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".pdf" />

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-3 px-8 py-4 bg-mac-blue hover:bg-mac-navy text-white transition-all text-xs font-black uppercase tracking-widest shadow-2xl shadow-mac-blue/30 rounded-2xl active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Upload & AI Scan
          </button>
        </div>
      </div>

      {/* Business Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Portfolio', value: stats.total, sub: 'Active Contracts', icon: FolderOpen, theme: 'blue' },
          { label: 'Portfolio Value', value: `${(stats.value / 1000).toFixed(1)}k`, sub: 'Estimated AED', icon: DollarSign, theme: 'emerald' },
          { label: 'Pending Scans', value: stats.activeScans, sub: 'Neural Processing', icon: Zap, theme: 'amber' },
          { label: 'Expiring Soon', value: stats.renewals, sub: 'Next 90 Days', icon: Clock, theme: 'rose' },
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            whileHover={{ y: -5 }}
            className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-premium group transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-4 rounded-2xl bg-${stat.theme}-50 text-${stat.theme}-600 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-slate-200" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-mac-navy tracking-tighter">{stat.value}</span>
                <span className="text-[10px] font-bold text-slate-400">{stat.sub}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Repository Table Layout */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-premium overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-6 flex-1 max-w-xl">
                <div className="relative w-full group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-mac-blue transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search counterparty, project, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 rounded-2xl border border-transparent bg-white group-focus-within:border-mac-blue/20 shadow-sm outline-none font-bold text-slate-600"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-mac-blue transition-colors">
                    <Layout className="w-5 h-5" />
                </button>
                <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-mac-blue transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <th className="px-8 py-5">Contract Identity</th>
                        <th className="px-8 py-5">Counterparty</th>
                        <th className="px-8 py-5">Value (AED)</th>
                        <th className="px-8 py-5">Dates/Renewals</th>
                        <th className="px-8 py-5">AI Status</th>
                        <th className="px-8 py-5 text-right">Repository Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredContracts.map((item) => (
                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                    <div 
                                      onClick={() => toggleContext(item.id)}
                                      className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                                        activeChatContextIds.includes(item.id) 
                                            ? 'bg-mac-blue text-white shadow-lg' 
                                            : 'bg-slate-100 text-slate-300 hover:bg-mac-blue/10 hover:text-mac-blue'
                                      }`}
                                    >
                                        <Brain className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-black text-mac-navy leading-tight">{item.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {item.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-slate-300" />
                                    <span className="font-bold text-slate-600">{item.contractor_name || 'Scanning...'}</span>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <span className="font-black text-mac-navy">
                                    {item.value ? `AED ${item.value.toLocaleString()}` : 'Detecting...'}
                                </span>
                            </td>
                            <td className="px-8 py-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                        <span>Eff: {item.start_date || '...'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                                        <Clock className="w-3.5 h-3.5 opacity-50" />
                                        <span>Exp: {item.end_date || '...'}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                {item.status === 'processing' || item.status === 'queued' ? (
                                    <div className="w-32">
                                        <div className="flex justify-between text-[10px] font-black text-mac-blue mb-1 uppercase tracking-widest">
                                            <span>Scan</span>
                                            <span>{Math.round(typeof item.ingestion_progress === 'number' ? item.ingestion_progress : 0)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div 
                                                className="h-full bg-mac-blue"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${typeof item.ingestion_progress === 'number' ? item.ingestion_progress : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 w-fit">
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Extracted</span>
                                    </div>
                                )}
                            </td>
                            <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openOrganizer(item.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-mac-navy text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-mac-navy/20"
                                    >
                                        Manage
                                        <ArrowRight className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleDelete(item.id, item.name)} className="p-2.5 rounded-lg border border-slate-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {filteredContracts.length === 0 && !isLoading && (
            <div className="p-20 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto mb-8 border-2 border-dashed border-slate-200">
                    <FolderOpen className="w-10 h-10 text-slate-300" />
                </div>
                <h2 className="text-3xl font-black text-mac-navy tracking-tighter">Repository Empty</h2>
                <p className="text-slate-400 font-medium max-w-sm mx-auto mt-4">
                    Upload your first contract PDF. Our AI will automatically identify parties, dates, and terms for you.
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-10 px-10 py-5 bg-mac-blue text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-mac-blue/30"
                >
                    Initialize First Scan
                </button>
            </div>
        )}
      </div>

    </div>
  );
};

export default ContractHubView;
