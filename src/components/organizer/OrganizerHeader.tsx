import React from 'react';
import { SavedContract } from '@/types';

interface OrganizerHeaderProps {
    effectiveContract: SavedContract | null;
    hasUnsavedChanges: boolean;
    ocrAvailable: boolean | null;
    syncStatus: string | null;
    isSaving: boolean;
    isProcessing: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const OrganizerHeader: React.FC<OrganizerHeaderProps> = ({
    effectiveContract,
    hasUnsavedChanges,
    ocrAvailable,
    syncStatus,
    isSaving,
    isProcessing,
    onClose,
    onSave
}) => {
    return (
        <div className="flex items-center justify-between px-8 py-6 border-b border-aaa-border bg-aaa-bg/30">
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black text-aaa-blue tracking-tighter">Contract Organizer</h2>
                    <div className="px-3 py-1 bg-aaa-blue/10 text-aaa-blue text-[9px] font-black rounded-full uppercase tracking-widest border border-aaa-blue/20">
                        {effectiveContract?.title || 'No Contract'}
                    </div>
                    {hasUnsavedChanges && (
                        <div className="px-3 py-1 bg-amber-500/10 text-amber-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-amber-500/20 animate-pulse">
                            Unsaved Changes
                        </div>
                    )}
                    {ocrAvailable !== null && (
                        <div className={`px-3 py-1 ${ocrAvailable ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'} text-[9px] font-black rounded-full uppercase tracking-widest border`}>
                            OCR: {ocrAvailable ? 'Connected' : 'Disconnected (Local:8000)'}
                        </div>
                    )}
                    {syncStatus && (
                        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-widest border border-emerald-500/20 animate-pulse flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                            {syncStatus}
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
                    onClick={onSave}
                    disabled={isSaving || isProcessing}
                    className="px-8 py-3 bg-aaa-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-aaa-navy transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {isSaving ? 'Saving...' : 'SAVE ALL CHANGES'}
                </button>
            </div>
        </div>
    );
};
