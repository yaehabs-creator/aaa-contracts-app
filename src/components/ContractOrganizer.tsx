import React, { useState, useRef, useEffect } from 'react';
import {
    ContractSubfolder,
    FolderSchemaField,
    SavedContract,
    ExtractedData
} from '@/types';
import toast from 'react-hot-toast';
import { getDocumentReaderService } from '@/services/documentReaderService';
import { DoclingService } from '@/services/doclingService';
import { extractDataForSchema } from '@/services/organizerExtractionService';
import { getOrganizerData, uploadContractDocument } from '@/services/supabaseService';
import { cleanTextWithAI } from '@/services/textPreprocessor';
import { analyzePDFWithClaude } from '@/services/pdfAnalysisClient';
import { AIKnowledgeManager } from './AIKnowledgeManager';
import { extractClausesWithPaddleOCR } from '@/services/paddleOcrService';
import { useAppStore } from '@/store/useAppStore';
import { useOrganizerLayout } from '@/hooks/useOrganizerLayout';
import { OrganizerLayoutEditor } from './OrganizerLayoutEditor';
import { FIXED_FOLDERS as UTILS_FIXED_FOLDERS } from '@/utils/layoutUtils';

// Sub-components
import { OrganizerHeader } from './organizer/OrganizerHeader';
import { ContractCreationForm } from './organizer/ContractCreationForm';
import { OrganizerSidebar } from './organizer/OrganizerSidebar';
import { SubfolderGrid } from './organizer/SubfolderGrid';
import { ClaudeAnalysisLibrary } from './organizer/ClaudeAnalysisLibrary';
import { SchemaEditor } from './organizer/SchemaEditor';
import { ExtractionPanel } from './organizer/ExtractionPanel';
import { ResultsList } from './organizer/ResultsList';
import { SourceTextModal } from './organizer/SourceTextModal';

interface ContractOrganizerProps {
    contract: SavedContract | null;
    subfolders: ContractSubfolder[];
    schemas: Record<string, FolderSchemaField[]>;
    extractedData: ExtractedData[];
    onUpdateSubfolders: (subfolders: ContractSubfolder[]) => void;
    onUpdateSchemas: (schemas: Record<string, FolderSchemaField[]>) => void;
    onUpdateExtractedData: (data: ExtractedData[]) => void;
    onClose: () => void;
    onSaveAll: (data: {
        contract?: SavedContract,
        subfolders: ContractSubfolder[],
        schemas: Record<string, FolderSchemaField[]>,
        extractedData: ExtractedData[]
    }, silent?: boolean) => Promise<void>;
}

const FIXED_FOLDERS = UTILS_FIXED_FOLDERS;

