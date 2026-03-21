import React from 'react';

interface ExtractionPanelProps {
    ingestionMode: 'extraction' | 'pdf-viewer' | 'claude-native' | 'paddle-ocr';
    setIngestionMode: (mode: 'extraction' | 'pdf-viewer' | 'claude-native' | 'paddle-ocr') => void;
    isProcessing: boolean;
    processingStatus: string;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ExtractionPanel: React.FC<ExtractionPanelProps> = ({
    ingestionMode,
    setIngestionMode,
    isProcessing,
    processingStatus,
    fileInputRef,
    onFileUpload
}) => {
    return (
        <div className="bg-white rounded-3xl border border-aaa-border shadow-premium p-8 border-t-8 border-t-aaa-accent relative overflow-hidden">
            {isProcessing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 mb-6 relative">
                        <div className="absolute inset-0 border-4 border-aaa-accent/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-aaa-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                    <h4 className="text-xl font-black text-aaa-text mb-2 tracking-tighter uppercase">Processing Source</h4>
                    <p className="text-sm font-bold text-aaa-accent animate-pulse">{processingStatus}</p>
                </div>
            )}

            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xl font-black text-aaa-text tracking-tighter">Source Ingestion</h4>
                <div className="flex p-1 bg-aaa-bg/50 border border-aaa-border rounded-xl flex-wrap">
                    <button
                        onClick={() => setIngestionMode('extraction')}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${ingestionMode === 'extraction' ? 'bg-aaa-blue text-white shadow-sm' : 'text-aaa-muted hover:text-aaa-blue'}`}
                    >
                        OCR EXTRACTION
                    </button>
                    <button
                        onClick={() => setIngestionMode('pdf-viewer')}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${ingestionMode === 'pdf-viewer' ? 'bg-aaa-blue text-white shadow-sm' : 'text-aaa-muted hover:text-aaa-blue'}`}
                    >
                        PDF VIEWER
                    </button>
                    <button
                        onClick={() => setIngestionMode('claude-native')}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${ingestionMode === 'claude-native' ? 'bg-aaa-blue text-white shadow-sm' : 'text-aaa-muted hover:text-aaa-blue'}`}
                        title="Use Claude's built-in PDF vision for deep analysis (Fast & Accurate)"
                    >
                        CLAUDE NATIVE
                    </button>
                    <button
                        onClick={() => setIngestionMode('paddle-ocr')}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${ingestionMode === 'paddle-ocr' ? 'bg-aaa-blue text-white shadow-sm' : 'text-aaa-muted hover:text-aaa-blue'}`}
                        title="Deep extraction of clauses using PaddleOCR"
                    >
                        PADDLE OCR
                    </button>
                </div>
            </div>
            <p className="text-[10px] font-black text-aaa-muted uppercase tracking-widest mb-8">
                {ingestionMode === 'paddle-ocr' ? 'Extract conditions into side-by-side clauses using PaddleOCR' : ingestionMode === 'extraction' ? 'Scan PDF for automated data extraction' : ingestionMode === 'claude-native' ? 'Analyze PDF using Claude Native Intelligence (No OCR required)' : 'Upload original PDF for direct viewing'}
            </p>

            <div
                onClick={() => fileInputRef.current?.click()}
                className="bg-aaa-bg/30 border-2 border-dashed border-aaa-border rounded-2xl p-12 flex flex-col items-center gap-4 hover:border-aaa-accent hover:bg-aaa-accent/5 transition-all cursor-pointer group"
            >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-aaa-accent shadow-sm border border-aaa-accent/10 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-aaa-muted group-hover:text-aaa-accent">Select Source PDF</p>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileUpload}
                    className="hidden"
                    accept="application/pdf"
                />
            </div>
        </div>
    );
};
