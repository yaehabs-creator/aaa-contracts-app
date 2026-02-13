import React, { useState, useRef, useEffect } from 'react';
import {
    ContractSubfolder,
    FolderSchemaField,
    SavedContract,
    ExtractedData
} from '../../types';
import toast from 'react-hot-toast';
import { PaddleOcrService } from '../services/paddleOcrService';
import { extractDataForSchema } from '../../services/organizerExtractionService';
import { getOrganizerData } from '../services/supabaseService';
import { cleanTextWithAI } from '../services/textPreprocessor';

interface ContractOrganizerProps {
    contract: SavedContract | null;
    onClose: () => void;
    onSaveAll: (data: {
        contract?: SavedContract,
        subfolders: ContractSubfolder[],
        schemas: Record<string, FolderSchemaField[]>,
        extractedData: ExtractedData[]
    }) => Promise<void>;
}

const FIXED_FOLDERS = [
    { code: 'A', name: 'Form of Agreement & its Annexes' },
    { code: 'B', name: 'Signed Letter of Acceptance' },
    { code: 'C', name: 'Conditions of Contract & its Appendices' },
    { code: 'D', name: 'Addendums & Post Tender Addendums' },
    { code: 'I', name: 'Priced Bills of Quantities and Method of Measurements' },
    { code: 'N', name: 'Automation Application' },
    { code: 'P', name: 'Instruction To Tenderers & its Appendices' }
] as const;

