import React from 'react';
import { OrganizerFolderLayout } from '@/types';

interface OrganizerSidebarProps {
    activeFolder: string;
    setActiveFolder: (code: string) => void;
    activeLayout: OrganizerFolderLayout[];
    fixedFolders: Array<{ code: string; name: string }>;
    isContractActive: boolean;
    onStartEditing: () => void;
    onSetIngestionMode: (mode: 'extraction' | 'pdf-viewer' | 'claude-native' | 'paddle-ocr') => void;
    setSelectedSubfolderId: (id: string | null) => void;
}

export const OrganizerSidebar: React.FC<OrganizerSidebarProps> = ({
    activeFolder,
    setActiveFolder,
    activeLayout,
    fixedFolders,
    isContractActive,
    onStartEditing,
    onSetIngestionMode,
    setSelectedSubfolderId
}) => {
    return (
        <div className="w-80 border-r border-aaa-border flex flex-col bg-aaa-bg/10 overflow-y-auto custom-scrollbar">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-aaa-muted uppercase tracking-[0.2em]">Contract Modules</h3>
                    {isContractActive && (
                        <button 
                            onClick={onStartEditing}
                            className="p-1.5 hover:bg-aaa-blue/10 text-aaa-muted hover:text-aaa-blue rounded-lg transition-all flex items-center gap-1.5"
                            title="Edit Sidebar Layout"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            <span className="text-[9px] font-black uppercase">Edit</span>
                        </button>
                    )}
                </div>
                <div className="space-y-1">
                    {activeLayout.filter(f => f.isVisible).map(item => {
                        const folder = fixedFolders.find(f => f.code === item.code);
                        if (!folder) return null;
                        return (
                            <button
                                key={folder.code}
                                onClick={() => {
                                    setActiveFolder(folder.code);
                                    setSelectedSubfolderId(null);
                                    // Auto-switch mode for convenience
                                    if (folder.code === 'E' || folder.code === 'I') {
                                        onSetIngestionMode('pdf-viewer');
                                    } else {
                                        onSetIngestionMode('extraction');
                                    }
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
                                    <p className="text-[11px] font-black truncate text-left leading-none mb-1 uppercase tracking-tighter">{(item.customName || folder.name).split(' ')[0]}</p>
                                    <p className="text-[9px] font-bold text-aaa-muted truncate text-left">{item.customName || folder.name}</p>
                                </div>
                                {folder.code === 'AI' && (
                                    <div className="w-2 h-2 bg-aaa-blue rounded-full animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
