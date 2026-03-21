import React from 'react';
import { ExtractedData, FolderSchemaField, SavedContract } from '@/types';
import toast from 'react-hot-toast';

interface ResultsListProps {
    extractedData: ExtractedData[];
    selectedSubfolderId: string;
    schemas: Record<string, FolderSchemaField[]>;
    effectiveContract: SavedContract | null;
    fullOcrText: string | null;
    onUpdateExtractedData: (data: ExtractedData[]) => void;
    onSetHasUnsavedChanges: (val: boolean) => void;
    onShowFullTextModal: () => void;
}

export const ResultsList: React.FC<ResultsListProps> = ({
    extractedData,
    selectedSubfolderId,
    schemas,
    effectiveContract,
    fullOcrText,
    onUpdateExtractedData,
    onSetHasUnsavedChanges,
    onShowFullTextModal
}) => {
    const subfolderData = extractedData.filter(d => d.subfolder_id === selectedSubfolderId);
    const subfolderSchemas = schemas[selectedSubfolderId] || [];

    const handleImportFullText = () => {
        if (!fullOcrText || !selectedSubfolderId || !effectiveContract) return;

        const fullTextEntry: ExtractedData = {
            id: crypto.randomUUID(),
            contract_id: effectiveContract.id,
            subfolder_id: selectedSubfolderId,
            field_key: '__full_text__',
            value: fullOcrText,
            confidence: 1.0,
            evidence: {
                page: 1,
                snippet: 'Full Document Text'
            },
            status: 'extracted'
        };

        onUpdateExtractedData([
            ...extractedData.filter(d => d.field_key !== '__full_text__' || d.subfolder_id !== selectedSubfolderId),
            fullTextEntry
        ]);
        onSetHasUnsavedChanges(true);
        toast.success('Full text imported as paragraph');
    };

    return (
        <div className="bg-white rounded-3xl border border-aaa-border shadow-premium overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-aaa-border flex items-center justify-between">
                <h4 className="text-sm font-black text-aaa-text uppercase tracking-widest">Extraction Results</h4>
                <div className="flex items-center gap-2">
                    {fullOcrText && (
                        <button
                            onClick={handleImportFullText}
                            className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:bg-emerald-700 transition-all"
                        >
                            Import Full Text
                        </button>
                    )}
                    {fullOcrText && (
                        <button
                            onClick={onShowFullTextModal}
                            className="px-4 py-1.5 bg-aaa-blue text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:bg-aaa-hover transition-all"
                        >
                            Source Text
                        </button>
                    )}
                </div>
            </div>
            <div className="p-0 max-h-[400px] overflow-y-auto thin-scrollbar">
                {subfolderData.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-xs font-bold text-aaa-muted italic">No data extracted for this subfolder yet.</p>
                    </div>
                ) : (
                    subfolderData.map(data => {
                        const field = subfolderSchemas.find(f => f.key === data.field_key);
                        const isFullText = data.field_key === '__full_text__';
                        const isClaudeAnalysis = data.field_key === '__claude_analysis__';

                        return (
                            <div key={data.id} className={`p-6 hover:bg-slate-50 transition-all border-b border-slate-100 last:border-b-0 ${isFullText ? 'bg-emerald-50/30' : isClaudeAnalysis ? 'bg-aaa-blue/[0.03]' : ''}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isFullText ? 'text-emerald-600' : isClaudeAnalysis ? 'text-aaa-blue' : 'text-aaa-muted'}`}>
                                        {isFullText ? 'Full Document Text (Integrated)' : isClaudeAnalysis ? 'Claude Native Intelligence Analysis' : (field?.label || data.field_key)}
                                    </span>
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded uppercase">Page {data.evidence.page}</span>
                                </div>

                                {isFullText ? (
                                    <div className="flex flex-col gap-3">
                                        <div className="text-xs font-medium text-aaa-muted line-clamp-3 bg-white/50 p-4 rounded-xl border border-emerald-100 italic">
                                            {data.value || 'No content'}
                                        </div>
                                        <button
                                            onClick={onShowFullTextModal}
                                            className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            Read Full Extraction
                                        </button>
                                    </div>
                                ) : isClaudeAnalysis ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-aaa-blue/10 text-aaa-blue text-[8px] font-black rounded-lg uppercase tracking-widest w-fit">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            AI Report Generated
                                        </div>
                                        <div className="text-sm font-medium text-aaa-text whitespace-pre-wrap bg-white/50 p-6 rounded-2xl border border-aaa-blue/10 leading-relaxed shadow-sm">
                                            {data.value || 'Analysis pending...'}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm font-black text-aaa-blue mb-2">{data.value || 'N/A'}</div>
                                        {data.evidence.snippet && (
                                            <div className="bg-aaa-bg/50 p-3 rounded-lg border border-aaa-border/50">
                                                <p className="text-[10px] font-medium text-aaa-muted italic">"...{data.evidence.snippet}..."</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
