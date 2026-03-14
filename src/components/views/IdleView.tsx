import React from 'react';
import toast from 'react-hot-toast';
import {
  AnalysisStatus,
  FileData,
  DualSourceInput,
} from '@/types';
import { useAppStore } from '@/store/useAppStore';
import {
  preprocessText,
  detectCorruptedLines,
  cleanTextWithAI,
} from '@/services/textPreprocessor';

interface IdleViewProps {
  isAdmin: () => boolean;
  clearDraft: () => void;
  restoreDraft: () => void;
  importBackupRef: React.RefObject<HTMLInputElement>;
  generalFileRef: React.RefObject<HTMLInputElement>;
  particularFileRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  processFile: (file: File, callback: (data: FileData) => void) => void;
  handlePdfAnalysis: (input: FileData | DualSourceInput) => void;
  handleTextAnalysis: (general: string, particular: string) => void;
}

export const IdleView: React.FC<IdleViewProps> = ({
  isAdmin,
  clearDraft,
  restoreDraft,
  importBackupRef,
  generalFileRef,
  particularFileRef,
  fileInputRef,
  processFile,
  handlePdfAnalysis,
  handleTextAnalysis,
}) => {
  const {
    hasDraft,
    inputMode,
    setInputMode,
    generalFile,
    setGeneralFile,
    particularFile,
    setParticularFile,
    setPdfEditText,
    setExtractedPdfPages,
    setCleanedPdfPages,
    setStatus,
    pastedGeneralText,
    setPastedGeneralText,
    pastedParticularText,
    setPastedParticularText,
    skipTextCleaning,
    setSkipTextCleaning,
    textToFix,
    setTextToFix,
    fixedText,
    setFixedText,
    showCorruptionReview,
    setShowCorruptionReview,
    linesToRemove,
    setLinesToRemove,
    setCurrentCorruptionIndex,
    useAICleaning,
    setUseAICleaning,
    setAiCleanedText,
    isAICleaning,
    setIsAICleaning,
    progress,
    setProgress,
    liveStatus,
    setLiveStatus,
    setError,
  } = useAppStore();

  const handleJsonImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        if (json.type === 'aaa_ocr_export') {
          setPdfEditText(json.text);
          setExtractedPdfPages(json.pages || []);
          setCleanedPdfPages(null);
          setStatus(AnalysisStatus.PDF_PREVIEW);
          toast.success('OCR data imported from JSON');
        } else {
          toast.error('Invalid OCR JSON file');
        }
      } catch (err) {
        toast.error('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleFixText = async () => {
    if (!textToFix.trim()) return;

    if (useAICleaning) {
      setIsAICleaning(true);
      setProgress(0);
      try {
        const cleaned = await cleanTextWithAI(
          textToFix,
          undefined,
          (current, total, currentLine, totalLines) => {
            const chunkProgress = Math.round((current / total) * 100);
            setProgress(chunkProgress);

            if (currentLine !== undefined && totalLines !== undefined && currentLine > 0) {
              const lineProgress = Math.round((currentLine / totalLines) * 100);
              setLiveStatus({
                message: `Cleaning chunk ${current + 1} of ${total}...`,
                detail: `Processing line ${currentLine.toLocaleString()} of ${totalLines.toLocaleString()} (${lineProgress}%)`,
                isActive: true,
              });
            } else {
              setLiveStatus({
                message: total > 1 ? `Preparing chunk ${current + 1} of ${total}...` : 'Processing with AI...',
                detail: total > 1 ? 'Analyzing text structure' : 'Cleaning contract text',
                isActive: true,
              });
            }
          },
        );
        setAiCleanedText(cleaned);
        setFixedText({
          cleaned: cleaned,
          fixes: [],
          removedLines: 0,
          corruptedLines: [],
        });
        setShowCorruptionReview(false);
        setProgress(100);
        setLiveStatus({
          message: 'Complete!',
          detail: 'All clauses processed successfully',
          isActive: false,
        });
      } catch (error: any) {
        setError(error.message || 'AI cleaning failed');
        setLiveStatus({
          message: 'Error',
          detail: error.message || 'Unknown error',
          isActive: false,
        });
      } finally {
        setIsAICleaning(false);
      }
    } else {
      const corrupted = detectCorruptedLines(textToFix);
      if (corrupted.length > 0) {
        const result = preprocessText(textToFix, []);
        setFixedText({
          cleaned: result.cleaned,
          fixes: result.fixes,
          removedLines: 0,
          corruptedLines: result.corruptedLines,
        });
        setLinesToRemove(new Set());
        setCurrentCorruptionIndex(0);
        setShowCorruptionReview(true);
      } else {
        const result = preprocessText(textToFix, []);
        setFixedText({
          cleaned: result.cleaned,
          fixes: result.fixes,
          removedLines: 0,
          corruptedLines: [],
        });
        setShowCorruptionReview(false);
      }
    }
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-1000">
      {hasDraft && (
        <div className="max-w-4xl mx-auto -mb-8 animate-in slide-in-from-top duration-500">
          <div className="bg-aaa-blue/5 border border-aaa-blue/20 p-4 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-aaa-blue/10 rounded-xl flex items-center justify-center text-aaa-blue">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-black text-aaa-blue uppercase tracking-tight">Unsaved Progress Detected</h4>
                <p className="text-xs text-aaa-muted font-medium">You have a draft from a previous session that wasn't saved to the cloud.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={clearDraft} className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-aaa-muted hover:text-aaa-blue transition-colors">Discard</button>
              <button onClick={restoreDraft} className="px-7 py-2.5 bg-aaa-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-aaa-navy transition-all active:scale-95">Restore Draft</button>
            </div>
          </div>
        </div>
      )}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-3 px-5 py-2 bg-white border border-aaa-blue/10 text-aaa-blue text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Cloud Neural Engine Active
        </div>
        <h2 className="text-7xl font-black text-aaa-blue leading-[1.05] tracking-tighter">
          Verbatim <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-aaa-blue to-aaa-accent">Precision Extraction.</span>
        </h2>
        <p className="text-aaa-muted text-xl max-w-2xl mx-auto leading-relaxed font-medium">
          Direct text injection or multi-page PDF processing. Mapping temporal records and baseline conflicts in high-fidelity verbatim sequences.
        </p>
        <div className="flex justify-center pt-4">
          <button
            onClick={() => importBackupRef.current?.click()}
            className="flex items-center gap-3 px-8 py-3.5 bg-white border border-aaa-blue text-aaa-blue rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-aaa-bg transition-all shadow-sm active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Restore Backup
          </button>
        </div>
      </div>

      {isAdmin() && (
        <>
          <div className="flex flex-col items-center gap-8">
            <div className="flex bg-white border border-aaa-border p-1.5 rounded-2xl shadow-premium">
              <button onClick={() => setInputMode('dual')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all ${inputMode === 'dual' ? 'bg-aaa-blue text-white shadow-xl' : 'text-aaa-muted hover:text-aaa-blue'}`}>Dual Source PDF</button>
              <button onClick={() => setInputMode('single')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all ${inputMode === 'single' ? 'bg-aaa-blue text-white shadow-xl' : 'text-aaa-muted hover:text-aaa-blue'}`}>Single Document</button>
              <button onClick={() => setInputMode('text')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all ${inputMode === 'text' ? 'bg-aaa-blue text-white shadow-xl' : 'text-aaa-muted hover:text-aaa-blue'}`}>Text Injection</button>
              <button onClick={() => setInputMode('fixer')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all ${inputMode === 'fixer' ? 'bg-aaa-blue text-white shadow-xl' : 'text-aaa-muted hover:text-aaa-blue'}`}>Text Fixer</button>
            </div>
          </div>

          {inputMode === 'dual' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
              <div className="bg-white p-10 rounded-3xl border border-aaa-border shadow-premium border-t-4 border-t-aaa-blue">
                <h3 className="font-extrabold text-xl text-aaa-blue mb-8">General Baseline</h3>
                <div onClick={() => generalFileRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-14 flex flex-col items-center gap-4 cursor-pointer transition-all ${generalFile ? 'border-aaa-blue bg-aaa-bg/50' : 'border-aaa-border hover:border-aaa-blue bg-slate-50/30'}`}>
                  <p className="font-black text-sm uppercase tracking-widest">{generalFile ? generalFile.name : 'Select General PDF'}</p>
                  <input type="file" ref={generalFileRef} className="hidden" accept="application/pdf" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], setGeneralFile)} />
                </div>
              </div>
              <div className="bg-white p-10 rounded-3xl border border-aaa-border shadow-premium border-t-4 border-t-aaa-accent">
                <h3 className="font-extrabold text-xl text-aaa-accent mb-8">Particular Ledger</h3>
                <div onClick={() => particularFileRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-14 flex flex-col items-center gap-4 cursor-pointer transition-all ${particularFile ? 'border-aaa-accent bg-aaa-bg/50' : 'border-aaa-border hover:border-aaa-accent bg-slate-50/30'}`}>
                  <p className="font-black text-sm uppercase tracking-widest">{particularFile ? particularFile.name : 'Select Particular PDF'}</p>
                  <input type="file" ref={particularFileRef} className="hidden" accept="application/pdf" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], setParticularFile)} />
                </div>
              </div>
              <div className="md:col-span-2 text-center pt-8">
                <button onClick={() => generalFile && particularFile && handlePdfAnalysis({ general: generalFile, particular: particularFile })} disabled={!generalFile || !particularFile} className="px-20 py-6 bg-aaa-blue text-white rounded-2xl font-black shadow-2xl disabled:opacity-50 transition-all">START VERBATIM COMPARISON</button>
              </div>
            </div>
          )}

          {inputMode === 'single' && (
            <div onClick={() => fileInputRef.current?.click()} className="bg-white p-24 rounded-3xl border-2 border-dashed border-aaa-border flex flex-col items-center gap-8 hover:border-aaa-blue transition-all cursor-pointer shadow-premium max-w-4xl mx-auto w-full">
              <div className="w-32 h-32 bg-aaa-bg rounded-2xl flex items-center justify-center text-aaa-blue border border-aaa-blue/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <h3 className="text-4xl font-black text-aaa-text">Source Injection</h3>
              <p className="text-aaa-muted -mt-4 text-sm font-bold uppercase tracking-widest">Enhanced Page-by-Page Scan</p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  if (file.type === 'application/json' || file.name.endsWith('.json')) {
                    handleJsonImport(file);
                  } else {
                    processFile(file, handlePdfAnalysis);
                  }
                }}
              />
            </div>
          )}

          {inputMode === 'text' && (
            <div className="max-w-[1400px] mx-auto w-full space-y-12 animate-in slide-in-from-bottom-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-white p-8 rounded-3xl border border-aaa-border shadow-premium border-t-4 border-t-aaa-blue">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-extrabold text-xl text-aaa-blue">General Baseline</h3>
                    <span className="text-[10px] font-black text-aaa-muted uppercase tracking-widest">{pastedGeneralText.length} Characters</span>
                  </div>
                  <textarea
                    value={pastedGeneralText}
                    onChange={(e) => setPastedGeneralText(e.target.value)}
                    placeholder="Paste baseline clauses..."
                    className="w-full h-96 bg-aaa-bg/30 p-6 rounded-2xl font-mono text-[13px] leading-relaxed border border-aaa-border focus:border-aaa-blue outline-none custom-scrollbar"
                  />
                </div>
                <div className="bg-white p-8 rounded-3xl border border-aaa-border shadow-premium border-t-4 border-t-aaa-accent">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-extrabold text-xl text-aaa-accent">Particular Ledger</h3>
                    <span className="text-[10px] font-black text-aaa-muted uppercase tracking-widest">{pastedParticularText.length} Characters</span>
                  </div>
                  <textarea
                    value={pastedParticularText}
                    onChange={(e) => setPastedParticularText(e.target.value)}
                    placeholder="Paste project-specific modifications..."
                    className="w-full h-96 bg-aaa-bg/30 p-6 rounded-2xl font-mono text-[13px] leading-relaxed border border-aaa-border focus:border-aaa-accent outline-none custom-scrollbar"
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-aaa-border shadow-premium">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipTextCleaning}
                      onChange={(e) => setSkipTextCleaning(e.target.checked)}
                      className="w-4 h-4 text-aaa-blue border-aaa-border rounded focus:ring-aaa-blue"
                    />
                    <span className="text-sm font-semibold text-aaa-text">
                      Text is already clean (skip cleaning)
                    </span>
                  </label>
                </div>
                <button
                  onClick={() => (pastedGeneralText.trim() || pastedParticularText.trim()) && handleTextAnalysis(pastedGeneralText, pastedParticularText)}
                  disabled={!pastedGeneralText.trim() && !pastedParticularText.trim()}
                  className="px-24 py-6 bg-aaa-blue text-white rounded-2xl font-black shadow-2xl disabled:opacity-50 hover:bg-aaa-hover transition-all active:scale-95"
                >
                  RAPID SCAN (FAST)
                </button>
              </div>
            </div>
          )}

          {inputMode === 'fixer' && (
            <div className="max-w-6xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom-6">
              <div className="bg-white p-8 rounded-3xl border border-aaa-border shadow-premium border-t-4 border-t-aaa-accent">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-extrabold text-xl text-aaa-accent">Text Fixer</h3>
                  <span className="text-[10px] font-black text-aaa-muted uppercase tracking-widest">{textToFix.length} Characters</span>
                </div>
                <textarea
                  value={textToFix}
                  onChange={(e) => {
                    setTextToFix(e.target.value);
                    setFixedText(null);
                    setShowCorruptionReview(false);
                    setLinesToRemove(new Set());
                    setCurrentCorruptionIndex(0);
                  }}
                  placeholder="Paste your text here to fix errors, punctuation, and formatting issues..."
                  className="w-full h-64 bg-aaa-bg/30 p-6 rounded-2xl font-mono text-[13px] leading-relaxed border border-aaa-border focus:border-aaa-accent outline-none custom-scrollbar"
                />
                <div className="mt-4 flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAICleaning}
                      onChange={(e) => {
                        setUseAICleaning(e.target.checked);
                        setFixedText(null);
                        setAiCleanedText(null);
                      }}
                      className="w-4 h-4 text-aaa-accent border-aaa-border rounded focus:ring-aaa-accent"
                    />
                    <span className="text-sm font-semibold text-aaa-text">
                      Use AI-powered cleaning (fixes broken words, line breaks, headers/footers, cross-references)
                    </span>
                  </label>
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleFixText}
                    disabled={!textToFix.trim() || isAICleaning}
                    className="px-16 py-4 bg-aaa-accent text-white rounded-2xl font-black shadow-xl disabled:opacity-50 hover:bg-aaa-blue transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isAICleaning ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        AI Cleaning... {progress > 0 && `${progress}%`}
                      </>
                    ) : (
                      useAICleaning ? 'Clean with AI' : 'Fix Text'
                    )}
                  </button>
                </div>

                {isAICleaning && liveStatus.message && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 shadow-md">
                    <div className="flex items-center gap-3">
                      {liveStatus.isActive && (
                        <div className="relative">
                          <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse"></div>
                          <div className="absolute inset-0 w-3 h-3 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold text-cyan-700">{liveStatus.message}</p>
                        <p className="text-xs text-cyan-600 mt-0.5">{liveStatus.detail}</p>
                      </div>
                    </div>

                    {progress > 0 && (
                      <div className="mt-3 w-full h-2 bg-cyan-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {showCorruptionReview && fixedText?.corruptedLines && fixedText.corruptedLines.length > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 p-6 rounded-2xl shadow-lg">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-yellow-800 mb-1">Review Corrupted Lines</h4>
                      <p className="text-sm text-yellow-700">
                        Found {fixedText.corruptedLines.length} potentially corrupted line{fixedText.corruptedLines.length > 1 ? 's' : ''}. Select which ones to remove.
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between p-3 bg-yellow-100 rounded-lg">
                    <span className="text-sm font-semibold text-yellow-800">
                      {linesToRemove.size} of {fixedText.corruptedLines.length} selected for removal
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setLinesToRemove(new Set(fixedText.corruptedLines?.map(c => c.index) || []));
                        }}
                        className="text-xs font-semibold text-yellow-700 hover:text-yellow-800 px-3 py-1 bg-white rounded hover:bg-yellow-50 transition-all"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => {
                          setLinesToRemove(new Set());
                        }}
                        className="text-xs font-semibold text-yellow-700 hover:text-yellow-800 px-3 py-1 bg-white rounded hover:bg-yellow-50 transition-all"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar mb-6">
                    {fixedText.corruptedLines.map((corrupted, idx) => (
                      <div
                        key={idx}
                        className={`bg-white p-4 rounded-xl border-2 transition-all ${linesToRemove.has(corrupted.index)
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-yellow-200 hover:border-yellow-300'
                          }`}
                      >
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={linesToRemove.has(corrupted.index)}
                            onChange={(e) => {
                              const newSet = new Set(linesToRemove);
                              if (e.target.checked) {
                                newSet.add(corrupted.index);
                              } else {
                                newSet.delete(corrupted.index);
                              }
                              setLinesToRemove(newSet);
                            }}
                            className="mt-1 w-5 h-5 text-yellow-600 border-yellow-300 rounded focus:ring-yellow-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">
                                Line {corrupted.index + 1}
                              </span>
                              <span className="text-xs text-yellow-600 font-medium">
                                {corrupted.reason}
                              </span>
                            </div>
                            <code className="block text-sm font-mono text-gray-800 break-words bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
                              {corrupted.line.trim() || '(empty line)'}
                            </code>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowCorruptionReview(false);
                        setLinesToRemove(new Set());
                        setFixedText(null);
                        setCurrentCorruptionIndex(0);
                      }}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const result = preprocessText(textToFix, Array.from(linesToRemove));
                        setFixedText({
                          cleaned: result.cleaned,
                          fixes: result.fixes,
                          removedLines: result.removedLines,
                          corruptedLines: [],
                        });
                        setShowCorruptionReview(false);
                        setCurrentCorruptionIndex(0);
                      }}
                      disabled={linesToRemove.size === 0}
                      className="px-6 py-2 bg-yellow-600 text-white rounded-xl text-sm font-bold hover:bg-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remove Selected ({linesToRemove.size})
                    </button>
                  </div>
                </div>
              )}

              {fixedText && !showCorruptionReview && (
                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-3xl border border-aaa-border shadow-premium border-t-4 border-t-green-500">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-extrabold text-xl text-green-600">Fixed Text</h3>
                      <button
                        onClick={(e) => {
                          navigator.clipboard.writeText(fixedText.cleaned);
                          const btn = e.currentTarget;
                          const originalText = btn.textContent;
                          btn.textContent = 'Copied!';
                          setTimeout(() => {
                            btn.textContent = originalText;
                          }, 2000);
                        }}
                        className="px-6 py-2 bg-green-500 text-white rounded-xl text-xs font-black hover:bg-green-600 transition-all flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Fixed Text
                      </button>
                    </div>
                    <textarea
                      value={fixedText.cleaned}
                      readOnly
                      className="w-full h-64 bg-green-50/50 p-6 rounded-2xl font-mono text-[13px] leading-relaxed border border-green-200 outline-none custom-scrollbar"
                    />
                    <p className="text-xs text-gray-500 mt-3">
                      ✓ Fixed {fixedText.fixes.length} issues{fixedText.removedLines > 0 ? ` and removed ${fixedText.removedLines} corrupted line${fixedText.removedLines > 1 ? 's' : ''}` : ''}. Copy the text above and paste it into the Text Injection tab to extract clauses.
                    </p>
                  </div>

                  {fixedText.fixes.length > 0 && (
                    <div className="bg-white p-6 rounded-3xl border border-aaa-border shadow-premium">
                      <h4 className="font-bold text-lg text-aaa-blue mb-4">Fixes Applied ({fixedText.fixes.length})</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {fixedText.fixes.map((fix, idx) => (
                          <div key={idx} className="text-xs p-3 bg-aaa-bg/50 rounded-lg border border-aaa-border">
                            <span className="font-mono text-red-600 line-through mr-2">{fix.original}</span>
                            <span className="text-gray-400">→</span>
                            <span className="font-mono text-green-600 ml-2">{fix.fixed}</span>
                            <span className="text-gray-500 ml-2 text-[10px]">({fix.reason})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