export const ContractOrganizer: React.FC<ContractOrganizerProps> = ({ contract, onClose, onSaveAll }) => {
    const [activeFolder, setActiveFolder] = useState<string>('A');
    const [selectedSubfolderId, setSelectedSubfolderId] = useState<string | null>(null);
    const [subfolders, setSubfolders] = useState<ContractSubfolder[]>([]);
    const [schemas, setSchemas] = useState<Record<string, FolderSchemaField[]>>({});
    const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const [showFullTextModal, setShowFullTextModal] = useState(false);
    const [fullOcrText, setFullOcrText] = useState<string | null>(null);
    const [isRepairing, setIsRepairing] = useState(false);

    // Local contract state for when no contract is passed via props
    const [localContract, setLocalContract] = useState<SavedContract | null>(null);
    const [showCreationForm, setShowCreationForm] = useState(!contract);
    const [newContractTitle, setNewContractTitle] = useState('');
    const [newContractor, setNewContractor] = useState('');

    const effectiveContract = contract || localContract;

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper to add a subfolder
    const addSubfolder = () => {
        const newId = crypto.randomUUID();
        const newSubfolder: ContractSubfolder = {
            id: newId,
            template_id: 'active_template',
            folder_code: activeFolder as any,
            name: 'New Subfolder',
            order_index: subfolders.filter(s => s.folder_code === activeFolder).length
        };
        setSubfolders([...subfolders, newSubfolder]);
        setSelectedSubfolderId(newId);
        setSchemas({ ...schemas, [newId]: [] });
    };

    const removeSubfolder = (id: string) => {
        setSubfolders(subfolders.filter(s => s.id !== id));
        if (selectedSubfolderId === id) setSelectedSubfolderId(null);
        setExtractedData(extractedData.filter(d => d.subfolder_id !== id));
    };

    const updateSubfolder = (id: string, name: string) => {
        setSubfolders(subfolders.map(s => s.id === id ? { ...s, name } : s));
    };

    // Schema Field Helpers
    const addField = (subfolderId: string) => {
        const newField: FolderSchemaField = {
            id: crypto.randomUUID(),
            subfolder_id: subfolderId,
            key: `field_${Date.now()}`,
            label: 'New Field',
            type: 'text',
            required: false
        };
        setSchemas({
            ...schemas,
            [subfolderId]: [...(schemas[subfolderId] || []), newField]
        });
    };

    const updateField = (subfolderId: string, fieldId: string, updates: Partial<FolderSchemaField>) => {
        setSchemas({
            ...schemas,
            [subfolderId]: (schemas[subfolderId] || []).map(f => f.id === fieldId ? { ...f, ...updates } : f)
        });
    };

    const removeField = (subfolderId: string, fieldId: string) => {
        setSchemas({
            ...schemas,
            [subfolderId]: (schemas[subfolderId] || []).filter(f => f.id !== fieldId)
        });
        setExtractedData(extractedData.filter(d => d.field_key !== 'UNKNOWN')); // Note: Key logic might need refinement if used
    };

    const [ocrAvailable, setOcrAvailable] = useState<boolean | null>(null);

    // Load existing organizer data for the contract
    useEffect(() => {
        if (effectiveContract?.id) {
            const loadData = async () => {
                try {
                    const data = await getOrganizerData(effectiveContract.id);
                    if (data.subfolders.length > 0) {
                        setSubfolders(data.subfolders);

                        // Map schemas back to the state record format
                        const schemaRecord: Record<string, FolderSchemaField[]> = {};
                        data.schemas.forEach(field => {
                            if (!schemaRecord[field.subfolder_id]) {
                                schemaRecord[field.subfolder_id] = [];
                            }
                            schemaRecord[field.subfolder_id].push(field);
                        });
                        setSchemas(schemaRecord);

                        setExtractedData(data.extractedData);
                        console.log('Organizer data loaded successfully for contract:', effectiveContract.id);
                    } else {
                        // Reset if no data found for this contract
                        setSubfolders([]);
                        setSchemas({});
                        setExtractedData([]);
                    }
                } catch (err) {
                    console.error('Failed to load organizer data:', err);
                    toast.error('Failed to load existing organizer configuration');
                }
            };
            loadData();
        }
    }, [contract?.id, localContract?.id]);

    useEffect(() => {
        PaddleOcrService.checkAvailability().then(setOcrAvailable);
    }, []);

    const handleCreateContract = () => {
        if (!newContractTitle.trim()) {
            toast.error('Please enter a contract title');
            return;
        }

        const newId = crypto.randomUUID();
        const newContract: SavedContract = {
            id: newId,
            name: newContractTitle,
            title: newContractTitle,
            contractor_name: newContractor || undefined,
            status: 'draft',
            timestamp: Date.now(),
            metadata: {
                totalClauses: 0,
                generalCount: 0,
                particularCount: 0,
                highRiskCount: 0,
                conflictCount: 0
            },
            version: 1,
            is_deleted: false,
        };

        setLocalContract(newContract);
        setShowCreationForm(false);
        toast.success('Contract context initialized!');
    };

    // Document Processing Logic
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        console.log('File selected:', file?.name);

        if (!file) return;

        if (!selectedSubfolderId) {
            toast.error('Please select a subfolder first.');
            return;
        }

        if (!effectiveContract) {
            console.warn('No active contract found for extraction.');
            setShowCreationForm(true);
            return;
        }

        if (ocrAvailable === false) {
            toast.error('PaddleOCR service is unresponsive. Please start the OCR server.');
            return;
        }

        const schema = schemas[selectedSubfolderId] || [];
        if (schema.length === 0) {
            toast.error('Please define at least one field in the schema first.');
            return;
        }

        setIsProcessing(true);
        setProcessingStatus('Initializing local OCR...');
        console.log('Starting OCR for:', file.name);

        try {
            // 1. Run local OCR
            setProcessingStatus('Running OCR (this may take a minute)...');
            const ocrResponse = await PaddleOcrService.processFile(file, file.name);
            console.log('OCR Result:', ocrResponse);

            // 2. Run Extraction with Claude
            setProcessingStatus('AI Extraction in progress...');
            const extraction = await extractDataForSchema(ocrResponse.text, schema);
            console.log('Extraction Result:', extraction);

            // 3. Map to state
            const newExtractedData: ExtractedData[] = extraction.extracted_fields.map(field => {
                return {
                    id: crypto.randomUUID(),
                    contract_id: effectiveContract.id,
                    subfolder_id: selectedSubfolderId,
                    field_key: field.key,
                    value: field.value,
                    confidence: extraction.confidence_score || 0.9,
                    evidence: {
                        page: field.page_number || 1,
                        snippet: field.evidence_text || ''
                    },
                    status: field.value ? 'extracted' : 'missing' as any
                };
            });

            // Merge with existing data for this subfolder
            setExtractedData(prev => [
                ...prev.filter(d => d.subfolder_id !== selectedSubfolderId),
                ...newExtractedData
            ]);

            setFullOcrText(ocrResponse.text);
            toast.success(`Extracted ${newExtractedData.length} fields from document`);
        } catch (err: any) {
            console.error('Processing error:', err);
            toast.error(`Processing failed: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRepairText = async () => {
        if (!fullOcrText) return;

        setIsRepairing(true);
        try {
            const repairedText = await cleanTextWithAI(fullOcrText);
            setFullOcrText(repairedText);
            toast.success('Text successfully repaired with AI!');
        } catch (err: any) {
            console.error('Repair error:', err);
            toast.error(`Repair failed: ${err.message}`);
        } finally {
            setIsRepairing(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSaveAll({
                contract: localContract || undefined,
                subfolders,
                schemas,
                extractedData
            });
            // Final success toast is now handled by the App.tsx onSaveAll handler
        } catch (err) {
            toast.error('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const activeSubfolders = subfolders.filter(s => s.folder_code === activeFolder);
    const selectedSubfolder = subfolders.find(s => s.id === selectedSubfolderId);

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-premium border border-aaa-border relative">
            {/* Creation Form Overlay */}
            {showCreationForm && !effectiveContract && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-[100] flex items-center justify-center p-8 transition-all animate-in fade-in duration-500">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-premium border border-aaa-border p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-aaa-blue/5 rounded-2xl flex items-center justify-center text-aaa-blue mx-auto mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h3 className="text-3xl font-black text-aaa-text tracking-tighter">Initialize Contract</h3>
                            <p className="text-sm font-medium text-aaa-muted mt-2">Create a context for your organizer work.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-aaa-muted uppercase tracking-widest ml-1">Contract Title</label>
                                <input
                                    type="text"
                                    value={newContractTitle}
                                    onChange={(e) => setNewContractTitle(e.target.value)}
                                    placeholder="e.g. Main Construction Agreement"
                                    className="w-full px-5 py-4 bg-aaa-bg/30 border border-aaa-border rounded-2xl font-bold focus:border-aaa-blue focus:ring-4 focus:ring-aaa-blue/5 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-aaa-muted uppercase tracking-widest ml-1">Contractor Name (Optional)</label>
                                <input
                                    type="text"
                                    value={newContractor}
                                    onChange={(e) => setNewContractor(e.target.value)}
                                    placeholder="e.g. Atrium Construction"
                                    className="w-full px-5 py-4 bg-aaa-bg/30 border border-aaa-border rounded-2xl font-bold focus:border-aaa-blue focus:ring-4 focus:ring-aaa-blue/5 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex flex-col gap-3">
                            <button
                                onClick={handleCreateContract}
                                className="w-full py-5 bg-aaa-blue text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-aaa-blue/20 hover:bg-aaa-navy transform active:scale-[0.98] transition-all"
                            >
                                Start Organizing
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-4 text-[10px] font-black text-aaa-muted uppercase tracking-widest hover:text-aaa-blue transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-aaa-border bg-aaa-bg/30">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-aaa-blue tracking-tighter">Contract Organizer</h2>
                        <div className="px-3 py-1 bg-aaa-blue/10 text-aaa-blue text-[9px] font-black rounded-full uppercase tracking-widest border border-aaa-blue/20">
                            {effectiveContract?.title || 'No Contract'}
                        </div>
                        {ocrAvailable !== null && (
                            <div className={`px-3 py-1 ${ocrAvailable ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'} text-[9px] font-black rounded-full uppercase tracking-widest border`}>
                                OCR: {ocrAvailable ? 'Connected' : 'Disconnected (Local:8000)'}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-aaa-muted hover:text-aaa-blue transition-all"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isProcessing}
                        className="px-8 py-3 bg-aaa-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-aaa-navy transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        {isSaving ? 'Saving...' : 'SAVE ALL CHANGES'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Folder Tree */}
                <div className="w-80 border-r border-aaa-border flex flex-col bg-aaa-bg/10">
                    <div className="p-6">
                        <h3 className="text-[10px] font-black text-aaa-muted uppercase tracking-widest mb-4">Contract Modules</h3>
                        <div className="space-y-1">
                            {FIXED_FOLDERS.map(folder => (
                                <button
                                    key={folder.code}
                                    onClick={() => {
                                        setActiveFolder(folder.code);
                                        setSelectedSubfolderId(null);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeFolder === folder.code
                                        ? 'bg-white shadow-md border border-aaa-blue/10 text-aaa-blue'
                                        : 'text-aaa-text hover:bg-white/50'
                                        }`}
                                >
                                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black border ${activeFolder === folder.code ? 'bg-aaa-blue text-white border-aaa-blue' : 'bg-aaa-bg text-aaa-blue border-aaa-blue/10'
                                        }`}>
                                        {folder.code}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black truncate text-left leading-none mb-1 uppercase tracking-tighter">{folder.name.split(' ')[0]}</p>
                                        <p className="text-[9px] font-bold text-aaa-muted truncate text-left">{folder.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    <div className="p-8 overflow-y-auto h-full dotted-bg">
                        <div className="max-w-5xl mx-auto space-y-12 pb-20">
                            <section>
                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-aaa-border/50">
                                    <div>
                                        <h3 className="text-3xl font-black text-aaa-text tracking-tighter">
                                            Subfolders: Module {activeFolder}
                                        </h3>
                                        <p className="text-xs text-aaa-muted font-medium mt-1">Classify documents for mapping and extraction.</p>
                                    </div>
                                    <button
                                        onClick={addSubfolder}
                                        className="flex items-center gap-3 px-6 py-3 bg-aaa-bg text-aaa-blue rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-aaa-blue/10 transition-all border border-aaa-blue/10 active:scale-95"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                        Add Subfolder
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activeSubfolders.length === 0 ? (
                                        <div className="col-span-full bg-aaa-bg/10 rounded-3xl p-16 border border-dashed border-aaa-border flex flex-col items-center gap-6 group hover:bg-aaa-bg/20 transition-all cursor-pointer" onClick={addSubfolder}>
                                            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-aaa-blue shadow-sm border border-aaa-blue/5 group-hover:scale-110 transition-transform">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg font-black text-aaa-text tracking-tight">Empty Module</p>
                                                <p className="text-xs text-aaa-muted font-medium mt-1">No subfolders defined. Click to initialize the first category.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        activeSubfolders.map(sub => (
                                            <div
                                                key={sub.id}
                                                onClick={() => setSelectedSubfolderId(sub.id)}
                                                className={`group p-6 rounded-2xl border transition-all cursor-pointer relative ${selectedSubfolderId === sub.id
                                                    ? 'bg-aaa-blue/5 border-aaa-blue ring-2 ring-aaa-blue/10'
                                                    : 'bg-white border-aaa-border hover:border-aaa-blue hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <input
                                                        type="text"
                                                        value={sub.name}
                                                        onChange={(e) => updateSubfolder(sub.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="bg-transparent font-black text-sm text-aaa-text focus:outline-none focus:text-aaa-blue flex-1"
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeSubfolder(sub.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 transition-all"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>

                            {selectedSubfolder && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                                    {/* Left: Schema Editor */}
                                    <div className="bg-white rounded-3xl border border-aaa-blue/20 shadow-premium overflow-hidden border-t-8 border-t-aaa-blue">
                                        <div className="p-8 border-b border-aaa-border flex items-center justify-between bg-aaa-blue/[0.02]">
                                            <div>
                                                <h4 className="text-xl font-black text-aaa-text tracking-tighter">
                                                    Extraction Schema
                                                </h4>
                                                <p className="text-[10px] font-black text-aaa-muted uppercase tracking-widest mt-1">Fields for {selectedSubfolder.name}</p>
                                            </div>
                                            <button
                                                onClick={() => addField(selectedSubfolder.id)}
                                                className="px-6 py-2.5 bg-aaa-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-aaa-navy transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                                Add Field
                                            </button>
                                        </div>

                                        <div className="p-8 max-h-[600px] overflow-y-auto thin-scrollbar">
                                            {(schemas[selectedSubfolder.id] || []).map(field => (
                                                <div key={field.id} className="bg-aaa-bg/10 p-5 rounded-2xl border border-aaa-border/30 space-y-4 mb-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 space-y-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-1">
                                                                    <label className="text-[9px] font-black text-aaa-muted uppercase tracking-widest">Label</label>
                                                                    <input
                                                                        type="text"
                                                                        value={field.label}
                                                                        onChange={(e) => updateField(selectedSubfolder.id, field.id, { label: e.target.value })}
                                                                        className="w-full bg-white border border-aaa-border rounded-lg px-3 py-2 text-xs font-bold focus:border-aaa-blue outline-none"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[9px] font-black text-aaa-muted uppercase tracking-widest">Key</label>
                                                                    <input
                                                                        type="text"
                                                                        value={field.key}
                                                                        onChange={(e) => updateField(selectedSubfolder.id, field.id, { key: e.target.value })}
                                                                        className="w-full bg-white border border-aaa-border rounded-lg px-3 py-2 text-xs font-mono focus:border-aaa-blue outline-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeField(selectedSubfolder.id, field.id)}
                                                            className="ml-4 p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Right: Ingestion & Results */}
                                    <div className="space-y-8">
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

                                            <h4 className="text-xl font-black text-aaa-text tracking-tighter mb-2">Source Ingestion</h4>
                                            <p className="text-[10px] font-black text-aaa-muted uppercase tracking-widest mb-8">Scan PDF for extraction</p>

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
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                    accept="application/pdf"
                                                />
                                            </div>
                                        </div>

                                        {/* Extraction Results */}
                                        <div className="bg-white rounded-3xl border border-aaa-border shadow-premium overflow-hidden">
                                            <div className="p-6 bg-slate-50 border-b border-aaa-border flex items-center justify-between">
                                                <h4 className="text-sm font-black text-aaa-text uppercase tracking-widest">Extraction Results</h4>
                                                {fullOcrText && (
                                                    <button
                                                        onClick={() => setShowFullTextModal(true)}
                                                        className="px-4 py-1.5 bg-aaa-blue text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:bg-aaa-hover transition-all"
                                                    >
                                                        Source Text
                                                    </button>
                                                )}
                                            </div>
                                            <div className="p-0 max-h-[400px] overflow-y-auto thin-scrollbar">
                                                {extractedData.filter(d => d.subfolder_id === selectedSubfolderId).map(data => {
                                                    const field = schemas[selectedSubfolderId]?.find(f => f.key === data.field_key);
                                                    return (
                                                        <div key={data.id} className="p-6 hover:bg-slate-50 transition-all border-b border-slate-100 last:border-b-0">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-[10px] font-black text-aaa-muted uppercase tracking-widest">{field?.label || data.field_key}</span>
                                                                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded uppercase">Page {data.evidence.page}</span>
                                                            </div>
                                                            <div className="text-sm font-black text-aaa-blue mb-2">{data.value || 'N/A'}</div>
                                                            {data.evidence.snippet && (
                                                                <div className="bg-aaa-bg/50 p-3 rounded-lg border border-aaa-border/50">
                                                                    <p className="text-[10px] font-medium text-aaa-muted italic">"...{data.evidence.snippet}..."</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Source Text Modal */}
            {showFullTextModal && (
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
                                        onClick={handleRepairText}
                                        disabled={isRepairing}
                                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isRepairing ? 'bg-slate-100 text-aaa-muted cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                                    >
                                        {isRepairing ? 'Repairing...' : 'Repair with AI'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowFullTextModal(false)}
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
                            <button onClick={() => setShowFullTextModal(false)} className="px-10 py-4 bg-aaa-blue text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-aaa-hover transition-all">Close Viewer</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .dotted-bg { background-image: radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0); background-size: 40px 40px; }
        .thin-scrollbar::-webkit-scrollbar { width: 6px; }
        .thin-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}</style>
        </div>
    );
};
