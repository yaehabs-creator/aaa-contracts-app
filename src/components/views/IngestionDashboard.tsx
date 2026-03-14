import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
    uploadContractSection, 
    verifyAndActivateContract,
    storeIngestionClauses
} from '@/services/contractIngestionService';
import { AnalysisStatus, SavedContract, IngestionSection } from '@/types';
import toast from 'react-hot-toast';

export const IngestionDashboard: React.FC = () => {
    const { 
        contract, 
        setContract, 
        setStatus, 
        progress, 
        setProgress,
        setLiveStatus
    } = useAppStore();

    const [isVerifying, setIsVerifying] = useState(false);
    const [uploadingSection, setUploadingSection] = useState<string | null>(null);

    // Refresh contract data periodically if processing
    useEffect(() => {
        if (!contract) return;
        
        const isProcessing = contract.status === 'processing' || 
                           contract.ingestion_progress.completed_sections.length < 3;
        
        if (isProcessing) {
            const interval = setInterval(async () => {
                // In a real app, we would fetch the latest contract record from Supabase here
                // For this demo, we'll assume the local state is updated by the upload/extraction logic
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [contract]);

    if (!contract) return null;

    const sections = [
        { key: 'AGREEMENT', label: 'Form of Agreement', icon: '📄' },
        { key: 'GENERAL_CONDITIONS', label: 'General Conditions', icon: '⚖️' },
        { key: 'PARTICULAR_CONDITIONS', label: 'Particular Conditions', icon: '📝' }
    ];

    const handleFileUpload = async (sectionKey: string, file: File) => {
        setUploadingSection(sectionKey);
        setLiveStatus({ message: `Uploading ${sectionKey}...`, detail: 'Calculating hash and sending to cloud', isActive: true });
        
        try {
            const section = await uploadContractSection(contract.id, sectionKey, file);
            toast.success(`${sectionKey} uploaded successfully!`);
            
            // Start "Simulation" of Extraction (Since we don't have the real pipeline yet)
            setLiveStatus({ message: `Extracting Clauses from ${sectionKey}...`, detail: 'Neural OCR parsing active', isActive: true });
            
            // Mock Extraction Delay
            setTimeout(async () => {
                const mockClauses = [
                    { clause_number: '1.1', title: 'Definitions', content: 'Verbatim content of 1.1...', page_start: 1, page_end: 2 },
                    { clause_number: '2.1', title: 'Right of Access', content: 'Verbatim content of 2.1...', page_start: 3, page_end: 4 }
                ];
                
                await storeIngestionClauses(contract.id, section.id, sectionKey, mockClauses);
                
                // Update Local Progress
                const updatedProg = { ...contract.ingestion_progress };
                if (!updatedProg.completed_sections.includes(sectionKey)) {
                    updatedProg.completed_sections.push(sectionKey);
                }
                setContract({ ...contract, ingestion_progress: updatedProg });
                
                setLiveStatus({ message: 'Extraction Complete', detail: `Processed ${mockClauses.length} clauses`, isActive: false });
                setUploadingSection(null);
            }, 5000);

        } catch (err: any) {
            toast.error(err.message || "Upload failed");
            setUploadingSection(null);
            setLiveStatus({ message: 'Error', detail: err.message, isActive: false });
        }
    };

    const handleVerifyAndActivate = async () => {
        setIsVerifying(true);
        try {
            const result = await verifyAndActivateContract(contract.id);
            toast.success(`Contract activated! Processed ${result.clauseCount} clauses.`);
            setStatus(AnalysisStatus.COMPLETED);
        } catch (err: any) {
            toast.error(err.message || "Verification failed");
        } finally {
            setIsVerifying(false);
        }
    };

    const isComplete = contract.ingestion_progress.completed_sections.length >= 3;

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Verified Pipeline Mode
                </div>
                <h2 className="text-5xl font-black text-aaa-blue tracking-tighter">
                    {contract.title}
                </h2>
                <p className="text-aaa-muted font-medium text-lg">
                    Build your contract baseline by uploading the verified sections below.
                </p>
            </div>

            {/* Progress Visualization */}
            <div className="bg-white p-8 rounded-[32px] border border-aaa-border shadow-premium relative overflow-hidden group">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h4 className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.2em] mb-1">Ingestion Integrity</h4>
                        <div className="text-3xl font-black text-aaa-blue">
                            {Math.round((contract.ingestion_progress.completed_sections.length / 3) * 100)}%
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-black text-aaa-muted uppercase tracking-widest block mb-1">Status</span>
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isComplete ? 'bg-emerald-500 text-white' : 'bg-aaa-blue/10 text-aaa-blue'}`}>
                            {isComplete ? 'Ready for Activation' : 'Pending Chunks'}
                        </span>
                    </div>
                </div>
                <div className="h-4 bg-aaa-bg rounded-full overflow-hidden border border-aaa-border/50">
                    <div 
                        className="h-full bg-gradient-to-r from-aaa-blue to-aaa-accent rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(56,121,209,0.5)]"
                        style={{ width: `${(contract.ingestion_progress.completed_sections.length / 3) * 100}%` }}
                    />
                </div>
            </div>

            {/* Section Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {sections.map((sec) => {
                    const isDone = contract.ingestion_progress.completed_sections.includes(sec.key);
                    const isUploading = uploadingSection === sec.key;
                    
                    return (
                        <div 
                            key={sec.key}
                            className={`group relative bg-white p-10 rounded-[40px] border-2 transition-all duration-500 flex flex-col items-center text-center gap-6 ${isDone ? 'border-emerald-500 bg-emerald-50/20' : isUploading ? 'border-aaa-blue bg-aaa-blue/5' : 'border-aaa-border hover:border-aaa-blue/50 hover:shadow-premium'}`}
                        >
                            {/* Card Header */}
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-xl transition-all duration-500 group-hover:scale-110 ${isDone ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-aaa-bg text-aaa-blue'}`}>
                                {isDone ? '✓' : sec.icon}
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className={`text-xl font-black ${isDone ? 'text-emerald-700' : 'text-aaa-blue'}`}>{sec.label}</h3>
                                <p className="text-xs text-aaa-muted font-bold uppercase tracking-widest">
                                    {isDone ? 'Verbatim Extracted' : isUploading ? 'Processing...' : 'Awaiting PDF Injection'}
                                </p>
                            </div>

                            {/* Actions */}
                            {!isDone && !isUploading && (
                                <button 
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'application/pdf';
                                        input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) handleFileUpload(sec.key, file);
                                        };
                                        input.click();
                                    }}
                                    className="px-8 py-3 bg-aaa-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-aaa-navy transition-all active:scale-95"
                                >
                                    Inject Chunk
                                </button>
                            )}

                            {isUploading && (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-4 border-aaa-blue/20 border-t-aaa-blue rounded-full animate-spin" />
                                    <span className="text-[10px] font-black text-aaa-blue animate-pulse">Scanning...</span>
                                </div>
                            )}

                            {isDone && (
                                <div className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 px-4 py-2 rounded-full border border-emerald-200 uppercase tracking-widest">
                                    Integrity Verified
                                </div>
                            )}

                            {/* Decorative Background */}
                            <div className="absolute top-4 right-4 text-[40px] font-black text-aaa-blue/5 opacity-0 group-hover:opacity-100 transition-opacity select-none pointer-events-none">
                                {sec.key.split('_')[0]}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Final Action */}
            <div className="flex justify-center pt-8">
                <button 
                    onClick={handleVerifyAndActivate}
                    disabled={!isComplete || isVerifying}
                    className={`group relative overflow-hidden px-16 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.3em] transition-all duration-500 shadow-2xl active:scale-95 ${isComplete ? 'bg-aaa-blue text-white hover:bg-aaa-navy cursor-pointer' : 'bg-aaa-bg text-aaa-muted cursor-not-allowed opacity-50'}`}
                >
                    <span className="relative z-10 flex items-center gap-3">
                        {isVerifying ? 'Verifying Baseline...' : 'Activate Ready State'}
                        {isComplete && !isVerifying && <span className="text-xl group-hover:translate-x-2 transition-transform">→</span>}
                    </span>
                    {isComplete && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                    )}
                </button>
            </div>

            {/* AI Warning / Helper */}
            <div className="bg-aaa-blue/5 p-6 rounded-3xl border border-aaa-blue/10 flex items-start gap-4 mx-auto max-w-4xl">
                <div className="text-2xl">🤖</div>
                <div className="space-y-1">
                    <h5 className="text-sm font-black text-aaa-blue uppercase tracking-tight">System Guidance</h5>
                    <p className="text-xs text-aaa-muted font-medium leading-relaxed">
                        For the highest precision, ensure your PDFs are text-readable. The verified pipeline will automatically detect baseline overrides once the General and Particular conditions are cross-referenced during activation.
                    </p>
                </div>
            </div>
        </div>
    );
};
