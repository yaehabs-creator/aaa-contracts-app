import React from 'react';
import toast from 'react-hot-toast';

interface SourceTextModalProps {
    show: boolean;
    fullOcrText: string | null;
    isRepairing: boolean;
    onRepair: () => void;
    onClose: () => void;
}

export const SourceTextModal: React.FC<SourceTextModalProps> = ({
    show,
    fullOcrText,
    isRepairing,
    onRepair,
    onClose
}) => {
    if (!show) return null;

    const handleCopy = () => {
        if (fullOcrText) {
            navigator.clipboard.writeText(fullOcrText);
            toast.success('Copied to clipboard');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-aaa-border">
                <div className="p-8 border-b border-aaa-border flex items-center justify-between bg-white relative z-10">
                    <div>
                        <h2 className="text-3xl font-black text-aaa-blue tracking-tighter">Source Text Inspection</h2>
                        <p className="text-xs font-black text-aaa-muted uppercase tracking-widest mt-1">Directly extracted OCR data</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {fullOcrText && (
                            <button
                                onClick={onRepair}
                                disabled={isRepairing}
                                className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isRepairing ? 'bg-slate-100 text-aaa-muted cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                            >
                                {isRepairing ? 'Repairing...' : 'Repair with AI'}
                            </button>
                        )}
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-3 px-6 py-3 bg-white border border-aaa-blue text-aaa-blue rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-aaa-blue hover:text-white transition-all shadow-sm active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                            Copy Text
                        </button>
                        <button
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center bg-aaa-bg rounded-2xl text-aaa-muted hover:text-aaa-blue transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-10 bg-slate-50 thin-scrollbar">
                    <pre className="p-12 bg-white rounded-[32px] border border-aaa-border whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-700">{fullOcrText}</pre>
                </div>
                <div className="p-8 border-t border-aaa-border bg-white flex justify-end">
                    <button onClick={onClose} className="px-10 py-4 bg-aaa-blue text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-aaa-hover transition-all">Close Viewer</button>
                </div>
            </div>
        </div>
    );
};
