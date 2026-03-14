import React from 'react';
import {
  AnalysisStatus,
  SectionType,
} from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface PdfPreviewViewProps {
  handleAICleanPdf: () => Promise<void>;
  handleDownloadOcrJson: () => void;
  handleAddPdfToContract: () => Promise<void>;
}

export const PdfPreviewView: React.FC<PdfPreviewViewProps> = ({
  handleAICleanPdf,
  handleDownloadOcrJson,
  handleAddPdfToContract,
}) => {
  const {
    extractedPdfPages,
    setExtractedPdfPages,
    cleanedPdfPages,
    setCleanedPdfPages,
    isCleaningPdf,
    pdfTargetSection,
    setPdfTargetSection,
    pdfEditText,
    setPdfEditText,
    setStatus,
    activeContractId,
    setActiveContractId,
    library,
    setContract,
    setClauses,
  } = useAppStore();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white border border-aaa-border rounded-3xl p-8 shadow-premium">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-aaa-navy tracking-tight">PDF Text Preview</h2>
            <p className="text-sm text-aaa-muted mt-1">
              {extractedPdfPages.length} page(s) extracted • Review and edit the text below
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setStatus(AnalysisStatus.IDLE);
                setExtractedPdfPages([]);
                setCleanedPdfPages(null);
                setPdfEditText('');
              }}
              className="px-5 py-2.5 bg-white border border-aaa-border text-aaa-muted rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={handleAICleanPdf}
              disabled={isCleaningPdf}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isCleaningPdf
                ? 'bg-purple-200 text-purple-400 cursor-not-allowed'
                : cleanedPdfPages
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-lg hover:shadow-xl'
                }`}
            >
              {isCleaningPdf ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cleaning...
                </>
              ) : cleanedPdfPages ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Cleaned ✓
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Fix with AI
                </>
              )}
            </button>
            <button
              onClick={handleDownloadOcrJson}
              className="px-5 py-2.5 bg-white border border-aaa-border text-aaa-navy rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
              title="Download OCR text as JSON"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              JSON
            </button>
          </div>
        </div>

        {/* Editable text area */}
        <textarea
          value={pdfEditText}
          onChange={(e) => setPdfEditText(e.target.value)}
          className="w-full h-[50vh] px-5 py-4 bg-slate-50 border border-aaa-border rounded-2xl text-sm font-mono text-aaa-navy leading-relaxed focus:border-aaa-blue focus:ring-2 focus:ring-aaa-blue/20 outline-none transition-all resize-none custom-scrollbar"
          placeholder="Extracted text will appear here..."
        />
      </div>

      {/* Add to Contract panel */}
      <div className="bg-white border border-aaa-border rounded-3xl p-8 shadow-premium">
        <h3 className="text-lg font-black text-aaa-navy mb-4">Add to Contract</h3>
        <div className="flex items-end gap-4 flex-wrap">
          {/* Contract selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-aaa-muted uppercase tracking-wider mb-2">Contract</label>
            <select
              value={activeContractId || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                setActiveContractId(selectedId);
                const selectedContract = library.find(c => c.id === selectedId);
                if (selectedContract) {
                  setContract(selectedContract);
                  setClauses([]);
                }
              }}
              className="w-full px-4 py-3 bg-white border border-aaa-border rounded-xl text-sm font-semibold text-aaa-navy focus:border-aaa-blue focus:ring-2 focus:ring-aaa-blue/20 outline-none transition-all"
            >
              <option value="">Select a contract...</option>
              {library.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.metadata.totalClauses} clauses)</option>
              ))}
            </select>
          </div>

          {/* Section selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-aaa-muted uppercase tracking-wider mb-2">Category / Section</label>
            <select
              value={pdfTargetSection}
              onChange={(e) => setPdfTargetSection(e.target.value as SectionType)}
              className="w-full px-4 py-3 bg-white border border-aaa-border rounded-xl text-sm font-semibold text-aaa-navy focus:border-aaa-blue focus:ring-2 focus:ring-aaa-blue/20 outline-none transition-all"
            >
              <option value={SectionType.AGREEMENT}>A - Form of Agreement</option>
              <option value={SectionType.LOA}>B - Letter of Acceptance</option>
              <option value={SectionType.TENDER}>T - Letter of Tender</option>
              <option value={SectionType.PARTICULAR}>C - Particular Conditions</option>
              <option value={SectionType.GENERAL}>C - General Conditions</option>
              <option value={SectionType.REQUIREMENTS}>E - Employer's Requirements</option>
              <option value={SectionType.SPECIFICATION}>S - Specification</option>
              <option value={SectionType.PROPOSAL}>P - Contractor's Proposal</option>
              <option value={SectionType.DRAWINGS}>D - Drawings</option>
              <option value={SectionType.BOQ}>I - Bills of Quantities</option>
              <option value={SectionType.SCHEDULE}>J - Schedules</option>
              <option value={SectionType.ANNEX}>K - Annexes</option>
              <option value={SectionType.ADDENDUM}>L - Addendums</option>
              <option value={SectionType.INSTRUCTION}>M - Instruction to Tenderers</option>
              <option value={SectionType.AUTOMATION}>N - Automation Application</option>
              <option value={SectionType.EXTRAS}>O - Extras/Other</option>
            </select>
          </div>

          {/* Add button */}
          <button
            onClick={handleAddPdfToContract}
            disabled={!activeContractId}
            className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${activeContractId
              ? 'bg-aaa-blue text-white hover:bg-aaa-blue/90 shadow-lg hover:shadow-xl active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            Add to Contract
          </button>
        </div>
        {!activeContractId && (
          <p className="mt-3 text-xs text-amber-600 font-medium">⚠ Select a contract from the dropdown above, or go to Archive to load one</p>
        )}
      </div>
    </div>
  );
};
