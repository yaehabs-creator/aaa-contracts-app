import React from 'react';

interface ContractCreationFormProps {
    show: boolean;
    newContractTitle: string;
    setNewContractTitle: (title: string) => void;
    newContractor: string;
    setNewContractor: (contractor: string) => void;
    onCreate: () => void;
    onClose: () => void;
}

export const ContractCreationForm: React.FC<ContractCreationFormProps> = ({
    show,
    newContractTitle,
    setNewContractTitle,
    newContractor,
    setNewContractor,
    onCreate,
    onClose
}) => {
    if (!show) return null;

    return (
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
                        onClick={onCreate}
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
    );
};
