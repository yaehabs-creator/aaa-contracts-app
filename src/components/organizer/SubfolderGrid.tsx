import React from 'react';
import { ContractSubfolder } from '@/types';

interface SubfolderGridProps {
    activeFolder: string;
    activeSubfolders: ContractSubfolder[];
    selectedSubfolderId: string | null;
    setSelectedSubfolderId: (id: string | null) => void;
    onAddSubfolder: () => void;
    onUpdateSubfolder: (id: string, name: string) => void;
    onRemoveSubfolder: (id: string) => void;
}

export const SubfolderGrid: React.FC<SubfolderGridProps> = ({
    activeFolder,
    activeSubfolders,
    selectedSubfolderId,
    setSelectedSubfolderId,
    onAddSubfolder,
    onUpdateSubfolder,
    onRemoveSubfolder
}) => {
    return (
        <section>
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-aaa-border/50">
                <div>
                    <h3 className="text-3xl font-black text-aaa-text tracking-tighter">
                        Subfolders: Module {activeFolder}
                    </h3>
                    <p className="text-xs text-aaa-muted font-medium mt-1">Classify documents for mapping and extraction.</p>
                </div>
                <button
                    onClick={onAddSubfolder}
                    className="flex items-center gap-3 px-6 py-3 bg-aaa-bg text-aaa-blue rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-aaa-blue/10 transition-all border border-aaa-blue/10 active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    Add Subfolder
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSubfolders.length === 0 ? (
                    <div className="col-span-full bg-aaa-bg/10 rounded-3xl p-16 border border-dashed border-aaa-border flex flex-col items-center gap-6 group hover:bg-aaa-bg/20 transition-all cursor-pointer" onClick={onAddSubfolder}>
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
                                    onChange={(e) => onUpdateSubfolder(sub.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-transparent font-black text-sm text-aaa-text focus:outline-none focus:text-aaa-blue flex-1"
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveSubfolder(sub.id);
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
    );
};
