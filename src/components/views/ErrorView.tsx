import React from 'react';
import { AnalysisStatus } from '@/types';
import { useAppStore } from '@/store/useAppStore';

export const ErrorView: React.FC = () => {
  const {
    error,
    setStatus,
    setClauses,
    setActiveContractId,
    setLiveStatus,
  } = useAppStore();

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center space-y-8 animate-in fade-in">
      <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center border border-red-100 shadow-xl">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h3 className="text-3xl font-black text-aaa-blue">Process Stalled</h3>
      <p className="text-aaa-muted max-w-md mx-auto">{error}</p>
      <div className="flex gap-4">
        <button
          onClick={() => {
            setStatus(AnalysisStatus.LIBRARY);
            setClauses([]);
            setActiveContractId(null);
            setLiveStatus({ message: '', detail: '', isActive: false });
          }}
          className="px-12 py-4 bg-aaa-blue text-white rounded-2xl font-black"
        >
          Back to Archive
        </button>
      </div>
    </div>
  );
};
