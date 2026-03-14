/**
 * useAnalysisPipeline.ts
 *
 * Custom hook that encapsulates ALL AI analysis logic:
 * - PDF page extraction via Web Worker (pdfWorker)
 * - AI-powered OCR text cleaning
 * - Text analysis (single batch + multi-chunk modes)
 * - Analysis finalisation (sort, linkify, save, category suggestions)
 * - PDF-to-contract append flow
 * - OCR JSON export
 *
 * Extracted from App.tsx to improve separation of concerns.
 */

import toast from 'react-hot-toast';
import { analyzeContract } from '@/services/claudeService';
import { callAIProxy } from '@/services/aiProxyClient';
import { suggestCategories } from '@/services/categorySuggestionService';
import { preprocessText, splitTextIntoChunks } from '@/services/textPreprocessor';
import { ensureContractHasSections } from '@/services/contractMigrationService';
import {
  Clause,
  AnalysisStatus,
  SavedContract,
  FileData,
  DualSourceInput,
  SectionType,
} from '@/types';
import { useAppStore } from '@/store/useAppStore';
import {
  CLAUDE_TOKEN_LIMITS,
  estimateTokens,
  linkifyText,
  reprocessClauseLinks,
  deduplicateClauses,
  compareClauseNumbers,
} from '@/utils/contractUtils';
import { normalizeClauseId } from '@/utils/navigation';

// Section title map used by handleAddPdfToContract
const SECTION_TITLES: Record<string, string> = {
  [SectionType.AGREEMENT]:    'Form of Agreement',
  [SectionType.LOA]:          'Letter of Acceptance',
  [SectionType.TENDER]:       'Letter of Tender',
  [SectionType.GENERAL]:      'General Conditions',
  [SectionType.PARTICULAR]:   'Particular Conditions',
  [SectionType.REQUIREMENTS]: "Employer's Requirements",
  [SectionType.SPECIFICATION]: 'Specification',
  [SectionType.PROPOSAL]:     "Contractor's Proposal",
  [SectionType.DRAWINGS]:     'Drawings',
  [SectionType.ADDENDUM]:     'Addendums',
  [SectionType.BOQ]:          'Bills of Quantities',
  [SectionType.SCHEDULE]:     'Schedules',
  [SectionType.ANNEX]:        'Annexes',
  [SectionType.AUTOMATION]:   'Automation Application',
  [SectionType.INSTRUCTION]:  'Instruction to Tenderers',
  [SectionType.EXTRAS]:       'Extras/Other Documents',
};

