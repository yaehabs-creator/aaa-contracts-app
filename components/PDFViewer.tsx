import React from 'react';

interface PDFViewerProps {
    url: string;
    title?: string;
    onClose?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ url, title, onClose }) => {
    return (
        <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden rounded-3xl border border-slate-700 shadow-2xl relative animate-in fade-in zoom-in-95 duration-500">
            {/* Control Bar */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 backdrop-blur-md border-b border-slate-700 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-aaa-blue rounded-xl flex items-center justify-center text-white shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-black text-sm tracking-tight uppercase leading-none mb-1">
                            {title || 'Document Viewer'}
                        </h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            Premium Integrated Viewer
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Full Screen
                    </a>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l18 18" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Tooltips/Info overlay (Subtle) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl z-20 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                Interactive Document Exploration Mode
            </div>

            {/* PDF Content */}
            <div className="flex-1 bg-slate-900 p-0 overflow-hidden relative">
                <iframe
                    src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
                    className="w-full h-full border-none rounded-b-3xl"
                    title={title || 'PDF Viewer'}
                />
            </div>
        </div>
    );
};
