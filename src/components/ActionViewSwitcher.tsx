
import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AnalysisStatus } from '@/types';

import { motion, AnimatePresence } from 'framer-motion';
import { scrollToClauseByNumber } from '@/hooks/useContractLedgerData';

// Lazy load view components
const AIChatView = React.lazy(() => import('./views/AIChatView').then(m => ({ default: m.AIChatView })));
const ContractHubView = React.lazy(() => import('./views/ContractHubView').then(m => ({ default: m.ContractHubView })));
const OrganizerView = React.lazy(() => import('./views/OrganizerView').then(m => ({ default: m.OrganizerView })));
const CompletedView = React.lazy(() => import('./views/CompletedView').then(m => ({ default: m.CompletedView })));

const ViewLoading = () => (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="w-12 h-12 border-4 border-aaa-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Initializing Intelligence Layer...</p>
    </div>
);

export const ActionViewSwitcher: React.FC = () => {
    const { 
        activeView, 
        status,
        editClause,
        deleteClause,
        reorderClauses,
        setSelectedClauseForBot,
        setActiveView
    } = useAppStore();

    const renderContent = () => {
        // If we are in ORGANIZER status, show the organizer regardless of the activeView tab
        if (status === AnalysisStatus.ORGANIZER) {
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full w-full"
                >
                    <OrganizerView />
                </motion.div>
            );
        }

        // If we are in COMPLETED status, show the detailed analysis
        if (status === AnalysisStatus.COMPLETED) {
            return (
                <div className="h-full w-full overflow-y-auto">
                    <CompletedView 
                        persistCurrentProject={async () => {
                            console.log('Persisting project logic needed');
                        }} 
                        onOpenClause={(clauseNumber) => {
                            scrollToClauseByNumber(clauseNumber);
                        }} 
                        handleEditClause={(clause) => {
                            editClause(clause);
                        }} 
                        handleDeleteClause={async (index) => {
                            deleteClause(index);
                        }} 
                        handleReorder={async (from, to) => {
                            reorderClauses(from, to);
                        }} 
                        handleAskAI={(item) => {
                            setSelectedClauseForBot(item);
                            setActiveView('chat');
                        }} 
                    />
                </div>
            );
        }

        return (
            <div className="h-full w-full overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeView === 'chat' ? (
                        <motion.div
                            key="chat-view"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="h-full w-full"
                        >
                            <AIChatView />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="hub-view"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="h-full w-full overflow-y-auto"
                        >
                            <ContractHubView />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <React.Suspense fallback={<ViewLoading />}>
            {renderContent()}
        </React.Suspense>
    );
};