export function useAnalysisPipeline(persistCurrentProject: (
  clauses?: Clause[],
  name?: string,
  immediate?: boolean,
) => Promise<void>, performSaveContract: (contract: SavedContract, silent?: boolean) => Promise<SavedContract>) {
  const {
    setClauses,
    setContract,
    setStatus,
    setProgress,
    setError,
    setLiveStatus,
    setPreprocessingInfo,
    setBatchInfo,
    setProjectName,
    setActiveContractId,
    setCategorySuggestions,
    setShowCategorySuggestions,
    setExtractedPdfPages,
    setCleanedPdfPages,
    setIsCleaningPdf,
    setPdfEditText,
    clauses,
    contract,
    activeContractId,
    pdfEditText,
    pdfTargetSection,
    skipTextCleaning,
    progress,
  } = useAppStore();

  // ---------------------------------------------------------------------------
  // PDF EXTRACTION (Web Worker)
  // ---------------------------------------------------------------------------

  /**
   * Spawns a pdfWorker instance and extracts all text pages from a PDF file.
   * Progress messages are pushed directly into the Zustand store as they arrive.
   */
  const extractPagesFromPdf = (fileData: FileData): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('@/workers/pdfWorker.ts', import.meta.url),
        { type: 'module' },
      );

      worker.onmessage = (e) => {
        const { type, payload } = e.data;
        switch (type) {
          case 'PROGRESS':
            setLiveStatus({ message: payload.message, detail: payload.detail, isActive: true });
            if (payload.percent) setProgress(payload.percent);
            break;
          case 'EXTRACTION_COMPLETE':
            setLiveStatus({
              message: 'Extraction complete',
              detail: `Processed ${payload.pages.length} pages`,
              isActive: false,
            });
            setProgress(40);
            worker.terminate();
            resolve(payload.pages);
            break;
          case 'ERROR':
            worker.terminate();
            reject(new Error(payload.error));
            break;
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(new Error(err.message || 'Worker failed'));
      };

      worker.postMessage({ type: 'START_EXTRACTION', payload: { fileData } });
    });
  };

  // ---------------------------------------------------------------------------
  // TEXT ANALYSIS (dual-source or single text)
  // ---------------------------------------------------------------------------

  /**
   * Main analysis entry-point for text-based input (pasted or from PDF preview).
   * Handles preprocessing, token estimation, single-batch and chunked-batch calls.
   */
  const handleTextAnalysis = async (general: string, particular: string) => {
    setStatus(AnalysisStatus.ANALYZING);
    setError(null);
    setProgress(10);
    setPreprocessingInfo(null);
    setLiveStatus({ message: 'Initializing...', detail: 'Preparing text for analysis', isActive: true });

    try {
      let cleanedGeneral: string;
      let cleanedParticular: string;
      let allFixes: Array<{ original: string; fixed: string; reason: string }> = [];
      let totalEstimatedClauses = 0;

      if (skipTextCleaning) {
        setProgress(15);
        setLiveStatus({ message: 'Processing Text...', detail: 'Using clean text (skipping preprocessing)', isActive: true });
        cleanedGeneral   = general;
        cleanedParticular = particular;
        const generalEstimate   = Math.max(1, Math.floor(general.length / 500));
        const particularEstimate = Math.max(1, Math.floor(particular.length / 500));
        totalEstimatedClauses   = generalEstimate + particularEstimate;

        setPreprocessingInfo({
          generalFixes: 0,
          particularFixes: 0,
          estimatedClauses: totalEstimatedClauses,
          fixes: [],
          tokenInfo: {
            inputTokens:      estimateTokens(cleanedGeneral) + estimateTokens(cleanedParticular),
            outputTokenLimit:  CLAUDE_TOKEN_LIMITS.maxOutputTokens,
            totalTokenBudget:  CLAUDE_TOKEN_LIMITS.totalBudget,
            usagePercentage:   Math.min(100, Math.round(
              ((estimateTokens(cleanedGeneral) + estimateTokens(cleanedParticular)) / CLAUDE_TOKEN_LIMITS.totalBudget) * 100,
            )),
          },
        });
      } else {
        setProgress(10);
        setLiveStatus({ message: 'Cleaning Text...', detail: 'Fixing PDF extraction errors', isActive: true });
        await new Promise(r => setTimeout(r, 300));

        setProgress(15);
        setLiveStatus({ message: 'Processing Text...', detail: 'Analyzing General and Particular conditions', isActive: true });

        const preprocessedGeneral   = preprocessText(general);
        const preprocessedParticular = preprocessText(particular);

        cleanedGeneral   = preprocessedGeneral.cleaned;
        cleanedParticular = preprocessedParticular.cleaned;
        allFixes          = [...preprocessedGeneral.fixes, ...preprocessedParticular.fixes];
        totalEstimatedClauses = preprocessedGeneral.estimatedClauses + preprocessedParticular.estimatedClauses;

        setProgress(25);
        setLiveStatus({ message: 'Detecting Clauses...', detail: 'Identifying clause boundaries', isActive: true });

        const generalTokens   = estimateTokens(cleanedGeneral);
        const particularTokens = estimateTokens(cleanedParticular);
        const totalInputTokens = generalTokens + particularTokens;
        const usagePercentage  = Math.min(100, Math.round((totalInputTokens / CLAUDE_TOKEN_LIMITS.totalBudget) * 100));

        setPreprocessingInfo({
          generalFixes:    preprocessedGeneral.fixes.length,
          particularFixes: preprocessedParticular.fixes.length,
          estimatedClauses: totalEstimatedClauses,
          fixes: allFixes.slice(0, 10),
          tokenInfo: {
            inputTokens:     totalInputTokens,
            outputTokenLimit: CLAUDE_TOKEN_LIMITS.maxOutputTokens,
            totalTokenBudget: CLAUDE_TOKEN_LIMITS.totalBudget,
            usagePercentage,
          },
        });
      }

      await new Promise(r => setTimeout(r, 500));

      const generalTokens   = estimateTokens(cleanedGeneral!);
      const particularTokens = estimateTokens(cleanedParticular!);
      const totalInputTokens = generalTokens + particularTokens;

      const MAX_CHARS_PER_CHUNK = 100000;
      const MAX_TOKENS_PER_CHUNK = 50000;
      const needsChunking =
        cleanedGeneral!.length > MAX_CHARS_PER_CHUNK ||
        cleanedParticular!.length > MAX_CHARS_PER_CHUNK ||
        totalInputTokens > MAX_TOKENS_PER_CHUNK;

      if (!needsChunking) {
        // ── Single batch ──────────────────────────────────────────────────────
        setBatchInfo({ current: 1, total: 1 });
        setProgress(40);
        setLiveStatus({ message: 'Connecting to AI...', detail: 'Sending request to Claude API', isActive: true });

        const input: DualSourceInput = {
          general:     cleanedGeneral!,
          particular:  cleanedParticular!,
          skipCleaning: skipTextCleaning,
        };

        let dotCount = 0;
        const heartbeatInterval = setInterval(() => {
          dotCount = (dotCount + 1) % 4;
          setLiveStatus(prev => ({
            message: prev.message,
            detail:  prev.detail.replace(/\.+$/, '') + '.'.repeat(dotCount),
            isActive: true,
          }));
        }, 2000);

        try {
          setProgress(45);
          setLiveStatus({ message: 'AI Processing...', detail: 'Claude is analyzing your contract', isActive: true });

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              clearInterval(heartbeatInterval);
              reject(new Error('Request timeout: API call took too long. The text might be too large.'));
            }, 300_000);
          });

          const statusPhases = [
            { message: 'AI Processing...', detail: 'Sending request to Claude API', isActive: true },
            { message: 'AI Processing...', detail: 'Claude is analyzing your contract', isActive: true },
            { message: 'AI Processing...', detail: 'Extracting clauses verbatim...', isActive: true },
            { message: 'AI Processing...', detail: 'Processing General and Particular conditions...', isActive: true },
            { message: 'AI Processing...', detail: 'Identifying clause boundaries...', isActive: true },
            { message: 'AI Processing...', detail: 'Validating text integrity...', isActive: true },
          ];
          let phaseIndex = 0;
          const statusUpdateInterval = setInterval(() => {
            phaseIndex = (phaseIndex + 1) % statusPhases.length;
            setLiveStatus(statusPhases[phaseIndex]);
          }, 2500);

          const progressInterval = setInterval(() => {
            setProgress(progress + 5);
          }, 3000);

          const result = await Promise.race([analyzeContract(input), timeoutPromise]);

          clearInterval(heartbeatInterval);
          clearInterval(progressInterval);
          clearInterval(statusUpdateInterval);

          setProgress(87);
          setLiveStatus({ message: 'Receiving Response...', detail: "Processing Claude's response", isActive: true });
          await new Promise(r => setTimeout(r, 300));

          setProgress(90);
          setLiveStatus({ message: 'Parsing Results...', detail: `Extracted ${result.length} clauses, validating structure...`, isActive: true });
          await new Promise(r => setTimeout(r, 200));

          setProgress(93);
          setLiveStatus({ message: 'Finalizing...', detail: 'Processing extracted clauses', isActive: true });

          await finalizeAnalysis(result);
          setProgress(100);
          setLiveStatus({ message: 'Complete!', detail: `✓ Successfully extracted ${result.length} clauses`, isActive: false });

        } catch (err: any) {
          clearInterval(heartbeatInterval);
          if (err.message?.includes('timeout')) {
            setError(`Request timed out. Your text is very large (${totalInputTokens.toLocaleString()} tokens). Consider splitting it into smaller sections.`);
          } else if (err.message?.includes('429') || err.message?.includes('rate limit')) {
            setError('Rate limit exceeded. Please wait a moment and try again.');
          } else if (err.message?.includes('401') || err.message?.includes('authentication')) {
            setError('API authentication failed. Please check your API key configuration.');
          } else {
            setError(`Analysis failed: ${err.message || 'Unknown error'}. Please try again.`);
          }
          setStatus(AnalysisStatus.ERROR);
          setLiveStatus({ message: 'Error', detail: err.message || 'Unknown error', isActive: false });
          throw err;
        }

      } else {
        // ── Chunked batch ─────────────────────────────────────────────────────
        const gChunks   = splitTextIntoChunks(cleanedGeneral!, MAX_CHARS_PER_CHUNK);
        const pChunks   = splitTextIntoChunks(cleanedParticular!, MAX_CHARS_PER_CHUNK);
        const maxChunks = Math.max(gChunks.length, pChunks.length);

        setBatchInfo({ current: 0, total: maxChunks });
        setProgress(40);
        setLiveStatus({ message: `Processing ${maxChunks} chunks...`, detail: 'Splitting large text for analysis', isActive: true });

        const allResults: Clause[] = [];

        for (let i = 0; i < maxChunks; i++) {
          const gChunk = gChunks[i] || '';
          const pChunk = pChunks[i] || '';

          if (gChunk || pChunk) {
            setBatchInfo({ current: i + 1, total: maxChunks });
            setProgress(40 + Math.floor((i / maxChunks) * 50));

            setLiveStatus({ message: `Chunk ${i + 1}/${maxChunks}`, detail: 'Preparing chunk data for analysis', isActive: true });
            await new Promise(r => setTimeout(r, 300));

            setLiveStatus({ message: `Chunk ${i + 1}/${maxChunks}`, detail: 'Sending request to Claude API...', isActive: true });

            const apiCallPromise = analyzeContract({ general: gChunk, particular: pChunk, skipCleaning: skipTextCleaning });

            const statusMessages = [
              'Waiting for Claude to process...',
              'Claude is analyzing your text...',
              'Extracting clauses from chunk...',
              'Processing verbatim content...',
            ];
            let statusIndex = 0;
            const statusInterval = setInterval(() => {
              statusIndex = (statusIndex + 1) % statusMessages.length;
              setLiveStatus({ message: `Chunk ${i + 1}/${maxChunks}`, detail: statusMessages[statusIndex], isActive: true });
            }, 2000);

            try {
              const result = await apiCallPromise;
              clearInterval(statusInterval);

              setLiveStatus({ message: `Chunk ${i + 1}/${maxChunks}`, detail: 'Received response from Claude', isActive: true });
              await new Promise(r => setTimeout(r, 200));

              setLiveStatus({ message: `Chunk ${i + 1}/${maxChunks}`, detail: `Parsing ${result.length} extracted clauses...`, isActive: true });
              await new Promise(r => setTimeout(r, 200));

              setLiveStatus({ message: `Chunk ${i + 1}/${maxChunks}`, detail: 'Validating clause integrity...', isActive: true });

              allResults.push(...result);

              const generalCount   = result.filter(c => c.condition_type === 'General').length;
              const particularCount = result.filter(c => c.condition_type === 'Particular').length;
              setLiveStatus({
                message: `Chunk ${i + 1}/${maxChunks} complete`,
                detail:  `✓ Extracted ${result.length} clauses (${generalCount} General, ${particularCount} Particular)`,
                isActive: true,
              });
              await new Promise(r => setTimeout(r, 500));

            } catch (err) {
              clearInterval(statusInterval);
              throw err;
            }
          }
        }

        setLiveStatus({ message: 'Finalizing...', detail: 'Merging all chunks together', isActive: true });
        await new Promise(r => setTimeout(r, 300));
        setLiveStatus({ message: 'Finalizing...', detail: 'Removing duplicate clauses', isActive: true });
        const deduplicated = deduplicateClauses(allResults);
        setLiveStatus({ message: 'Finalizing...', detail: `Validating ${deduplicated.length} unique clauses`, isActive: true });
        await new Promise(r => setTimeout(r, 300));
        setProgress(95);
        setLiveStatus({ message: 'Finalizing...', detail: 'Preparing final results', isActive: true });
        await new Promise(r => setTimeout(r, 200));

        await finalizeAnalysis(deduplicated);
        setProgress(100);
        setLiveStatus({ message: 'Complete!', detail: `✓ Successfully extracted ${deduplicated.length} unique clauses`, isActive: false });
      }

    } catch (err: any) {
      setError(err.message);
      setStatus(AnalysisStatus.ERROR);
      setLiveStatus({ message: 'Error', detail: err.message || 'Unknown error', isActive: false });
    }
  };

  // ---------------------------------------------------------------------------
  // PDF ANALYSIS (file → preview)
  // ---------------------------------------------------------------------------

  /**
   * Extracts pages from one or two PDF files and navigates to the PDF_PREVIEW
   * status so the user can review and optionally AI-clean the text before analysis.
   */
  const handlePdfAnalysis = async (input: FileData | DualSourceInput) => {
    setStatus(AnalysisStatus.ANALYZING);
    setError(null);
    setProgress(5);

    try {
      let allPages: string[] = [];

      if ('data' in input) {
        allPages = await extractPagesFromPdf(input as FileData);
      } else {
        setLiveStatus({ message: 'Loading PDFs...', detail: 'Loading General PDF', isActive: true });
        setProgress(5);
        const gPages = await extractPagesFromPdf(input.general as FileData);
        setProgress(22);
        setLiveStatus({ message: 'Loading PDFs...', detail: 'Loading Particular PDF', isActive: true });
        const pPages = await extractPagesFromPdf(input.particular as FileData);
        setProgress(40);
        allPages = [...gPages, ...pPages];
      }

      setExtractedPdfPages(allPages);
      setPdfEditText(allPages.join('\n\n'));
      setCleanedPdfPages(null);
      setStatus(AnalysisStatus.PDF_PREVIEW);
      setProgress(0);
      setLiveStatus({ message: '', detail: '', isActive: false });

    } catch (err: any) {
      setError(err.message);
      setStatus(AnalysisStatus.ERROR);
      setLiveStatus({ message: 'Error', detail: err.message || 'Unknown error', isActive: false });
    }
  };

  // ---------------------------------------------------------------------------
  // AI OCR CLEANING
  // ---------------------------------------------------------------------------

  /** Sends the current PDF edit text to Claude for OCR/line-break cleanup. */
  const handleAICleanPdf = async () => {
    setIsCleaningPdf(true);
    try {
      const response = await callAIProxy({
        provider: 'anthropic',
        model:    'claude-sonnet-4-5',
        system: `You are a text cleanup assistant. Fix OCR errors, broken lines, and spacing issues in the following text. Rules:
- Fix broken words across lines (rejoin hyphenated line breaks)
- Fix obvious OCR errors (e.g., "rn" → "m", "0" → "O" where contextually appropriate)
- Normalize spacing and punctuation
- Preserve the original meaning and legal terminology exactly
- Preserve page separators (--- PAGE N ---)
- Return ONLY the cleaned text, no commentary`,
        max_tokens: 16384,
        messages: [{ role: 'user', content: `Clean this OCR-extracted text:\n\n${pdfEditText}` }],
      });
      const textBlock  = response.content.find((c: any) => c.type === 'text');
      const cleanedText = textBlock?.text || pdfEditText;
      setPdfEditText(cleanedText);
      setCleanedPdfPages(cleanedText.split(/\n---\s*PAGE\s+\d+\s*---\n/).filter(Boolean));
      toast.success('Text cleaned by AI');
    } catch (err: any) {
      console.error('AI cleanup error:', err);
      toast.error(`AI cleanup failed: ${err.message}`);
    } finally {
      setIsCleaningPdf(false);
    }
  };

  // ---------------------------------------------------------------------------
  // APPEND PDF TO EXISTING CONTRACT
  // ---------------------------------------------------------------------------

  /** Analyses the current PDF preview text and appends extracted clauses to the active contract. */
  const handleAddPdfToContract = async () => {
    if (!activeContractId || !contract) {
      toast.error('Please select a contract from the Archive first');
      return;
    }

    setStatus(AnalysisStatus.ANALYZING);
    setProgress(5);
    setError(null);

    try {
      const chunks = pdfEditText.split(/\n---\s*PAGE\s+\d+\s*---\n/).filter(Boolean);
      const pages  = chunks.length > 0 ? chunks : [pdfEditText];

      let allExtractedClauses: Clause[] = [];
      setBatchInfo({ current: 0, total: pages.length });
      setLiveStatus({ message: 'Analyzing clauses...', detail: `Processing ${pages.length} page(s)`, isActive: true });

      for (let i = 0; i < pages.length; i++) {
        setBatchInfo({ current: i + 1, total: pages.length });
        const result        = await analyzeContract(pages[i]);
        allExtractedClauses = deduplicateClauses([...allExtractedClauses, ...result]);

        setProgress(10 + Math.floor(((i + 1) / pages.length) * 80));
        setLiveStatus({
          message: 'Analyzing clauses...',
          detail:  `Processing page ${i + 1} of ${pages.length}`,
          isActive: true,
        });
      }

      // Append clauses to the target section
      const updatedContract = { ...contract };
      if (!updatedContract.sections) updatedContract.sections = [];

      let targetSection = updatedContract.sections.find(s => s.sectionType === pdfTargetSection);
      if (!targetSection) {
        targetSection = {
          sectionType: pdfTargetSection,
          title: SECTION_TITLES[pdfTargetSection] || pdfTargetSection,
          items: [],
        };
        updatedContract.sections.push(targetSection);
      }

      const startIndex = targetSection.items.length;
      const newItems   = allExtractedClauses.map((clause, idx) => ({
        itemType:           'CLAUSE' as any,
        orderIndex:         startIndex + idx,
        number:             clause.clause_number,
        heading:            clause.clause_title,
        text:               clause.clause_text,
        clause_number:      clause.clause_number,
        clause_title:       clause.clause_title,
        condition_type:     clause.condition_type,
        clause_text:        clause.clause_text,
        general_condition:  clause.general_condition,
        particular_condition: clause.particular_condition,
        comparison:         clause.comparison,
        has_time_frame:     clause.has_time_frame,
        time_frames:        clause.time_frames,
        financial_assets:   clause.financial_assets,
        category:           clause.category,
        chapter:            clause.chapter,
      }));
      targetSection.items = [...targetSection.items, ...newItems];

      // Rebuild metadata
      const allItems = updatedContract.sections.flatMap(s => s.items);
      updatedContract.metadata = {
        ...updatedContract.metadata,
        totalClauses:    allItems.length,
        generalCount:    allItems.filter(i => i.condition_type === 'General').length,
        particularCount: allItems.filter(i => i.condition_type === 'Particular').length,
      };

      await performSaveContract(updatedContract);
      setContract(updatedContract);
      setClauses([...clauses, ...allExtractedClauses]);

      setProgress(100);
      setStatus(AnalysisStatus.COMPLETED);
      setLiveStatus({ message: '', detail: '', isActive: false });
      toast.success(`Added ${newItems.length} clauses to ${targetSection.title}`);

      // Clear preview state
      setExtractedPdfPages([]);
      setCleanedPdfPages(null);
      setPdfEditText('');

    } catch (err: any) {
      setError(err.message);
      setStatus(AnalysisStatus.ERROR);
      setLiveStatus({ message: 'Error', detail: err.message || 'Unknown error', isActive: false });
    }
  };

  // ---------------------------------------------------------------------------
  // OCR JSON EXPORT
  // ---------------------------------------------------------------------------

  /** Downloads the current PDF preview text as a structured JSON file. */
  const handleDownloadOcrJson = () => {
    if (!pdfEditText) return;
    const exportData = {
      type:      'aaa_ocr_export',
      version:   '1.0',
      text:      pdfEditText,
      pages:     pdfEditText.split(/\n---\s*PAGE\s+\d+\s*---\n/).filter(Boolean),
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ocr_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('OCR JSON downloaded');
  };

  // ---------------------------------------------------------------------------
  // FINALIZE ANALYSIS (post-AI processing)
  // ---------------------------------------------------------------------------

  /**
   * Called after AI returns extracted clauses. Linkifies clause references,
   * deduplicates, sorts, persists immediately, and triggers category suggestions.
   */
  const finalizeAnalysis = async (allExtractedClauses: Clause[]) => {
    const availableClauseIds = new Set<string>(
      allExtractedClauses.map(c => normalizeClauseId(c.clause_number)),
    );

    const processedClauses = allExtractedClauses.map(c => ({
      ...c,
      clause_text:         linkifyText(c.clause_text, availableClauseIds),
      general_condition:   linkifyText(c.general_condition, availableClauseIds),
      particular_condition: linkifyText(c.particular_condition, availableClauseIds),
    }));

    const deduplicated = deduplicateClauses(processedClauses);
    const sorted       = deduplicated.sort((a, b) =>
      compareClauseNumbers(a.clause_number, b.clause_number),
    );

    setClauses(reprocessClauseLinks(sorted));

    const first        = sorted.find(c => c.clause_title && c.clause_title !== 'Untitled');
    const detectedName = first?.clause_title || `Analysis ${new Date().toLocaleDateString()}`;
    setProjectName(detectedName);

    const newId = crypto.randomUUID();
    setActiveContractId(newId);

    const contractWithSections = ensureContractHasSections({
      id:        newId,
      name:      detectedName,
      timestamp: Date.now(),
      clauses:   sorted,
      metadata: {
        totalClauses:       sorted.length,
        generalCount:       sorted.filter(c => c.condition_type === 'General').length,
        particularCount:    sorted.filter(c => c.condition_type === 'Particular').length,
        highRiskCount:      0,
        conflictCount:      sorted.filter(c => c.comparison && c.comparison.length > 0).length,
        timeSensitiveCount: sorted.filter(c => c.time_frames && c.time_frames.length > 0).length,
      },
    });
    setContract(contractWithSections);

    await persistCurrentProject(sorted, detectedName, true);

    if (sorted.length > 0) {
      setLiveStatus({ message: 'Generating Category Suggestions...', detail: 'Analyzing clauses for categorization', isActive: true });
      try {
        const suggestions = await suggestCategories(sorted);
        if (suggestions.length > 0) {
          setCategorySuggestions(suggestions);
          setShowCategorySuggestions(true);
        }
      } catch (err) {
        console.error('Failed to generate category suggestions:', err);
      }
    }

    setProgress(100);
    setTimeout(() => setStatus(AnalysisStatus.COMPLETED), 600);
  };

  // ---------------------------------------------------------------------------
  // FILE READER HELPER
  // ---------------------------------------------------------------------------

  /** Reads a File object as base64 and calls back with a FileData struct. */
  const processFile = (file: File, callback: (fd: FileData) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        callback({ data: result.split(',')[1], mimeType: file.type, name: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

  return {
    extractPagesFromPdf,
    handleTextAnalysis,
    handlePdfAnalysis,
    handleAICleanPdf,
    handleAddPdfToContract,
    handleDownloadOcrJson,
    finalizeAnalysis,
    processFile,
  };
}
