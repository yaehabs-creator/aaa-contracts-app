import React, { useRef, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from '@/store/useAppStore';
import { AnalysisStatus, SectionType, Clause, FileData, DualSourceInput } from '@/types';

// Components
import { AppWrapper } from '@/components/AppWrapper';
import { AppRouter } from '@/components/AppRouter';
import { Sidebar } from '@/components/Sidebar';
import { AppHeader } from '@/components/AppHeader';

// Views
import { IdleView } from '@/components/views/IdleView';
import { AnalyzingView } from '@/components/views/AnalyzingView';
import { CompletedView } from '@/components/views/CompletedView';
import { PdfPreviewView } from '@/components/views/PdfPreviewView';
import { ErrorView } from '@/components/views/ErrorView';
import { OrganizerView } from '@/components/views/OrganizerView';
import { IngestionDashboard } from '@/components/views/IngestionDashboard';
import { ProjectSetupView } from '@/components/views/ProjectSetupView';
import { LibraryView } from '@/components/views/LibraryView';

// Hooks & Contexts
import { useAuth } from '@/contexts/AuthContext';

// Services
import { saveContractToSupabase } from '@/services/supabaseService';
import { ensureContractHasSections } from '@/services/contractMigrationService';

const App: React.FC = () => {
    const { isAdmin: checkAdmin } = useAuth();
    const {
        status,
        setStatus,
        contract,
        setContract,
        clauses,
        setClauses,
        projectName,
        setProjectName,
        activeContractId,
        setActiveContractId,
        isSaving,
        setIsSaving,
        setSaveStatus,
        setError,
        error,
        inputMode
    } = useAppStore();

    // Refs for file inputs (used by IdleView)
    const fileInputRef = useRef<HTMLInputElement>(null);
    const generalFileRef = useRef<HTMLInputElement>(null);
    const particularFileRef = useRef<HTMLInputElement>(null);
    const importBackupRef = useRef<HTMLInputElement>(null);

    // Persist current project to Supabase
    const persistCurrentProject = async (updatedClauses?: Clause[], name?: string, immediate = false) => {
        const targetClauses = updatedClauses || clauses;
        const targetName = name || projectName;

        if (!targetClauses.length || !activeContractId) return;

        setIsSaving(true);
        try {
            const contractToSave = ensureContractHasSections({
                id: activeContractId,
                name: targetName,
                timestamp: Date.now(),
                clauses: targetClauses,
                metadata: {
                    totalClauses: targetClauses.length,
                    generalCount: targetClauses.filter(c => c.condition_type === 'General').length,
                    particularCount: targetClauses.filter(c => c.condition_type === 'Particular').length,
                    highRiskCount: 0,
                    conflictCount: targetClauses.filter(c => c.comparison && c.comparison.length > 0).length,
                    timeSensitiveCount: targetClauses.filter(c => c.time_frames && c.time_frames.length > 0).length
                },
                ingestion_progress: contract?.ingestion_progress,
                status: contract?.status || 'ready'
            } as any);

            const saved = await saveContractToSupabase(contractToSave);
            setContract(saved);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err: any) {
            console.error("Save Error:", err);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    // Placeholder handlers for legacy compatibility
    const handlePdfAnalysis = async (input: FileData | DualSourceInput) => {
        console.log("PDF Analysis triggered", input);
        setStatus(AnalysisStatus.ANALYZING);
    };

    const handleTextAnalysis = async (general: string, particular: string) => {
        console.log("Text Analysis triggered", general, particular);
        setStatus(AnalysisStatus.ANALYZING);
    };

    const handleEditClause = (clause: Clause) => {
        console.log("Edit clause", clause);
    };

    const handleDeleteClause = async (index: number, sectionType?: SectionType) => {
        console.log("Delete clause", index, sectionType);
    };

    const handleReorder = async (from: number, to: number, section?: SectionType) => {
        console.log("Reorder", from, to, section);
    };

    const onOpenClause = (clauseNumber: string) => {
        console.log("Open clause", clauseNumber);
    };

    const handleAskAI = (item: any) => {
        console.log("Ask AI", item);
    };

    const processFile = (file: File, callback: (data: FileData) => void) => {
        const reader = new FileReader();
        reader.onload = () => {
            callback({
                data: (reader.result as string).split(',')[1],
                mimeType: file.type,
                name: file.name
            });
        };
        reader.readAsDataURL(file);
    };

    // Render Logic
    const renderContent = () => {
        switch (status) {
            case AnalysisStatus.IDLE:
                return <ProjectSetupView />;
            case AnalysisStatus.INGESTION:
                return <IngestionDashboard />;
            case AnalysisStatus.ANALYZING:
                return <AnalyzingView />;
            case AnalysisStatus.COMPLETED:
                return (
                    <CompletedView
                        persistCurrentProject={persistCurrentProject}
                        onOpenClause={onOpenClause}
                        handleEditClause={handleEditClause}
                        handleDeleteClause={handleDeleteClause}
                        handleReorder={handleReorder}
                        handleAskAI={handleAskAI}
                    />
                );
            case AnalysisStatus.ORGANIZER:
                return <OrganizerView />;
            case AnalysisStatus.PDF_PREVIEW:
                // Provide dummy handlers for now if this view is still accessible
                return (
                    <PdfPreviewView 
                        handleAICleanPdf={async () => {}} 
                        handleDownloadOcrJson={() => {}} 
                        handleAddPdfToContract={async () => {}} 
                    />
                );
            case AnalysisStatus.ERROR:
                return <ErrorView />;
            case AnalysisStatus.LIBRARY:
                return (
                    <LibraryView 
                        isAdmin={checkAdmin}
                        handleExportContract={() => {}}
                        handleRenameArchive={() => {}}
                        handleDeleteArchive={() => {}}
                    />
                );
            default:
                return <ProjectSetupView />;
        }
    };

    return (
        <AppWrapper>
            <AppRouter>
                <div className="flex flex-col h-screen w-full bg-aaa-bg overflow-hidden text-aaa-text">
                    <AppHeader />
                    <div className="flex flex-1 overflow-hidden">
                        {(status === AnalysisStatus.COMPLETED || status === AnalysisStatus.ORGANIZER) && (
                            <Sidebar 
                                contract={contract}
                                clauses={clauses}
                                activeTab={useAppStore.getState().activeTab}
                                onTabChange={useAppStore.getState().setActiveTab}
                                sortMode={useAppStore.getState().sortMode}
                                onSortModeChange={useAppStore.getState().setSortMode}
                                isSaving={isSaving}
                                saveStatus={useAppStore.getState().saveStatus}
                                handleSave={() => persistCurrentProject()}
                            />
                        )}
                        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 relative">
                            {renderContent()}
                        </main>
                    </div>
                    <Toaster position="bottom-right" />
                </div>
            </AppRouter>
        </AppWrapper>
    );
};

export default App;
