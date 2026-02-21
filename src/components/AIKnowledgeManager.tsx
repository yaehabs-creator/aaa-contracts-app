import React, { useState, useEffect, useRef } from 'react';
import {
    uploadJsonFile,
    getAllKnowledgeFiles,
    deleteKnowledgeFile,
    AIKnowledgeFile,
    uploadPdfToKnowledge
} from '../services/aiKnowledgeService';
import { DoclingService } from '../services/doclingService';
import toast from 'react-hot-toast';

export const AIKnowledgeManager: React.FC = () => {
    const [files, setFiles] = useState<AIKnowledgeFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isOcrProcessing, setIsOcrProcessing] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [pasteText, setPasteText] = useState('');
    const [showPasteModal, setShowPasteModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showLibrary, setShowLibrary] = useState(false);
    const libraryRef = useRef<HTMLDivElement>(null);

    const loadFiles = async () => {
        setIsLoading(true);
        try {
            const data = await getAllKnowledgeFiles();
            setFiles(data);
        } catch (error) {
            console.error('Failed to load knowledge files:', error);
            console.warn('Knowledge base table might not exist yet. Run migration 024.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (libraryRef.current && !libraryRef.current.contains(event.target as Node)) {
                setShowLibrary(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLibrarySelect = async (file: AIKnowledgeFile) => {
        setShowLibrary(false);
        if (!name.trim()) {
            setName(file.name + ' (Copy)');
        }

        // If it's a PDF, we can re-process or just copy the content
        // The user likely wants to use the ALREADY processed content or re-run with new metadata
        setIsUploading(true);
        const toastId = toast.loading(`Using "${file.original_filename}" from library...`);

        try {
            // We reuse the existing content but create a new entry with the new name/description
            const isPdf = file.file_type === 'pdf';

            if (isPdf && file.raw_file_path) {
                // If it's a PDF and we have the raw file, we could re-run OCR if we wanted,
                // but usually reusing the structured JSON content is what's intended for "speed"
                await uploadPdfToKnowledge(
                    new File([], file.original_filename), // Dummy file
                    name.trim() || file.name + ' (Library)',
                    file.content.raw_text || JSON.stringify(file.content), // Reuse content
                    description.trim() || file.description || '',
                    file.raw_file_path
                );
            } else {
                // Simple clone for JSON
                await uploadJsonFile(
                    new File([JSON.stringify(file.content)], file.original_filename, { type: 'application/json' }),
                    name.trim() || file.name + ' (Library)',
                    description.trim() || file.description || ''
                );
            }

            toast.success('Successfully added from library', { id: toastId });
            setName('');
            setDescription('');
            loadFiles();
        } catch (error: any) {
            toast.error(error.message || 'Reuse failed', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        loadFiles();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!name.trim()) {
            toast.error('Please provide a name for this data source');
            return;
        }

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        setIsUploading(true);
        const toastId = toast.loading(isPdf ? 'Running OCR on PDF...' : 'Uploading data to knowledge base...');

        try {
            if (isPdf) {
                setIsOcrProcessing(true);
                const ocrResult = await DoclingService.processFile(file, file.name);
                setIsOcrProcessing(false);

                toast.loading('Structuring and saving contract data...', { id: toastId });
                await uploadPdfToKnowledge(file, name.trim(), ocrResult.text, description.trim());
            } else {
                await uploadJsonFile(file, name.trim(), description.trim());
            }

            toast.success('Successfully added to knowledge base', { id: toastId });
            setName('');
            setDescription('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            loadFiles();
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(error.message || 'Upload failed', { id: toastId });
        } finally {
            setIsUploading(false);
            setIsOcrProcessing(false);
        }
    };

    const handlePasteSubmit = async () => {
        if (!name.trim() || !pasteText.trim()) {
            toast.error('Please provide both a label and the text content');
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Structuring and saving knowledge...');

        try {
            // We use a dummy file name for the storage record
            const dummyFile = new File([pasteText], `${name.replace(/\s+/g, '_')}_manual.txt`, { type: 'text/plain' });
            await uploadPdfToKnowledge(dummyFile, name.trim(), pasteText, description.trim());

            toast.success('Added to knowledge base', { id: toastId });
            setName('');
            setDescription('');
            setPasteText('');
            setShowPasteModal(false);
            loadFiles();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add knowledge', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (file: AIKnowledgeFile) => {
        if (!confirm(`Are you sure you want to remove "${file.name}" from the AI knowledge base?`)) return;

        const toastId = toast.loading('Removing file...');
        try {
            await deleteKnowledgeFile(file.id, file.file_path, file.raw_file_path);
            toast.success('File removed', { id: toastId });
            loadFiles();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete file', { id: toastId });
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-aaa-border overflow-hidden min-h-[500px]">
            <div className="p-6 border-b border-aaa-border bg-gradient-to-r from-aaa-blue/[0.02] to-transparent flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-black text-aaa-blue flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-aaa-blue text-white flex items-center justify-center text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        </span>
                        AI Knowledge Base
                    </h3>
                    <p className="text-sm text-aaa-blue/60 mt-2">
                        Upload JSON/PDF files or paste text to provide persistent context for the AI.
                    </p>
                </div>
                <button
                    onClick={() => setShowPasteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-aaa-blue rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                    Paste Text
                </button>
            </div>

            <div className="p-6 bg-slate-50 border-b border-aaa-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-aaa-blue/40 uppercase tracking-widest mb-1.5">Data Label</label>
                        <input
                            type="text"
                            placeholder="e.g., General Conditions"
                            className="w-full px-4 py-2.5 rounded-lg border border-aaa-border focus:ring-2 focus:ring-aaa-blue/20 outline-none transition-all placeholder:text-aaa-blue/20"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-aaa-blue/40 uppercase tracking-widest mb-1.5">Description (Optional)</label>
                        <input
                            type="text"
                            placeholder="Contract conditions for reference"
                            className="w-full px-4 py-2.5 rounded-lg border border-aaa-border focus:ring-2 focus:ring-aaa-blue/20 outline-none transition-all placeholder:text-aaa-blue/20"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4 relative">
                    <input
                        type="file"
                        accept=".json,.pdf"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || !name.trim()}
                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all
                            ${isUploading || !name.trim()
                                ? 'bg-aaa-border text-aaa-blue/30 cursor-not-allowed'
                                : 'bg-aaa-blue text-white hover:bg-aaa-blue-dark shadow-md hover:shadow-lg active:scale-95'
                            }`}
                    >
                        {isUploading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isOcrProcessing ? 'OCR Processing...' : 'Uploading...'}
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Add PDF or JSON
                            </>
                        )}
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowLibrary(!showLibrary)}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-4 py-3 bg-white border border-aaa-border hover:bg-slate-50 text-aaa-blue rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm disabled:opacity-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
                            Select from Library
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showLibrary ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                        </button>

                        {showLibrary && (
                            <div ref={libraryRef} className="absolute bottom-full mb-2 left-0 w-80 bg-white rounded-2xl shadow- premium border border-aaa-border z-30 py-3 animate-in fade-in slide-in-from-bottom-2">
                                <div className="px-4 py-2 border-b border-aaa-border mb-2">
                                    <h4 className="text-[10px] font-black text-aaa-blue/40 uppercase tracking-widest">Available Documents</h4>
                                </div>
                                <div className="max-h-60 overflow-y-auto thin-scrollbar">
                                    {files.length === 0 ? (
                                        <div className="px-4 py-3 text-xs text-aaa-blue/40 italic">No files in library yet.</div>
                                    ) : (
                                        // Filter for unique original filenames to avoid clutter
                                        Array.from(new Set(files.map(f => f.original_filename))).map(filename => {
                                            const file = files.find(f => f.original_filename === filename)!;
                                            return (
                                                <button
                                                    key={file.id}
                                                    onClick={() => handleLibrarySelect(file)}
                                                    className="w-full text-left px-4 py-3 hover:bg-aaa-blue/[0.03] flex items-center gap-4 group transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-aaa-blue group-hover:bg-aaa-blue group-hover:text-white transition-all">
                                                        {file.file_type === 'pdf' ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[11px] font-black text-aaa-blue truncate">{file.original_filename}</div>
                                                        <div className="text-[9px] font-bold text-aaa-blue/40 uppercase tracking-widest">Library Item</div>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {!name.trim() && (
                        <span className="text-xs text-aaa-blue/40 italic">Set a label first to enable upload</span>
                    )}
                </div>
            </div>

            {/* Paste Modal */}
            {showPasteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-aaa-blue/20 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-aaa-border flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-aaa-blue tracking-tight">Paste Contract Text</h3>
                                <p className="text-sm text-aaa-blue/60 mt-1">Paste the verbatim contract conditions here to structure them.</p>
                            </div>
                            <button onClick={() => setShowPasteModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="p-8">
                            <label className="block text-xs font-bold text-aaa-blue/40 uppercase tracking-widest mb-2">Text Content</label>
                            <textarea
                                className="w-full h-80 px-4 py-4 rounded-2xl border border-aaa-border focus:ring-4 focus:ring-aaa-blue/10 outline-none transition-all resize-none font-mono text-sm"
                                placeholder="Paste text starting with '1. DEFINITIONS...'"
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                            />
                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowPasteModal(false)}
                                    className="px-6 py-3 rounded-xl font-bold text-aaa-blue/40 hover:text-aaa-blue hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePasteSubmit}
                                    disabled={isUploading || !pasteText.trim() || !name.trim()}
                                    className={`px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md
                                        ${isUploading || !pasteText.trim() || !name.trim()
                                            ? 'bg-aaa-border text-aaa-blue/30 cursor-not-allowed'
                                            : 'bg-aaa-blue text-white hover:bg-aaa-blue-dark active:scale-95'
                                        }`}
                                >
                                    Structure and Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto min-h-[300px]">
                {isLoading ? (
                    <div className="h-60 flex items-center justify-center opacity-40">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-4 border-aaa-blue border-t-transparent animate-spin" />
                            <span className="text-xs font-bold uppercase tracking-widest">Loading Knowledge Base...</span>
                        </div>
                    </div>
                ) : files.length === 0 ? (
                    <div className="h-60 flex flex-col items-center justify-center text-center p-8 opacity-30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-aaa-blue"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        <h4 className="text-lg font-black uppercase tracking-widest text-aaa-blue">No Knowledge Files</h4>
                        <p className="text-sm font-medium max-w-xs mt-1 text-aaa-blue">Upload JSON documents to build your project's AI knowledge base.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white sticky top-0 z-10 shadow-sm">
                                <th className="px-6 py-4 text-xs font-black text-aaa-blue/40 uppercase tracking-widest border-b border-aaa-border">Name</th>
                                <th className="px-6 py-4 text-xs font-black text-aaa-blue/40 uppercase tracking-widest border-b border-aaa-border">Source File</th>
                                <th className="px-6 py-4 text-xs font-black text-aaa-blue/40 uppercase tracking-widest border-b border-aaa-border">Size</th>
                                <th className="px-6 py-4 text-xs font-black text-aaa-blue/40 uppercase tracking-widest border-b border-aaa-border text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file) => (
                                <tr key={file.id} className="group hover:bg-aaa-blue/[0.02] transition-colors border-b border-aaa-border/50">
                                    <td className="px-6 py-4">
                                        <div className="font-black text-aaa-blue">{file.name}</div>
                                        {file.description && <div className="text-xs text-aaa-blue/60 mt-0.5">{file.description}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block uppercase tracking-wider">{file.original_filename}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-aaa-blue/30 uppercase tracking-widest">
                                        {formatSize(file.file_size)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(file)}
                                            className="p-2 rounded-lg text-aaa-blue/20 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                            title="Remove from knowledge base"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AIKnowledgeManager;
