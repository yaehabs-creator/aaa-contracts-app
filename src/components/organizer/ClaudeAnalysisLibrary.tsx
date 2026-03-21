import React from 'react';
import { ExtractedData } from '@/types';
import toast from 'react-hot-toast';

interface ClaudeAnalysisLibraryProps {
    extractedData: ExtractedData[];
}

export const ClaudeAnalysisLibrary: React.FC<ClaudeAnalysisLibraryProps> = ({
    extractedData
}) => {
    const analyses = extractedData.filter(d => d.field_key === '__claude_analysis__');

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-aaa-border/50">
                <div>
                    <h3 className="text-3xl font-black text-aaa-text tracking-tighter">
                        AI Analysis Library
                    </h3>
                    <p className="text-xs text-aaa-muted font-medium mt-1">Repository of all persistent Claude native document analyses.</p>
                </div>
            </div>

            {analyses.length === 0 ? (
                <div className="bg-aaa-bg/10 rounded-3xl p-16 border border-dashed border-aaa-border flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-aaa-blue shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <p className="text-sm font-bold text-aaa-muted">No AI analyses generated yet. Upload a document in "Claude Native" mode to populate this list.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {analyses.map(analysis => (
                        <div key={analysis.id} className="bg-white rounded-[32px] border border-aaa-blue/20 shadow-premium p-8 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8">
                                <div className="px-4 py-2 bg-aaa-blue text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg">
                                    Claude 3.5 Sonnet
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-aaa-blue/10 rounded-2xl flex items-center justify-center text-aaa-blue">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-aaa-text tracking-tighter uppercase">{analysis.doc_name || 'Analyzed Document'}</h4>
                                    <p className="text-[10px] font-black text-aaa-muted uppercase tracking-widest">{new Date(analysis.created_at || Date.now()).toLocaleDateString()} • Persistent Analysis</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-aaa-border rounded-2xl p-8 max-h-[400px] overflow-y-auto thin-scrollbar">
                                <div className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {analysis.value}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(analysis.value as string);
                                        toast.success('Report copied to clipboard');
                                    }}
                                    className="px-6 py-3 bg-white border border-aaa-border rounded-xl text-[10px] font-black uppercase tracking-widest text-aaa-muted hover:text-aaa-blue transition-all"
                                >
                                    Copy Report
                                </button>
                                <button
                                    onClick={() => window.open(analysis.doc_url, '_blank')}
                                    className="px-8 py-3 bg-aaa-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-aaa-navy transition-all"
                                >
                                    View Original PDF
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
