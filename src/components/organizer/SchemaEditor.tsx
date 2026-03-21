import React from 'react';
import { ContractSubfolder, FolderSchemaField } from '@/types';

interface SchemaEditorProps {
    selectedSubfolder: ContractSubfolder;
    schemas: Record<string, FolderSchemaField[]>;
    onAddField: (subfolderId: string) => void;
    onUpdateField: (subfolderId: string, fieldId: string, updates: Partial<FolderSchemaField>) => void;
    onRemoveField: (subfolderId: string, fieldId: string) => void;
}

export const SchemaEditor: React.FC<SchemaEditorProps> = ({
    selectedSubfolder,
    schemas,
    onAddField,
    onUpdateField,
    onRemoveField
}) => {
    const fields = schemas[selectedSubfolder.id] || [];

    return (
        <div className="bg-white rounded-3xl border border-aaa-blue/20 shadow-premium overflow-hidden border-t-8 border-t-aaa-blue">
            <div className="p-8 border-b border-aaa-border flex items-center justify-between bg-aaa-blue/[0.02]">
                <div>
                    <h4 className="text-xl font-black text-aaa-text tracking-tighter">
                        Extraction Schema
                    </h4>
                    <p className="text-[10px] font-black text-aaa-muted uppercase tracking-widest mt-1">Fields for {selectedSubfolder.name}</p>
                </div>
                <button
                    onClick={() => onAddField(selectedSubfolder.id)}
                    className="px-6 py-2.5 bg-aaa-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-aaa-navy transition-all active:scale-95 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    Add Field
                </button>
            </div>

            <div className="p-8 max-h-[600px] overflow-y-auto thin-scrollbar">
                {fields.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-xs font-bold text-aaa-muted">No fields defined yet.</p>
                    </div>
                ) : (
                    fields.map(field => (
                        <div key={field.id} className="bg-aaa-bg/10 p-5 rounded-2xl border border-aaa-border/30 space-y-4 mb-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-aaa-muted uppercase tracking-widest">Label</label>
                                            <input
                                                type="text"
                                                value={field.label}
                                                onChange={(e) => onUpdateField(selectedSubfolder.id, field.id, { label: e.target.value })}
                                                className="w-full bg-white border border-aaa-border rounded-lg px-3 py-2 text-xs font-bold focus:border-aaa-blue outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-aaa-muted uppercase tracking-widest">Key</label>
                                            <input
                                                type="text"
                                                value={field.key}
                                                onChange={(e) => onUpdateField(selectedSubfolder.id, field.id, { key: e.target.value })}
                                                className="w-full bg-white border border-aaa-border rounded-lg px-3 py-2 text-xs font-mono focus:border-aaa-blue outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveField(selectedSubfolder.id, field.id)}
                                    className="ml-4 p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