export const ContractOrganizer: React.FC<ContractOrganizerProps> = ({
    contract,
    subfolders,
    schemas,
    extractedData,
    onUpdateSubfolders,
    onUpdateSchemas,
    onUpdateExtractedData,
    onClose,
    onSaveAll
}) => {
    const [activeFolder, setActiveFolder] = useState<string>('A');
    const [selectedSubfolderId, setSelectedSubfolderId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [forceOcr, setForceOcr] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const [showFullTextModal, setShowFullTextModal] = useState(false);
    const [fullOcrText, setFullOcrText] = useState<string | null>(null);
    const [isRepairing, setIsRepairing] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [ingestionMode, setIngestionMode] = useState<'extraction' | 'pdf-viewer' | 'claude-native' | 'paddle-ocr'>('paddle-ocr');
    const { clauses, setClauses } = useAppStore();

    // Local contract state for when no contract is passed via props
    const [localContract, setLocalContract] = useState<SavedContract | null>(null);
    const [showCreationForm, setShowCreationForm] = useState(!contract);
    const [newContractTitle, setNewContractTitle] = useState('');
    const [newContractor, setNewContractor] = useState('');

    const effectiveContract = contract || localContract;

    const { 
        activeLayout, 
        isEditing, 
        startEditing, 
        fetchLayout,
        cancelEditing
    } = useOrganizerLayout();

    // Load layout on contract change
    useEffect(() => {
        if (effectiveContract?.id) {
            fetchLayout(effectiveContract.id);
        }
    }, [effectiveContract?.id, fetchLayout]);

    // Auto-save logic
    useEffect(() => {
        if (!hasUnsavedChanges || !effectiveContract) return;

        const autoSaveTimer = setTimeout(async () => {
            console.log('Organizer: Triggering silent auto-save...');
            try {
                await onSaveAll({
                    contract: localContract || undefined,
                    subfolders,
                    schemas,
                    extractedData
                }, true); // Silent save
                setHasUnsavedChanges(false);
            } catch (err) {
                console.error('Organizer auto-save failed:', err);
            }
        }, 30000); // 30 seconds

        return () => clearTimeout(autoSaveTimer);
    }, [hasUnsavedChanges, subfolders, schemas, extractedData, effectiveContract]);

    // Warn before leaving if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const importJsonRef = useRef<HTMLInputElement>(null);

    const handleExportJSON = () => {
        if (!effectiveContract) {
            toast.error('No contract context to export');
            return;
        }

        const exportData = {
            exportTimestamp: Date.now(),
            contract: effectiveContract,
            organizer: {
                subfolders,
                schemas,
                extractedData
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contract_${effectiveContract.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Contract exported to JSON');
    };

    const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.contract || !data.organizer) {
                throw new Error('Invalid export file format');
            }

            // Restore contract context
            if (data.contract) {
                setLocalContract(data.contract);
                setShowCreationForm(false);
            }

            // Restore organizer data
            if (data.organizer.subfolders) onUpdateSubfolders(data.organizer.subfolders);
            if (data.organizer.schemas) onUpdateSchemas(data.organizer.schemas);
            if (data.organizer.extractedData) onUpdateExtractedData(data.organizer.extractedData);

            toast.success('Contract context restored from JSON');
        } catch (err: any) {
            console.error('Import error:', err);
            toast.error(`Import failed: ${err.message}`);
        } finally {
            if (importJsonRef.current) importJsonRef.current.value = '';
        }
    };

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
        onUpdateSubfolders([...subfolders, newSubfolder]);
        setSelectedSubfolderId(newId);
        onUpdateSchemas({ ...schemas, [newId]: [] });
        setHasUnsavedChanges(true);
    };

    const removeSubfolder = (id: string) => {
        onUpdateSubfolders(subfolders.filter(s => s.id !== id));
        if (selectedSubfolderId === id) setSelectedSubfolderId(null);
        // Clean up schemas for this subfolder
        const nextSchemas = { ...schemas };
        delete nextSchemas[id];
        onUpdateSchemas(nextSchemas);
        // Clean up extracted data
        onUpdateExtractedData(extractedData.filter(d => d.subfolder_id !== id));
        setHasUnsavedChanges(true);
    };

    const updateSubfolder = (id: string, name: string) => {
        onUpdateSubfolders(subfolders.map(s => s.id === id ? { ...s, name } : s));
        setHasUnsavedChanges(true);
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
        onUpdateSchemas({
            ...schemas,
            [subfolderId]: [...(schemas[subfolderId] || []), newField]
        });
        setHasUnsavedChanges(true);
    };

    const updateField = (subfolderId: string, fieldId: string, updates: Partial<FolderSchemaField>) => {
        onUpdateSchemas({
            ...schemas,
            [subfolderId]: (schemas[subfolderId] || []).map(f => f.id === fieldId ? { ...f, ...updates } : f)
        });
        setHasUnsavedChanges(true);
    };

    const removeField = (subfolderId: string, fieldId: string) => {
        onUpdateSchemas({
            ...schemas,
            [subfolderId]: (schemas[subfolderId] || []).filter(f => f.id !== fieldId)
        });
        setHasUnsavedChanges(true);
    };

    const [ocrAvailable, setOcrAvailable] = useState<boolean | null>(null);

    // Load existing organizer data for the contract
    useEffect(() => {
        if (effectiveContract?.id) {
            const loadData = async () => {
                try {
                    const data = await getOrganizerData(effectiveContract.id);
                    if (data.subfolders.length > 0) {
                        onUpdateSubfolders(data.subfolders);

                        // Map schemas back to the state record format
                        const schemaRecord: Record<string, FolderSchemaField[]> = {};
                        data.schemas.forEach(field => {
                            if (!schemaRecord[field.subfolder_id]) {
                                schemaRecord[field.subfolder_id] = [];
                            }
                            schemaRecord[field.subfolder_id].push(field);
                        });
                        onUpdateSchemas(schemaRecord);

                        onUpdateExtractedData(data.extractedData);

                        // Also initialize fullOcrText if it exists in extractedData
                        const fullTextEntry = data.extractedData.find(d => d.field_key === '__full_text__');
                        if (fullTextEntry && fullTextEntry.value) {
                            setFullOcrText(fullTextEntry.value as string);
                        }

                        console.log('Organizer data loaded successfully for contract:', effectiveContract.id);
                    } else {
                        // Reset if no data found for this contract
                        onUpdateSubfolders([]);
                        onUpdateSchemas({});
                        onUpdateExtractedData([]);
                    }
                } catch (err) {
                    console.error('Failed to load organizer data:', err);
                    toast.error('Failed to load existing organizer configuration');
                }
            };
            loadData();
        }
    }, [contract?.id, localContract?.id, onUpdateSubfolders, onUpdateSchemas, onUpdateExtractedData]);

    useEffect(() => {
        DoclingService.checkAvailability().then(setOcrAvailable);
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
            toast.error('Docling service is unresponsive. Please start the Docling server.');
            return;
        }

        const schema = schemas[selectedSubfolderId] || [];
        if (schema.length === 0) {
            toast.error('Please define at least one field in the schema first.');
            return;
        }

        try {
            if (ingestionMode === 'pdf-viewer') {
                // PDF DIRECT UPLOAD (BYPASS OCR)
                setProcessingStatus('Uploading document directly...');
                const storagePath = `${effectiveContract.id}/${selectedSubfolderId}/${file.name}`;
                const publicUrl = await uploadContractDocument(file, storagePath);

                const pdfData: ExtractedData = {
                    id: crypto.randomUUID(),
                    contract_id: effectiveContract.id,
                    subfolder_id: selectedSubfolderId,
                    field_key: '__full_text__',
                    value: `Document: ${file.name} (View in PDF Player)`,
                    doc_url: publicUrl,
                    doc_name: file.name,
                    confidence: 1.0,
                    evidence: {
                        page: 1,
                        snippet: 'PDF Document Upload'
                    },
                    status: 'extracted'
                };

                onUpdateExtractedData([
                    ...extractedData.filter(d => d.subfolder_id !== selectedSubfolderId),
                    pdfData
                ]);

                setFullOcrText(null); // Clear OCR text for PDF items
                setHasUnsavedChanges(true);
                toast.success(`PDF Document uploaded successfully!`);
            } else if (ingestionMode === 'claude-native') {
                // CLAUDE NATIVE PDF ANALYSIS — upload to storage, then fetch via URL server-side
                setProcessingStatus('Uploading PDF to storage...');

                // 1. Upload file to Supabase Storage first (gets a public URL)
                const storagePath = `${effectiveContract.id}/${selectedSubfolderId}/${file.name}`;
                const publicUrl = await uploadContractDocument(file, storagePath);

                // 2. Send the storage URL to Claude Native PDF endpoint (no 413 risk)
                setProcessingStatus('Analyzing with Claude Native Intelligence...');
                const analysisResult = await analyzePDFWithClaude({
                    file,
                    storagePath,
                    publicUrl,
                    prompt: "Extract a professional summary of this document, identify the main parties, key dates, and any financial implications. Organize it as a clean report.",
                    model: 'claude-sonnet-4-5',
                });

                const analysisData: ExtractedData = {
                    id: crypto.randomUUID(),
                    contract_id: effectiveContract.id,
                    subfolder_id: selectedSubfolderId,
                    field_key: '__claude_analysis__',
                    value: analysisResult.analysis.response,
                    doc_url: publicUrl,
                    doc_name: file.name,
                    confidence: 0.98,
                    evidence: {
                        page: 1,
                        snippet: 'Claude Native PDF Intelligence'
                    },
                    status: 'extracted'
                };

                onUpdateExtractedData([
                    ...extractedData.filter(d => d.subfolder_id !== selectedSubfolderId),
                    analysisData
                ]);

                setHasUnsavedChanges(true);
                toast.success(`Claude Native Analysis complete!${analysisResult.cached ? ' (from cache)' : ''}`);

            } else if (ingestionMode === 'paddle-ocr') {
                setProcessingStatus('Extracting Clauses via PaddleOCR Pipeline...');
                
                // Call our mock paddle OCR service
                const extractedClauses = await extractClausesWithPaddleOCR(file);
                
                // Map the extracted clauses to the global app store
                // So they appear in the Main UI 'Conditions' tab side-by-side!
                setClauses([...clauses, ...extractedClauses]);
                
                setHasUnsavedChanges(true);
                toast.success(`PaddleOCR extracted ${extractedClauses.length} clauses successfully! View them in the Conditions tab.`);

            } else {
                // 1. Run local OCR
                setProcessingStatus('Running OCR (this may take a minute)...');
                const ocrResponse = await DoclingService.processFile(file, file.name);
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
                onUpdateExtractedData([
                    ...extractedData.filter(d => d.subfolder_id !== selectedSubfolderId),
                    ...newExtractedData
                ]);

                setFullOcrText(ocrResponse.text);
                setHasUnsavedChanges(true);
                toast.success(`Extracted ${newExtractedData.length} fields from document`);
            }
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
            }, false); // Not silent
            setHasUnsavedChanges(false);
            toast.success('Successfully saved all changes');
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
            <ContractCreationForm
                show={showCreationForm && !effectiveContract}
                newContractTitle={newContractTitle}
                setNewContractTitle={setNewContractTitle}
                newContractor={newContractor}
                setNewContractor={setNewContractor}
                onCreate={handleCreateContract}
                onClose={onClose}
            />

            {/* Header */}
            <OrganizerHeader
                effectiveContract={effectiveContract}
                hasUnsavedChanges={hasUnsavedChanges}
                ocrAvailable={ocrAvailable}
                syncStatus={syncStatus}
                isSaving={isSaving}
                isProcessing={isProcessing}
                onClose={onClose}
                onSave={handleSave}
            />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Folder Tree */}
                <OrganizerSidebar
                    activeFolder={activeFolder}
                    setActiveFolder={setActiveFolder}
                    activeLayout={activeLayout}
                    fixedFolders={FIXED_FOLDERS}
                    isContractActive={!!effectiveContract}
                    onStartEditing={startEditing}
                    onSetIngestionMode={setIngestionMode}
                    setSelectedSubfolderId={setSelectedSubfolderId}
                />

                {/* Main Workspace */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    <div className="p-8 overflow-y-auto h-full dotted-bg">
                        <div className="max-w-5xl mx-auto space-y-12 pb-20">
                            {activeFolder === 'DATA' ? (
                                <AIKnowledgeManager />
                            ) : (
                                <>
                                    <SubfolderGrid
                                        activeFolder={activeFolder}
                                        activeSubfolders={activeSubfolders}
                                        selectedSubfolderId={selectedSubfolderId}
                                        setSelectedSubfolderId={setSelectedSubfolderId}
                                        onAddSubfolder={addSubfolder}
                                        onUpdateSubfolder={updateSubfolder}
                                        onRemoveSubfolder={removeSubfolder}
                                    />

                                    {activeFolder === 'AI' ? (
                                        <ClaudeAnalysisLibrary extractedData={extractedData} />
                                    ) : selectedSubfolder && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                                            {/* Left: Schema Editor */}
                                            <SchemaEditor
                                                selectedSubfolder={selectedSubfolder}
                                                schemas={schemas}
                                                onAddField={addField}
                                                onUpdateField={updateField}
                                                onRemoveField={removeField}
                                            />

                                            {/* Right: Ingestion & Results */}
                                            <div className="space-y-8">
                                                <ExtractionPanel
                                                    ingestionMode={ingestionMode}
                                                    setIngestionMode={setIngestionMode}
                                                    isProcessing={isProcessing}
                                                    processingStatus={processingStatus}
                                                    fileInputRef={fileInputRef}
                                                    onFileUpload={handleFileUpload}
                                                />

                                                <ResultsList
                                                    extractedData={extractedData}
                                                    selectedSubfolderId={selectedSubfolderId}
                                                    schemas={schemas}
                                                    effectiveContract={effectiveContract}
                                                    fullOcrText={fullOcrText}
                                                    onUpdateExtractedData={onUpdateExtractedData}
                                                    onSetHasUnsavedChanges={setHasUnsavedChanges}
                                                    onShowFullTextModal={() => setShowFullTextModal(true)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Source Text Modal */}
                <SourceTextModal
                    show={showFullTextModal}
                    fullOcrText={fullOcrText}
                    isRepairing={isRepairing}
                    onRepair={handleRepairText}
                    onClose={() => setShowFullTextModal(false)}
                />
            </div>
            
            {/* Layout Editor Sidebar Overlay */}
            <OrganizerLayoutEditor 
                isOpen={isEditing} 
                onClose={() => cancelEditing()} 
            />

            <style>{`
        .dotted-bg { background-image: radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0); background-size: 40px 40px; }
        .thin-scrollbar::-webkit-scrollbar { width: 6px; }
        .thin-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}</style>
        </div>
    );
};
