import React, { useState, useRef } from 'react';
import { useOrganizerLayout } from '@/hooks/useOrganizerLayout';
import { FIXED_FOLDERS } from '@/utils/layoutUtils';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export const OrganizerLayoutEditor: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { 
        activeLayout, 
        toggleFolder, 
        reorderFolders, 
        confirmLayout, 
        cancelEditing, 
        isSaving,
        isDirty,
        contract
    } = useOrganizerLayout();

    const [dragIndex, setDragIndex] = useState<number | null>(null);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-y-0 right-0 w-[420px] bg-white shadow-2xl border-l border-aaa-border z-[150] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-aaa-border flex items-center justify-between bg-aaa-bg/30">
                <div>
                    <h3 className="text-xl font-black text-aaa-text tracking-tighter uppercase">Edit Sidebar Layout</h3>
                    <p className="text-[10px] font-black text-aaa-muted uppercase tracking-widest mt-1">Order and visibility</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => { cancelEditing(); onClose(); }}
                        className="p-2 hover:bg-aaa-bg rounded-xl transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-aaa-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            <div 
                className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar"
            >
                <AnimatePresence mode="popLayout">
                    {activeLayout.map((item, index) => {
                        const folderInfo = FIXED_FOLDERS.find(f => f.code === item.code);
                        const isBeingDragged = dragIndex === index;

                        return (
                            <motion.div 
                                key={item.code}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 1 }}
                                className={`
                                    group bg-white border rounded-xl p-4 flex items-center gap-4 transition-shadow select-none
                                    ${isBeingDragged ? 'z-50 shadow-2xl border-aaa-blue bg-aaa-blue/5 ring-4 ring-aaa-blue/5' : 'border-aaa-border shadow-sm'}
                                    hover:border-aaa-blue/30 hover:shadow-md
                                `}
                            >
                                <div 
                                    className={`
                                        cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-all
                                        ${isBeingDragged ? 'bg-aaa-blue text-white' : 'text-aaa-muted hover:bg-aaa-blue/10 hover:text-aaa-blue'}
                                    `}
                                    draggable
                                    onDragStart={(e) => {
                                        setDragIndex(index);
                                        e.dataTransfer.setData('text/plain', index.toString());
                                    }}
                                    onDragEnd={() => setDragIndex(null)}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                        if (!isNaN(fromIndex) && fromIndex !== index) {
                                            reorderFolders(fromIndex, index);
                                            e.dataTransfer.setData('text/plain', index.toString());
                                        }
                                    }}
                                    // Use pointer events for our existing reorder logic if we prefer
                                    onPointerDown={(e) => {
                                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                                        setDragIndex(index);
                                    }}
                                    onPointerUp={(e) => {
                                        setDragIndex(null);
                                    }}
                                    onPointerMove={(e) => {
                                        if (dragIndex === null) return;
                                        const element = document.elementFromPoint(e.clientX, e.clientY);
                                        const itemElement = element?.closest('[data-index]');
                                        if (itemElement) {
                                            const hoveredIndex = parseInt(itemElement.getAttribute('data-index') || '-1');
                                            if (hoveredIndex !== -1 && hoveredIndex !== dragIndex) {
                                                reorderFolders(dragIndex, hoveredIndex);
                                                setDragIndex(hoveredIndex);
                                            }
                                        }
                                    }}
                                    data-index={index}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h16M4 16h16" /></svg>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 flex items-center justify-center rounded-md bg-aaa-bg text-[10px] font-black border border-aaa-border">{item.code}</span>
                                        <p className="text-[11px] font-black truncate uppercase tracking-tight">{folderInfo?.name.split(' ')[0]}</p>
                                    </div>
                                    <p className="text-[9px] font-bold text-aaa-muted truncate mt-0.5">{folderInfo?.name}</p>
                                </div>

                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={item.isVisible} 
                                        onChange={() => toggleFolder(item.code)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-aaa-blue"></div>
                                </label>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <div className="p-6 border-t border-aaa-border bg-aaa-bg/30 space-y-3">
                <button 
                    onClick={async () => {
                        if (isSaving) return; // Basic debounce/guard
                        await confirmLayout();
                        onClose();
                    }}
                    disabled={!isDirty || isSaving}
                    className={`
                        w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3
                        ${!isDirty || isSaving ? 'bg-slate-100 text-aaa-muted' : 'bg-aaa-blue text-white shadow-lg shadow-aaa-blue/20 hover:bg-aaa-navy active:scale-95'}
                    `}
                >
                    {isSaving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {isSaving ? 'Processing...' : 'Confirm Layout'}
                </button>
                <button 
                    onClick={() => { cancelEditing(); onClose(); }}
                    className="w-full py-3 text-[10px] font-black text-aaa-muted uppercase tracking-widest hover:text-aaa-blue transition-all"
                >
                    Discard Changes
                </button>
            </div>
        </div>
    );
};
