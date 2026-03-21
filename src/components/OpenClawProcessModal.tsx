import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { openClawService } from '@/services/openClawService';
import { extractTextFromPdf } from '@/utils/pdfUtils';
import type { SavedContract } from '@/types';

function getFullTextFromContract(c: SavedContract): string {
  const parts: string[] = [];
  if (c.sections?.length) {
    for (const section of c.sections) {
      parts.push(`\n## ${section.title}\n`);
      for (const item of section.items) {
        const heading = item.heading || item.clause_title || item.clause_number || '';
        const body = item.text || item.clause_text || item.general_condition || item.particular_condition || '';
        if (heading) parts.push(`${heading}\n`);
        if (body) parts.push(`${body}\n`);
      }
    }
  }
  if (c.clauses?.length) {
    for (const clause of c.clauses) {
      parts.push(`\n${clause.clause_number} ${clause.clause_title || ''}\n${clause.clause_text || ''}\n`);
    }
  }
  return parts.join('\n').trim() || '';
}

interface OpenClawProcessModalProps {
  onClose: () => void;
}

export const OpenClawProcessModal: React.FC<OpenClawProcessModalProps> = ({ onClose }) => {
  const { library } = useAppStore();
  const [source, setSource] = useState<'contract' | 'text'>('contract');
  const [selectedContractId, setSelectedContractId] = useState<string>(library[0]?.id ?? '');
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedContract = library.find(c => c.id === selectedContractId);
  const fullTextFromContract = selectedContract ? getFullTextFromContract(selectedContract) : '';
  const effectiveText = source === 'contract' ? fullTextFromContract : pastedText;
  const canRun = effectiveText.trim().length > 0;

  const handleRun = async () => {
    if (!canRun || isProcessing) return;
    setIsProcessing(true);
    setResult(null);
    try {
      const analysis = await openClawService.processFullContract(effectiveText);
      setResult(analysis);
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Processing failed'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setIsExtractingPdf(true);
      try {
        const url = URL.createObjectURL(file);
        try {
          const text = await extractTextFromPdf(url, {
            onProgress: () => {} // optional: could show progress in UI
          });
          setPastedText(text);
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        setPastedText(`[PDF extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}]`);
      } finally {
        setIsExtractingPdf(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPastedText((reader.result as string) || '');
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-aaa-border">
          <h2 className="text-lg font-black text-aaa-navy">Process whole contract with OpenClaw</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-aaa-muted"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="source"
                checked={source === 'contract'}
                onChange={() => setSource('contract')}
                className="text-aaa-blue focus:ring-aaa-blue"
              />
              <span className="text-sm font-semibold text-aaa-navy">From archive</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="source"
                checked={source === 'text'}
                onChange={() => setSource('text')}
                className="text-aaa-blue focus:ring-aaa-blue"
              />
              <span className="text-sm font-semibold text-aaa-navy">Paste or load .txt / .pdf</span>
            </label>
          </div>

          {source === 'contract' && (
            <div>
              <label className="block text-xs font-bold text-aaa-muted uppercase tracking-wider mb-2">Contract</label>
              <select
                value={selectedContractId}
                onChange={e => setSelectedContractId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-aaa-border rounded-xl text-sm font-semibold text-aaa-navy focus:border-aaa-blue focus:ring-2 focus:ring-aaa-blue/20 outline-none"
              >
                {library.length === 0 ? (
                  <option value="">No contracts in archive</option>
                ) : (
                  library.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title || c.name} ({c.metadata?.totalClauses ?? 0} clauses)
                    </option>
                  ))
                )}
              </select>
              {selectedContract && (
                <p className="mt-2 text-xs text-aaa-muted">
                  {fullTextFromContract.length.toLocaleString()} characters will be sent to OpenClaw.
                </p>
              )}
            </div>
          )}

          {source === 'text' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-aaa-muted uppercase tracking-wider">Contract text</label>
                <button
                  type="button"
                  onClick={() => !isExtractingPdf && fileInputRef.current?.click()}
                  disabled={isExtractingPdf}
                  className="text-xs font-bold text-aaa-blue hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExtractingPdf ? 'Extracting PDF...' : 'Load .txt or .pdf'}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain,.pdf,application/pdf"
                className="hidden"
                onChange={handleLoadFile}
              />
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Paste contract text or load a .txt / .pdf file..."
                className="w-full h-40 px-4 py-3 bg-slate-50 border border-aaa-border rounded-xl text-sm font-mono text-aaa-navy placeholder:text-aaa-muted focus:border-aaa-blue focus:ring-2 focus:ring-aaa-blue/20 outline-none resize-y"
              />
              {pastedText.length > 0 && (
                <p className="mt-1 text-xs text-aaa-muted">{pastedText.length.toLocaleString()} characters</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleRun}
              disabled={!canRun || isProcessing}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                canRun && !isProcessing
                  ? 'bg-aaa-navy text-white hover:bg-aaa-navy/90 shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  OpenClaw analyzing...
                </span>
              ) : (
                'Run OpenClaw analysis'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl text-sm font-bold border border-aaa-border text-aaa-muted hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          {result !== null && (
            <div className="mt-4 pt-4 border-t border-aaa-border">
              <h3 className="text-sm font-black text-aaa-navy mb-2">Analysis result</h3>
              <div className="max-h-80 overflow-auto rounded-xl bg-slate-50 border border-aaa-border p-4">
                <pre className="whitespace-pre-wrap text-sm text-aaa-navy font-sans leading-relaxed">{result}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
