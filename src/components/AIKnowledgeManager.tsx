import React, { useState, useEffect, useRef } from 'react';
import {
    uploadJsonFile,
    getAllKnowledgeFiles,
    deleteKnowledgeFile,
    AIKnowledgeFile
} from '../services/aiKnowledgeService';
import toast from 'react-hot-toast';

export const AIKnowledgeManager: React.FC = () => {
    const [files, setFiles] = useState<AIKnowledgeFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadFiles = async () => {
        setIsLoading(true);
        try {
            const data = await getAllKnowledgeFiles();
            setFiles(data);
        } catch (error) {
            console.error('Failed to load knowledge files:', error);
            // Non-critical toast to avoid annoying user if table doesn't exist yet
            console.warn('Knowledge base table might not exist yet. Run migration 024.');
        } finally {
            setIsLoading(false);
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

        setIsUploading(true);
        const toastId = toast.loading('Uploading data to knowledge base...');

        try {
            await uploadJsonFile(file, name.trim(), description.trim());
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
        }
    };

    const handleDelete = async (file: AIKnowledgeFile) => {
        if (!confirm(`Are you sure you want to remove "${file.name}" from the AI knowledge base?`)) return;

        const toastId = toast.loading('Removing file...');
        try {
            await deleteKnowledgeFile(file.id, file.file_path);
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
            <div className="p-6 border-b border-aaa-border bg-gradient-to-r from-aaa-blue/[0.02] to-transparent">
                <h3 className="text-lg font-black text-aaa-blue flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-aaa-blue text-white flex items-center justify-center text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </span>
                    AI Knowledge Base
                </h3>
                <p className="text-sm text-aaa-blue/60 mt-2">
                    Upload JSON files to provide persistent context and data for the AI chatbot to reference in every conversation.
                </p>
            </div>

            <div className="p-6 bg-slate-50 border-b border-aaa-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-aaa-blue/40 uppercase tracking-widest mb-1.5">Data Label</label>
                        <input
                            type="text"
                            placeholder="e.g., Unit Rates 2024"
                            className="w-full px-4 py-2.5 rounded-lg border border-aaa-border focus:ring-2 focus:ring-aaa-blue/20 outline-none transition-all placeholder:text-aaa-blue/20"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-aaa-blue/40 uppercase tracking-widest mb-1.5">Description (Optional)</label>
                        <input
                            type="text"
                            placeholder="What is this data for?"
                            className="w-full px-4 py-2.5 rounded-lg border border-aaa-border focus:ring-2 focus:ring-aaa-blue/20 outline-none transition-all placeholder:text-aaa-blue/20"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="file"
                        accept=".json"
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
                                Uploading...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Add JSON Knowledge
                            </>
                        )}
                    </button>
                    {!name.trim() && (
                        <span className="text-xs text-aaa-blue/40 italic">Set a label first to enable upload</span>
                    )}
                </div>
            </div>

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
