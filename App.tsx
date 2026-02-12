
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { analyzeContract } from './services/claudeService';
import { callAIProxy } from './src/services/aiProxyClient';
import { saveContractToDB, getAllContracts, deleteContractFromDB } from './services/dbService';
import { getContractFromSupabase } from './src/services/supabaseService';
import { Clause, AnalysisStatus, SavedContract, ConditionType, FileData, DualSourceInput, SectionType } from './types';
// import { GroupedClauseCard, groupClausesByParent } from './components/GroupedClauseCard'; // Lazy loaded below
import { groupClausesByParent } from './components/GroupedClauseCard';
import { CategoryManagerService } from './services/categoryManagerService';
import { ContractSectionsTabs } from './components/ContractSectionsTabs';

// Lazy load heavy components for performance
const ComparisonModal = React.lazy(() => import('./components/ComparisonModal').then(m => ({ default: m.ComparisonModal })));
const AddClauseModal = React.lazy(() => import('./components/AddClauseModal').then(m => ({ default: m.AddClauseModal })));
const CategoryManager = React.lazy(() => import('./components/CategoryManager').then(m => ({ default: m.CategoryManager })));
const CategorySuggestionsModal = React.lazy(() => import('./components/CategorySuggestionsModal').then(m => ({ default: m.CategorySuggestionsModal })));
const CategoryLedger = React.lazy(() => import('./components/CategoryLedger').then(m => ({ default: m.CategoryLedger })));
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const AIBotSidebar = React.lazy(() => import('./src/components/AIBotSidebar').then(m => ({ default: m.AIBotSidebar })));
const GroupedClauseCard = React.lazy(() => import('./components/GroupedClauseCard').then(m => ({ default: m.GroupedClauseCard })));
import { ensureContractHasSections, getAllClausesFromContract, clauseToSectionItem, sectionItemToClause } from './services/contractMigrationService';
import { ItemType } from './types';
import { AppWrapper } from './src/components/AppWrapper';
// import { AIBotSidebar } from './src/components/AIBotSidebar'; // Lazy loaded above
import { FloatingAIButton } from './src/components/FloatingAIButton';
import { useAuth } from './src/contexts/AuthContext';
import { preprocessText, splitTextIntoChunks, detectCorruptedLines, cleanTextWithAI } from './src/services/textPreprocessor';
import { suggestCategories, CategorySuggestion } from './services/categorySuggestionService';
import { PaddleOcrService } from './src/services/paddleOcrService';
import { normalizeClauseId, generateClauseIdVariants } from './src/utils/navigation';

const REASSURING_STAGES = [
  { progress: 10, label: "Scanning Pages...", sub: "Mapping document layers" },
  { progress: 30, label: "Verbatim Extraction...", sub: "Processing batch sequences" },
  { progress: 60, label: "Validating Text Integrity...", sub: "Neural word-for-word check" },
  { progress: 90, label: "Finalizing Records...", sub: "Syncing temporal ledger" }
];

const TEXT_STAGES = [
  { progress: 10, label: "Cleaning Text...", sub: "Fixing PDF extraction errors" },
  { progress: 25, label: "Detecting Clauses...", sub: "Identifying clause boundaries" },
  { progress: 40, label: "AI Analysis...", sub: "Extracting verbatim clauses" },
  { progress: 85, label: "Validating Ledger...", sub: "Confirming condition types" },
  { progress: 100, label: "Ready", sub: "Finalizing" }
];

// Helper: Get clause status (added, modified, gc-only) for sorting/display
const getClauseStatus = (clause: Clause): 'added' | 'modified' | 'gc-only' => {
  const hasPC = clause.particular_condition && clause.particular_condition.length > 0;
  const hasGC = clause.general_condition && clause.general_condition.length > 0;

  // For dual-source contracts (have both GC and PC fields populated)
  if (hasPC && !hasGC) return 'added';
  if (hasPC && hasGC) return 'modified';
  if (hasGC) return 'gc-only';

  // Fallback for single-source contracts (only condition_type is set)
  if (clause.condition_type === 'Particular') return 'added';
  return 'gc-only';
};

// Estimate token count from text (rough approximation: ~4 characters per token)
const estimateTokens = (text: string): number => {
  if (!text) return 0;
  // Rough estimate: 1 token ≈ 4 characters for English text
  // Add system instruction overhead (~500 tokens)
  return Math.ceil(text.length / 4) + 500;
};

// Claude Sonnet 4.5 token limits
const CLAUDE_TOKEN_LIMITS = {
  maxInputTokens: 200000,  // Context window
  maxOutputTokens: 16384,   // Output limit (as set in analyzeContract)
  totalBudget: 200000      // Total context window
};

// Strip existing clause hyperlinks from text (to allow re-processing)
const stripClauseLinks = (text: string | undefined): string => {
  if (!text) return "";
  // Remove <a href="#clause-..." class="clause-link" ...>...</a> and keep the inner text
  return text.replace(/<a\s+href="#clause-[^"]*"[^>]*class="clause-link"[^>]*>([^<]*)<\/a>/gi, '$1');
};

const linkifyCache = new Map<string, string>();

const linkifyText = (text: string | undefined, availableClauseIds?: Set<string>): string => {
  if (!text) return "";

  const cacheKey = `${text}|${availableClauseIds?.size || 0}`;
  if (linkifyCache.has(cacheKey)) return linkifyCache.get(cacheKey)!;

  let cleanText = stripClauseLinks(text);

  if (!availableClauseIds || availableClauseIds.size === 0) {
    linkifyCache.set(cacheKey, cleanText);
    return cleanText;
  }

  const pattern = /(?:[Cc]lause|[Ss]ub-[Cc]lause)\s+([0-9]+[A-Za-z]?(?:\.[0-9]+[A-Za-z]?)*(?:\s*\([a-z0-9]+\))?)(?=[\s,;:.)\]"]|$)/g;

  const result = cleanText.replace(pattern, (match, number) => {
    const cleanId = normalizeClauseId(number);
    if (availableClauseIds.has(cleanId)) {
      return `<a href="#clause-${cleanId}" class="clause-link" data-clause-id="${cleanId}">${match}</a>`;
    }
    const variants = generateClauseIdVariants(number);
    for (const variant of variants) {
      if (availableClauseIds.has(variant)) {
        return `<a href="#clause-${variant}" class="clause-link" data-clause-id="${variant}">${match}</a>`;
      }
    }
    return match;
  });

  linkifyCache.set(cacheKey, result);
  return result;
};

// Re-process all clause links in a contract's clauses
const reprocessClauseLinks = (clausesList: Clause[]): Clause[] => {
  const availableClauseIds = new Set<string>();

  clausesList.forEach(c => {
    const normalizedId = normalizeClauseId(c.clause_number);
    availableClauseIds.add(normalizedId);
    const variants = generateClauseIdVariants(c.clause_number);
    variants.forEach(v => availableClauseIds.add(v));
  });

  return clausesList.map(c => {
    const newText = linkifyText(c.clause_text, availableClauseIds);
    const newGC = linkifyText(c.general_condition, availableClauseIds);
    const newPC = linkifyText(c.particular_condition, availableClauseIds);

    if (newText === c.clause_text && newGC === c.general_condition && newPC === c.particular_condition) {
      return c;
    }

    return {
      ...c,
      clause_text: newText,
      general_condition: newGC,
      particular_condition: newPC
    };
  });
};

// Helper: Get all clauses from contract AND reprocess links
// Use this instead of getAllClausesFromContract when loading contracts for display
const getClausesWithProcessedLinks = (contract: SavedContract): Clause[] => {
  const allClauses = getAllClausesFromContract(contract);
  return reprocessClauseLinks(allClauses);
};

// Highlight keywords in text for search results
const highlightKeywords = (text: string, keywords: string[]): string => {
  if (!text || keywords.length === 0) return text;

  let highlightedText = text;
  keywords.forEach(keyword => {
    if (keyword.trim().length > 0) {
      // Escape special regex characters in keyword
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Create regex that matches the keyword (case-insensitive) but not inside HTML tags
      const regex = new RegExp(`(${escapedKeyword})`, 'gi');
      highlightedText = highlightedText.replace(regex, (match) => {
        // Don't highlight if it's inside an HTML tag or already highlighted
        if (match.includes('<') || match.includes('>') || match.includes('highlight-keyword')) {
          return match;
        }
        return `<mark class="highlight-keyword" style="background-color: #FEF3C7; color: #92400E; padding: 2px 4px; border-radius: 3px; font-weight: 600;">${match}</mark>`;
      });
    }
  });

  return highlightedText;
};

// Deduplicate clauses by clause_number and condition_type
// Keeps the first occurrence of each unique clause_number+condition_type combination
const deduplicateClauses = (clauses: Clause[]): Clause[] => {
  const seen = new Map<string, Clause>();
  const result: Clause[] = [];

  for (const clause of clauses) {
    const key = `${clause.clause_number}|${clause.condition_type}`;
    if (!seen.has(key)) {
      seen.set(key, clause);
      result.push(clause);
    }
  }

  return result;
};

interface SearchResult {
  clause_id: string;
  clause_number: string;
  title: string;
  condition_type: string;
  relevance_score: number;
  reason: string;
}

const App: React.FC = () => {
  const { isAdmin, user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [contract, setContract] = useState<SavedContract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(REASSURING_STAGES[0]);
  const [batchInfo, setBatchInfo] = useState({ current: 0, total: 0 });
  const [liveStatus, setLiveStatus] = useState<{
    message: string;
    detail: string;
    isActive: boolean;
  }>({ message: '', detail: '', isActive: false });
  const [preprocessingInfo, setPreprocessingInfo] = useState<{
    generalFixes: number;
    particularFixes: number;
    estimatedClauses: number;
    fixes: Array<{ original: string; fixed: string; reason: string }>;
    tokenInfo: {
      inputTokens: number;
      outputTokenLimit: number;
      totalTokenBudget: number;
      usagePercentage: number;
    };
  } | null>(null);

  const [generalFile, setGeneralFile] = useState<FileData | null>(null);
  const [particularFile, setParticularFile] = useState<FileData | null>(null);
  const [pastedGeneralText, setPastedGeneralText] = useState('');
  const [pastedParticularText, setPastedParticularText] = useState('');
  const [inputMode, setInputMode] = useState<'single' | 'dual' | 'text' | 'fixer'>('dual');
  const [textToFix, setTextToFix] = useState('');
  const [fixedText, setFixedText] = useState<{ cleaned: string; fixes: Array<{ original: string; fixed: string; reason: string }>; removedLines: number; corruptedLines?: Array<{ line: string; reason: string; index: number }> } | null>(null);
  const [linesToRemove, setLinesToRemove] = useState<Set<number>>(new Set());
  const [showCorruptionReview, setShowCorruptionReview] = useState(false);
  const [currentCorruptionIndex, setCurrentCorruptionIndex] = useState(0);
  const [useAICleaning, setUseAICleaning] = useState(false);
  const [isAICleaning, setIsAICleaning] = useState(false);
  const [aiCleanedText, setAiCleanedText] = useState<string | null>(null);
  const [skipTextCleaning, setSkipTextCleaning] = useState(false);

  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedTypes, setSelectedTypes] = useState<ConditionType[]>(['General', 'Particular']);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [compareClause, setCompareClause] = useState<Clause | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState<CategorySuggestion[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const [library, setLibrary] = useState<SavedContract[]>([]);
  const [projectName, setProjectName] = useState('');
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showContractSelector, setShowContractSelector] = useState(false);

  // Smart Search States
  const [smartSearchQuery, setSmartSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // AI Bot States
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [selectedClauseForBot, setSelectedClauseForBot] = useState<Clause | null>(null);

  // Chapter Display View
  const [viewByChapter, setViewByChapter] = useState(false);

  // Sort Mode for clause organization
  const [sortMode, setSortMode] = useState<'default' | 'status' | 'chapter' | 'category'>('default');

  // Sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const generalFileRef = useRef<HTMLInputElement>(null);
  const particularFileRef = useRef<HTMLInputElement>(null);
  const importBackupRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stages = inputMode === 'text' ? TEXT_STAGES : REASSURING_STAGES;
    const stage = [...stages].reverse().find(s => progress >= s.progress) || stages[0];
    setActiveStage(stage);
  }, [progress, inputMode]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Persist activeContractId to localStorage whenever it changes
  useEffect(() => {
    if (activeContractId) {
      localStorage.setItem('aaa_active_contract_id', activeContractId);
    } else {
      localStorage.removeItem('aaa_active_contract_id');
    }
  }, [activeContractId]);

  // Track if we've shown the contract selector (to prevent multiple shows)
  const hasShownSelectorRef = useRef(false);

  // Show contract selector on startup (wait for authentication)
  useEffect(() => {
    // Don't show until authentication is ready
    if (authLoading) {
      return;
    }

    // Only show if user is authenticated
    if (!user) {
      return;
    }

    // Don't show if we've already shown it
    if (hasShownSelectorRef.current) {
      return;
    }

    // Don't show if clauses are already loaded (user may have manually loaded something)
    if (clauses.length > 0) {
      hasShownSelectorRef.current = true;
      return;
    }

    const showContractSelector = async () => {
      hasShownSelectorRef.current = true; // Mark as shown immediately to prevent duplicate calls

      try {
        // Load all contracts from Supabase
        await refreshLibrary();

        // Show the contract selector modal even if no contracts found
        setShowContractSelector(true);
      } catch (error) {
        console.error('Failed to load contracts:', error);
        // Still show selector so user can create new contract
        setShowContractSelector(true);
      }
    };

    showContractSelector();
  }, [authLoading, user]); // Run when auth state changes

  // Handle escape key to close contract selector
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showContractSelector) {
        setShowContractSelector(false);
      }
    };

    if (showContractSelector) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showContractSelector]);

  const refreshLibrary = async () => {
    try {
      console.log('Refreshing library (metadata only)...');
      // Use metadataOnly: true to speed up initial load
      const contracts = await getAllContracts({ metadataOnly: true });
      console.log(`Loaded ${contracts?.length || 0} contracts (metadata) into library`);
      setLibrary(contracts || []);
    } catch (err: any) {
      console.error("Library load failed:", err?.message);
      setLibrary([]);
    }
  };

  // Library will be loaded after first save or when accessing library view
  // useEffect(() => { refreshLibrary(); }, []);

  // Debounce timer ref to prevent multiple rapid saves
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<{ clauses?: Clause[], name?: string } | null>(null);

  const persistCurrentProject = async (newClauses?: Clause[], newName?: string, immediate: boolean = false) => {
    const targetClauses = newClauses || clauses;
    const targetName = (newName || projectName).trim() || "Untitled Project";
    const targetId = activeContractId || crypto.randomUUID();
    if (targetClauses.length === 0) return;

    // Store pending save data
    pendingSaveRef.current = { clauses: targetClauses, name: targetName };

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // If immediate save requested (e.g., after analysis completes), save right away
    if (immediate) {
      await performSave(targetClauses, targetName, targetId);
      return;
    }

    // Debounce: wait 1 second before saving (batches rapid changes)
    saveTimeoutRef.current = setTimeout(async () => {
      const pending = pendingSaveRef.current;
      if (pending) {
        await performSave(pending.clauses || clauses, pending.name || projectName, targetId);
        pendingSaveRef.current = null;
      }
    }, 1000);
  };

  const performSave = async (targetClauses: Clause[], targetName: string, targetId: string) => {
    setIsSaving(true);
    try {
      // Create contract with sections
      const contractWithSections = ensureContractHasSections({
        id: targetId,
        name: targetName,
        timestamp: Date.now(),
        clauses: targetClauses,
        metadata: {
          totalClauses: targetClauses.length,
          generalCount: targetClauses.filter(c => c.condition_type === 'General').length,
          particularCount: targetClauses.filter(c => c.condition_type === 'Particular').length,
          highRiskCount: 0,
          conflictCount: targetClauses.filter(c => c.comparison && c.comparison.length > 0).length,
          timeSensitiveCount: targetClauses.filter(c => c.time_frames && c.time_frames.length > 0).length
        }
      });

      await saveContractToDB(contractWithSections);
      setContract(contractWithSections);
      if (!activeContractId) setActiveContractId(targetId);
      await refreshLibrary();
      toast.success('Contract saved successfully!');
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const performSaveContract = async (targetContract: SavedContract) => {
    setIsSaving(true);
    try {
      // Ensure contract has sections, but preserve existing sections if they exist
      let contractWithSections: SavedContract;
      if (targetContract.sections && targetContract.sections.length > 0) {
        // Contract already has sections - preserve them as-is
        contractWithSections = ensureContractHasSections(targetContract);
      } else {
        // No sections - migrate/create them
        contractWithSections = ensureContractHasSections(targetContract);
      }

      // Ensure we have an ID
      if (!contractWithSections.id) {
        contractWithSections.id = activeContractId || crypto.randomUUID();
      }

      // Save to database
      await saveContractToDB(contractWithSections);

      // Update local state with reprocessed clause links
      setContract(contractWithSections);
      setClauses(getClausesWithProcessedLinks(contractWithSections));
      if (!activeContractId) setActiveContractId(contractWithSections.id);

      // Refresh library to show updated contract
      await refreshLibrary();

      console.log('Contract saved successfully:', {
        id: contractWithSections.id,
        name: contractWithSections.name,
        sectionsCount: contractWithSections.sections?.length || 0,
        agreementItems: contractWithSections.sections?.find(s => s.sectionType === SectionType.AGREEMENT)?.items.length || 0,
        loaItems: contractWithSections.sections?.find(s => s.sectionType === SectionType.LOA)?.items.length || 0
      });
    } catch (err) {
      console.error("Save failed:", err);
      toast.error(`Failed to save contract: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const handleUpdateClause = (updatedClause: Clause) => {
    if (contract) {
      const contractWithSections = ensureContractHasSections(contract);
      const sectionType = updatedClause.condition_type === 'General' ? SectionType.GENERAL : SectionType.PARTICULAR;
      const section = contractWithSections.sections?.find(s => s.sectionType === sectionType);

      if (section) {
        const itemIndex = section.items.findIndex(item =>
          item.itemType === ItemType.CLAUSE &&
          item.clause_number === updatedClause.clause_number &&
          item.condition_type === updatedClause.condition_type
        );

        if (itemIndex >= 0) {
          const updatedItem = clauseToSectionItem(updatedClause, section.items[itemIndex].orderIndex);
          const updatedItems = [...section.items];
          updatedItems[itemIndex] = updatedItem;

          const updatedSections = contractWithSections.sections!.map(s =>
            s.sectionType === sectionType ? { ...s, items: updatedItems } : s
          );

          const updatedContract: SavedContract = {
            ...contractWithSections,
            sections: updatedSections,
            clauses: getAllClausesFromContract({ ...contractWithSections, sections: updatedSections })
          };

          setContract(updatedContract);
          setClauses(reprocessClauseLinks(updatedContract.clauses || []));
          if (compareClause && compareClause.clause_number === updatedClause.clause_number) {
            setCompareClause(updatedClause);
          }
          performSaveContract(updatedContract);
          return;
        }
      }
    }

    // Fallback: update clauses array directly
    const updatedClauses = clauses.map(c =>
      c.clause_number === updatedClause.clause_number && c.condition_type === updatedClause.condition_type
        ? updatedClause
        : c
    );
    setClauses(updatedClauses);
    if (compareClause && compareClause.clause_number === updatedClause.clause_number) {
      setCompareClause(updatedClause);
    }
    persistCurrentProject(updatedClauses);
  };

  const handleClausesUpdateFromCategory = (updatedClauses: Clause[]) => {
    setClauses(updatedClauses);
    persistCurrentProject(updatedClauses);
  };

  const smartSearchClauses = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchError(null);

    const searchContext = clauses.map(c => ({
      clause_id: `C.${c.clause_number}`,
      clause_number: c.clause_number,
      title: c.clause_title,
      text: c.clause_text.substring(0, 500),
      condition_type: c.condition_type
    }));

    try {
      const response = await callAIProxy({
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: `You are the Smart Search Engine for AAA Contract Department.
You receive a natural-language query and a list of clauses.
Your job is to select and rank the top 5 clauses that best match the query by meaning and keywords.
Focus on construction contract concepts: time frames, payment, insurance, liability, termination, etc.
Return ONLY valid JSON with this structure: {"results": [{"clause_id": "...", "clause_number": "...", "title": "...", "condition_type": "...", "relevance_score": 0.0-1.0, "reason": "..."}]}. Do not add any extra text.`,
        messages: [
          {
            role: 'user',
            content: `USER QUERY: "${query}"\n\nCLAUSE DATA:\n${JSON.stringify(searchContext)}`
          }
        ]
      });

      const content = response.content.find(c => c.type === 'text');
      const resultText = content?.text || '';

      // Extract JSON from response (might be wrapped in markdown)
      let jsonText = resultText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const result = JSON.parse(jsonText);
      setSearchResults(result.results);
    } catch (err) {
      console.error("Smart Search Error:", err);
      setSearchError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const onOpenClause = (clauseNumber: string) => {
    const clause = clauses.find(c => c.clause_number === clauseNumber);
    if (clause) {
      setCompareClause(clause);
    }
  };

  const [editingClause, setEditingClause] = useState<Clause | null>(null);

  const handleEditClause = (clause: Clause) => {
    setEditingClause(clause);
    setIsAddModalOpen(true);
  };

  const handleUpdateClauseFromModal = async (data: {
    number: string;
    title: string;
    generalText: string;
    particularText: string;
    contractId: string;
  }) => {
    if (!editingClause || !contract) return;

    // Build Set of available clause IDs from current clauses
    const availableClauseIds = new Set<string>(
      (clauses || []).map(c => normalizeClauseId(c.clause_number))
    );
    // Also add the new/updated clause number
    availableClauseIds.add(normalizeClauseId(data.number));

    await new Promise(resolve => setTimeout(resolve, 600));
    const conditionType: ConditionType = data.particularText.trim() ? 'Particular' : 'General';
    const updatedClause: Clause = {
      ...editingClause,
      clause_number: data.number,
      clause_title: data.title || "Untitled Clause",
      clause_text: linkifyText(data.particularText || data.generalText, availableClauseIds),
      condition_type: conditionType,
      general_condition: data.generalText.trim() ? linkifyText(data.generalText, availableClauseIds) : undefined,
      particular_condition: data.particularText.trim() ? linkifyText(data.particularText, availableClauseIds) : undefined,
    };

    // Update in contract sections
    const contractWithSections = ensureContractHasSections(contract);
    const sectionType = conditionType === 'General' ? SectionType.GENERAL : SectionType.PARTICULAR;
    const section = contractWithSections.sections?.find(s => s.sectionType === sectionType);

    if (section) {
      const itemIndex = section.items.findIndex(item =>
        item.itemType === ItemType.CLAUSE &&
        item.clause_number === editingClause.clause_number &&
        item.condition_type === editingClause.condition_type
      );

      if (itemIndex >= 0) {
        const updatedItem = clauseToSectionItem(updatedClause, section.items[itemIndex].orderIndex);
        const updatedItems = [...section.items];
        updatedItems[itemIndex] = updatedItem;

        const updatedSections = contractWithSections.sections!.map(s =>
          s.sectionType === sectionType ? { ...s, items: updatedItems } : s
        );

        const updatedContract: SavedContract = {
          ...contractWithSections,
          sections: updatedSections,
          clauses: getAllClausesFromContract({ ...contractWithSections, sections: updatedSections })
        };

        setContract(updatedContract);
        setClauses(reprocessClauseLinks(updatedContract.clauses || []));
        await performSaveContract(updatedContract);

        // Update editingClause to reflect saved changes (keeps modal open)
        setEditingClause(updatedClause);
      }
    }

    // Don't close modal - let user continue editing
    // setEditingClause(null);
  };

  const handleSaveManualClause = async (data: {
    number: string;
    title: string;
    generalText: string;
    particularText: string;
    contractId: string;
  }) => {
    if (!contract) {
      // Create new contract if none exists
      const newId = crypto.randomUUID();
      const newContract = ensureContractHasSections({
        id: newId,
        name: projectName || "Untitled Contract",
        timestamp: Date.now(),
        clauses: [],
        metadata: {
          totalClauses: 0,
          generalCount: 0,
          particularCount: 0,
          highRiskCount: 0,
          conflictCount: 0,
          timeSensitiveCount: 0
        }
      });
      setContract(newContract);
      setActiveContractId(newId);
    }

    await new Promise(resolve => setTimeout(resolve, 600));

    // Build Set of available clause IDs from current clauses
    const availableClauseIds = new Set<string>(
      (clauses || []).map(c => normalizeClauseId(c.clause_number))
    );
    // Also add the new clause number
    availableClauseIds.add(normalizeClauseId(data.number));

    const conditionType: ConditionType = data.particularText.trim() ? 'Particular' : 'General';
    const newClause: Clause = {
      clause_number: data.number,
      clause_title: data.title || "Untitled Clause",
      clause_text: linkifyText(data.particularText || data.generalText, availableClauseIds),
      condition_type: conditionType,
      general_condition: data.generalText.trim() ? linkifyText(data.generalText, availableClauseIds) : undefined,
      particular_condition: data.particularText.trim() ? linkifyText(data.particularText, availableClauseIds) : undefined,
      comparison: [],
      time_frames: []
    };

    const currentContract = ensureContractHasSections(contract!);
    const sectionType = conditionType === 'General' ? SectionType.GENERAL : SectionType.PARTICULAR;
    const section = currentContract.sections!.find(s => s.sectionType === sectionType);

    if (!section) return;

    // Check for existing clause with same number and condition type
    const existingItemIndex = section.items.findIndex(item =>
      item.itemType === ItemType.CLAUSE &&
      item.clause_number === data.number &&
      item.condition_type === conditionType
    );

    if (existingItemIndex >= -1 && existingItemIndex < section.items.length) {
      const existingItem = section.items[existingItemIndex];
      const existingClause = sectionItemToClause(existingItem);
      if (existingClause) {
        const shouldUpdate = confirm(
          `Clause ${data.number} (${conditionType}) already exists.\n\n` +
          `Existing: "${existingClause.clause_title}"\n` +
          `New: "${newClause.clause_title}"\n\n` +
          `Click OK to replace the existing clause, or Cancel to abort.`
        );

        if (!shouldUpdate) {
          return; // User cancelled
        }

        // Replace existing clause
        const updatedItem = clauseToSectionItem(newClause, section.items[existingItemIndex].orderIndex);
        const updatedItems = [...section.items];
        updatedItems[existingItemIndex] = updatedItem;

        const updatedSections = currentContract.sections!.map(s =>
          s.sectionType === sectionType ? { ...s, items: updatedItems } : s
        );

        const updatedContract: SavedContract = {
          ...currentContract,
          sections: updatedSections,
          clauses: getAllClausesFromContract({ ...currentContract, sections: updatedSections })
        };

        setContract(updatedContract);
        setClauses(reprocessClauseLinks(updatedContract.clauses || []));
        await performSaveContract(updatedContract);
        return;
      }
    }

    // No duplicate found, add new clause
    const updatedItem = clauseToSectionItem(newClause, section.items.length);
    const updatedItems = [...section.items, updatedItem];

    const updatedSections = currentContract.sections!.map(s =>
      s.sectionType === sectionType ? { ...s, items: updatedItems } : s
    );

    const updatedContract: SavedContract = {
      ...currentContract,
      sections: updatedSections,
      clauses: getAllClausesFromContract({ ...currentContract, sections: updatedSections })
    };

    setContract(updatedContract);
    setClauses(reprocessClauseLinks(updatedContract.clauses || []));
    await performSaveContract(updatedContract);
  };

  const handleRenameArchive = async (e: React.MouseEvent, contract: SavedContract) => {
    e.stopPropagation();
    const newName = prompt("Enter new project name:", contract.name);
    if (newName && newName.trim() !== "" && newName !== contract.name) {
      const updated = { ...contract, name: newName.trim() };
      await saveContractToDB(updated);
      await refreshLibrary();
      if (activeContractId === contract.id) setProjectName(updated.name);
    }
  };

  const handleDeleteArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Permanently delete this project from archive?")) {
      try {
        await deleteContractFromDB(id);
        await refreshLibrary();
        if (activeContractId === id) {
          setStatus(AnalysisStatus.IDLE);
          setPreprocessingInfo(null);
          setLiveStatus({ message: '', detail: '', isActive: false });
          setActiveContractId(null);
          setClauses([]);
          // Clear saved active contract ID from localStorage
          localStorage.removeItem('aaa_active_contract_id');
        }
        // Show success message
        toast.success("Contract deleted successfully!");
      } catch (err: any) {
        console.error("Delete failed:", err);
        const errorMessage = err?.message || "Failed to delete contract. Please check your connection and try again.";
        toast.error(`Error: ${errorMessage}`);
      }
    }
  };

  const handleExportContract = (e: React.MouseEvent, contract: SavedContract) => {
    e.stopPropagation();
    const dataStr = JSON.stringify(contract, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `${contract.name.replace(/[^a-z0-9]/gi, '_')}_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') return;

        const importedData = JSON.parse(content) as SavedContract;

        // Basic validation
        if (!importedData.clauses || !Array.isArray(importedData.clauses)) {
          throw new Error("Invalid backup format: missing clauses ledger.");
        }

        // Assign a new ID to avoid collisions if they re-import multiple times
        const newId = crypto.randomUUID();
        const contractToSave: SavedContract = {
          ...importedData,
          id: newId,
          timestamp: Date.now()
        };

        const contractWithSections = ensureContractHasSections(contractToSave);
        await saveContractToDB(contractWithSections);
        await refreshLibrary();

        // Automatically load it with re-processed links
        const allClauses = getAllClausesFromContract(contractWithSections);
        const reprocessedClauses = reprocessClauseLinks(allClauses);
        setContract(contractWithSections);
        setClauses(reprocessedClauses);
        setProjectName(contractWithSections.name);
        setActiveContractId(newId);
        setStatus(AnalysisStatus.COMPLETED);

        // Reset the file input
        if (importBackupRef.current) importBackupRef.current.value = '';
      } catch (err: any) {
        toast.error("Failed to import backup: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteClause = async (index: number, sectionType?: SectionType) => {
    if (!contract) return;

    if (confirm("Permanently remove this clause node?")) {
      const contractWithSections = ensureContractHasSections(contract);

      if (sectionType) {
        // Delete from specific section
        const section = contractWithSections.sections?.find(s => s.sectionType === sectionType);
        if (section) {
          const updatedItems = section.items.filter((_, i) => i !== index);
          updatedItems.forEach((item, i) => {
            item.orderIndex = i;
          });

          const updatedSections = contractWithSections.sections!.map(s =>
            s.sectionType === sectionType ? { ...s, items: updatedItems } : s
          );

          const updatedContract: SavedContract = {
            ...contractWithSections,
            sections: updatedSections,
            clauses: getAllClausesFromContract({ ...contractWithSections, sections: updatedSections })
          };

          setContract(updatedContract);
          setClauses(reprocessClauseLinks(updatedContract.clauses || []));
          await performSaveContract(updatedContract);
        }
      } else {
        // Legacy: delete from clauses array
        const clause = clauses[index];
        if (clause) {
          const targetSectionType = clause.condition_type === 'General' ? SectionType.GENERAL : SectionType.PARTICULAR;
          const section = contractWithSections.sections?.find(s => s.sectionType === targetSectionType);
          if (section) {
            const itemIndex = section.items.findIndex(item =>
              item.itemType === ItemType.CLAUSE &&
              item.clause_number === clause.clause_number &&
              item.condition_type === clause.condition_type
            );

            if (itemIndex >= 0) {
              const updatedItems = section.items.filter((_, i) => i !== itemIndex);
              updatedItems.forEach((item, i) => {
                item.orderIndex = i;
              });

              const updatedSections = contractWithSections.sections!.map(s =>
                s.sectionType === targetSectionType ? { ...s, items: updatedItems } : s
              );

              const updatedContract: SavedContract = {
                ...contractWithSections,
                sections: updatedSections,
                clauses: getAllClausesFromContract({ ...contractWithSections, sections: updatedSections })
              };

              setContract(updatedContract);
              setClauses(reprocessClauseLinks(updatedContract.clauses || []));
              await performSaveContract(updatedContract);
            }
          }
        }
      }
    }
  };

  // PaddleOCR-based PDF text extraction (replaces old pdfjsLib approach)

  // Remove headers and footers by detecting repeated text
  const removeHeadersFooters = (pages: string[]): string[] => {
    if (pages.length < 3) return pages; // Need at least 3 pages to detect patterns

    // Extract top and bottom lines from each page
    const headerLines: Map<string, number> = new Map();
    const footerLines: Map<string, number> = new Map();

    pages.forEach((pageText, index) => {
      const lines = pageText.split('\n');
      // Top 10% of lines (headers)
      const headerCount = Math.max(1, Math.floor(lines.length * 0.1));
      for (let i = 0; i < headerCount; i++) {
        const line = lines[i]?.trim();
        if (line && line !== `--- PAGE ${index + 1} ---`) {
          headerLines.set(line, (headerLines.get(line) || 0) + 1);
        }
      }

      // Bottom 10% of lines (footers)
      const footerCount = Math.max(1, Math.floor(lines.length * 0.1));
      for (let i = lines.length - footerCount; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (line && line !== `--- PAGE ${index + 1} ---`) {
          footerLines.set(line, (footerLines.get(line) || 0) + 1);
        }
      }
    });

    // Identify lines that appear on >70% of pages
    const threshold = Math.ceil(pages.length * 0.7);
    const headerPatterns = Array.from(headerLines.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([line]) => line);
    const footerPatterns = Array.from(footerLines.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([line]) => line);

    // Remove header/footer patterns from pages
    return pages.map((pageText, index) => {
      const lines = pageText.split('\n');
      const filteredLines = lines.filter(line => {
        const trimmed = line.trim();
        // Keep page markers
        if (trimmed.startsWith('--- PAGE')) return true;
        // Remove common headers/footers
        return !headerPatterns.includes(trimmed) && !footerPatterns.includes(trimmed);
      });
      return filteredLines.join('\n');
    });
  };

  const extractPagesFromPdf = async (fileData: FileData): Promise<string[]> => {
    setLiveStatus({ message: 'Loading PDF...', detail: 'Connecting to PaddleOCR engine', isActive: true });

    // Check PaddleOCR availability first
    const ocrAvailable = await PaddleOcrService.checkAvailability();
    if (!ocrAvailable) {
      throw new Error('PaddleOCR service is not running. Please start it with: py -3.12 scripts/ocr_backend.py');
    }

    setLiveStatus({ message: 'Extracting text...', detail: 'GPU-accelerated OCR processing (this may take a moment for large PDFs)', isActive: true });
    setProgress(10);

    // Send the entire PDF to PaddleOCR for GPU-accelerated extraction
    const startTime = Date.now();
    const pages = await PaddleOcrService.processBase64Pdf(fileData.data, fileData.name || 'document.pdf');
    const extractionTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`PaddleOCR extracted ${pages.length} pages in ${extractionTime}s`);
    setProgress(35);

    // Remove headers and footers
    if (pages.length > 0) {
      setLiveStatus({ message: 'Cleaning text...', detail: 'Removing headers and footers', isActive: true });
      setProgress(36);
      const cleanedPages = removeHeadersFooters(pages);
      setProgress(40);
      setLiveStatus({ message: 'Extraction complete', detail: `Processed ${cleanedPages.length} pages in ${extractionTime}s (PaddleOCR)`, isActive: false });
      return cleanedPages;
    }

    return pages;
  };

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
        // Skip preprocessing - use raw text directly
        setProgress(15);
        setLiveStatus({ message: 'Processing Text...', detail: 'Using clean text (skipping preprocessing)', isActive: true });
        cleanedGeneral = general;
        cleanedParticular = particular;
        // Estimate clauses from raw text
        const generalEstimate = Math.max(1, Math.floor(general.length / 500));
        const particularEstimate = Math.max(1, Math.floor(particular.length / 500));
        totalEstimatedClauses = generalEstimate + particularEstimate;

        setPreprocessingInfo({
          generalFixes: 0,
          particularFixes: 0,
          estimatedClauses: totalEstimatedClauses,
          fixes: [],
          tokenInfo: {
            inputTokens: estimateTokens(cleanedGeneral) + estimateTokens(cleanedParticular),
            outputTokenLimit: CLAUDE_TOKEN_LIMITS.maxOutputTokens,
            totalTokenBudget: CLAUDE_TOKEN_LIMITS.totalBudget,
            usagePercentage: Math.min(100, Math.round(((estimateTokens(cleanedGeneral) + estimateTokens(cleanedParticular)) / CLAUDE_TOKEN_LIMITS.totalBudget) * 100))
          }
        });
      } else {
        // Preprocess both texts to fix PDF extraction errors
        setProgress(10);
        setLiveStatus({ message: 'Cleaning Text...', detail: 'Fixing PDF extraction errors', isActive: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        setProgress(15);
        setLiveStatus({ message: 'Processing Text...', detail: 'Analyzing General and Particular conditions', isActive: true });
        const preprocessedGeneral = preprocessText(general);
        const preprocessedParticular = preprocessText(particular);

        cleanedGeneral = preprocessedGeneral.cleaned;
        cleanedParticular = preprocessedParticular.cleaned;
        allFixes = [...preprocessedGeneral.fixes, ...preprocessedParticular.fixes];
        totalEstimatedClauses = preprocessedGeneral.estimatedClauses + preprocessedParticular.estimatedClauses;

        setProgress(25);
        setLiveStatus({ message: 'Detecting Clauses...', detail: 'Identifying clause boundaries', isActive: true });

        // Store preprocessing info for display
        const generalTokens = estimateTokens(cleanedGeneral);
        const particularTokens = estimateTokens(cleanedParticular);
        const totalInputTokens = generalTokens + particularTokens;
        const outputTokenLimit = CLAUDE_TOKEN_LIMITS.maxOutputTokens;
        const totalTokenBudget = CLAUDE_TOKEN_LIMITS.totalBudget;
        const usagePercentage = Math.min(100, Math.round((totalInputTokens / totalTokenBudget) * 100));

        setPreprocessingInfo({
          generalFixes: preprocessedGeneral.fixes.length,
          particularFixes: preprocessedParticular.fixes.length,
          estimatedClauses: totalEstimatedClauses,
          fixes: allFixes.slice(0, 10), // Show first 10 fixes as examples
          tokenInfo: {
            inputTokens: totalInputTokens,
            outputTokenLimit: outputTokenLimit,
            totalTokenBudget: totalTokenBudget,
            usagePercentage: usagePercentage
          }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Calculate token usage
      const generalTokens = estimateTokens(cleanedGeneral);
      const particularTokens = estimateTokens(cleanedParticular);
      const totalInputTokens = generalTokens + particularTokens;

      // Check if text needs chunking
      const MAX_CHARS_PER_CHUNK = 100000;
      const MAX_TOKENS_PER_CHUNK = 50000; // Force chunking for large requests
      const needsChunking =
        cleanedGeneral.length > MAX_CHARS_PER_CHUNK ||
        cleanedParticular.length > MAX_CHARS_PER_CHUNK ||
        totalInputTokens > MAX_TOKENS_PER_CHUNK;

      if (!needsChunking) {
        // Process directly with cleaned text
        setBatchInfo({ current: 1, total: 1 });
        setProgress(40);
        setLiveStatus({ message: 'Connecting to AI...', detail: 'Sending request to Claude API', isActive: true });

        const input: DualSourceInput = {
          general: cleanedGeneral,
          particular: cleanedParticular,
          skipCleaning: skipTextCleaning
        };

        // Start a heartbeat to show activity
        let dotCount = 0;
        const heartbeatInterval = setInterval(() => {
          dotCount = (dotCount + 1) % 4;
          const dots = '.'.repeat(dotCount);
          setLiveStatus(prev => ({
            message: prev.message,
            detail: prev.detail.replace(/\.+$/, '') + dots,
            isActive: true
          }));
        }, 2000);

        try {
          setProgress(45);
          setLiveStatus({ message: 'AI Processing...', detail: 'Claude is analyzing your contract', isActive: true });

          // Create timeout wrapper
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              clearInterval(heartbeatInterval);
              reject(new Error('Request timeout: API call took too long. The text might be too large.'));
            }, 300000); // 5 minute timeout
          });

          // Race between API call and timeout
          const apiCall = analyzeContract(input);

          // More detailed status updates during API wait
          const statusPhases = [
            { message: 'AI Processing...', detail: 'Sending request to Claude API' },
            { message: 'AI Processing...', detail: 'Claude is analyzing your contract' },
            { message: 'AI Processing...', detail: 'Extracting clauses verbatim...' },
            { message: 'AI Processing...', detail: 'Processing General and Particular conditions...' },
            { message: 'AI Processing...', detail: 'Identifying clause boundaries...' },
            { message: 'AI Processing...', detail: 'Validating text integrity...' }
          ];
          let phaseIndex = 0;

          const statusUpdateInterval = setInterval(() => {
            phaseIndex = (phaseIndex + 1) % statusPhases.length;
            setLiveStatus(statusPhases[phaseIndex]);
          }, 2500); // Update every 2.5 seconds

          // Update progress periodically while waiting
          const progressInterval = setInterval(() => {
            setProgress(prev => {
              if (prev < 85) return prev + 1;
              return prev;
            });
          }, 3000); // Update every 3 seconds

          const result = await Promise.race([apiCall, timeoutPromise]);

          clearInterval(heartbeatInterval);
          clearInterval(progressInterval);
          clearInterval(statusUpdateInterval);

          // Receiving response
          setProgress(87);
          setLiveStatus({ message: 'Receiving Response...', detail: 'Processing Claude\'s response', isActive: true });
          await new Promise(resolve => setTimeout(resolve, 300));

          // Parsing JSON
          setProgress(90);
          setLiveStatus({ message: 'Parsing Results...', detail: `Extracted ${result.length} clauses, validating structure...`, isActive: true });
          await new Promise(resolve => setTimeout(resolve, 200));

          // Finalizing
          setProgress(93);
          setLiveStatus({ message: 'Finalizing...', detail: 'Processing extracted clauses', isActive: true });

          finalizeAnalysis(result);
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
        // Split into chunks and process
        const gChunks = splitTextIntoChunks(cleanedGeneral, MAX_CHARS_PER_CHUNK);
        const pChunks = splitTextIntoChunks(cleanedParticular, MAX_CHARS_PER_CHUNK);
        const maxChunks = Math.max(gChunks.length, pChunks.length);

        setBatchInfo({ current: 0, total: maxChunks });
        setProgress(40);
        setLiveStatus({ message: `Processing ${maxChunks} chunks...`, detail: 'Splitting large text for analysis', isActive: true });

        const allResults: Clause[] = [];

        // Process chunks sequentially to maintain order
        for (let i = 0; i < maxChunks; i++) {
          const gChunk = gChunks[i] || '';
          const pChunk = pChunks[i] || '';

          if (gChunk || pChunk) {
            setBatchInfo({ current: i + 1, total: maxChunks });
            setProgress(40 + Math.floor((i / maxChunks) * 50));

            // Step 1: Preparing chunk
            setLiveStatus({
              message: `Chunk ${i + 1}/${maxChunks}`,
              detail: 'Preparing chunk data for analysis',
              isActive: true
            });
            await new Promise(resolve => setTimeout(resolve, 300));

            // Step 2: Sending to API
            setLiveStatus({
              message: `Chunk ${i + 1}/${maxChunks}`,
              detail: 'Sending request to Claude API...',
              isActive: true
            });

            // Step 3: Create API call with progress updates
            const apiCallPromise = analyzeContract({
              general: gChunk,
              particular: pChunk,
              skipCleaning: skipTextCleaning
            });

            // Show waiting status with rotating messages
            const statusMessages = [
              'Waiting for Claude to process...',
              'Claude is analyzing your text...',
              'Extracting clauses from chunk...',
              'Processing verbatim content...'
            ];
            let statusIndex = 0;
            const statusInterval = setInterval(() => {
              statusIndex = (statusIndex + 1) % statusMessages.length;
              setLiveStatus({
                message: `Chunk ${i + 1}/${maxChunks}`,
                detail: statusMessages[statusIndex],
                isActive: true
              });
            }, 2000);

            try {
              const result = await apiCallPromise;
              clearInterval(statusInterval);

              // Step 4: Receiving response
              setLiveStatus({
                message: `Chunk ${i + 1}/${maxChunks}`,
                detail: 'Received response from Claude',
                isActive: true
              });
              await new Promise(resolve => setTimeout(resolve, 200));

              // Step 5: Parsing results
              setLiveStatus({
                message: `Chunk ${i + 1}/${maxChunks}`,
                detail: `Parsing ${result.length} extracted clauses...`,
                isActive: true
              });
              await new Promise(resolve => setTimeout(resolve, 200));

              // Step 6: Validating
              setLiveStatus({
                message: `Chunk ${i + 1}/${maxChunks}`,
                detail: 'Validating clause integrity...',
                isActive: true
              });

              allResults.push(...result);

              // Step 7: Complete
              const generalCount = result.filter(c => c.condition_type === 'General').length;
              const particularCount = result.filter(c => c.condition_type === 'Particular').length;
              setLiveStatus({
                message: `Chunk ${i + 1}/${maxChunks} complete`,
                detail: `✓ Extracted ${result.length} clauses (${generalCount} General, ${particularCount} Particular)`,
                isActive: true
              });
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
              clearInterval(statusInterval);
              throw err;
            }
          }
        }

        // Enhanced finalization steps
        setLiveStatus({ message: 'Finalizing...', detail: 'Merging all chunks together', isActive: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        setLiveStatus({ message: 'Finalizing...', detail: 'Removing duplicate clauses', isActive: true });
        const deduplicated = deduplicateClauses(allResults);

        setLiveStatus({ message: 'Finalizing...', detail: `Validating ${deduplicated.length} unique clauses`, isActive: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        setProgress(95);
        setLiveStatus({ message: 'Finalizing...', detail: 'Preparing final results', isActive: true });
        await new Promise(resolve => setTimeout(resolve, 200));

        finalizeAnalysis(deduplicated);
        setProgress(100);
        setLiveStatus({ message: 'Complete!', detail: `✓ Successfully extracted ${deduplicated.length} unique clauses`, isActive: false });
      }
    } catch (err: any) {
      setError(err.message);
      setStatus(AnalysisStatus.ERROR);
      setLiveStatus({ message: 'Error', detail: err.message || 'Unknown error', isActive: false });
    }
  };

  const handlePdfAnalysis = async (input: FileData | DualSourceInput) => {
    setStatus(AnalysisStatus.ANALYZING);
    setError(null);
    setProgress(5);
    let allExtractedClauses: Clause[] = [];
    try {
      if ('data' in input) {
        // extractPagesFromPdf handles progress 5-40% internally
        const pages = await extractPagesFromPdf(input as FileData);
        setBatchInfo({ current: 0, total: pages.length });
        setLiveStatus({ message: 'Analyzing clauses...', detail: `Processing ${pages.length} pages`, isActive: true });

        // Continue from 40% (extraction complete) to 95% (analysis)
        const analysisStartProgress = 40;
        const analysisEndProgress = 95;

        for (let i = 0; i < pages.length; i++) {
          setBatchInfo({ current: i + 1, total: pages.length });
          const result = await analyzeContract(pages[i]);
          allExtractedClauses = [...allExtractedClauses, ...result];
          // Deduplicate after each page to prevent accumulation of duplicates
          allExtractedClauses = deduplicateClauses(allExtractedClauses);

          // Progress from 40% to 95% based on page analysis
          const progressPercent = analysisStartProgress + Math.floor(((i + 1) / pages.length) * (analysisEndProgress - analysisStartProgress));
          setProgress(progressPercent);
          setLiveStatus({
            message: 'Analyzing clauses...',
            detail: `Processing page ${i + 1} of ${pages.length}`,
            isActive: true
          });
        }
      } else {
        // Dual source PDFs
        setLiveStatus({ message: 'Loading PDFs...', detail: 'Loading General and Particular PDFs', isActive: true });

        // extractPagesFromPdf handles progress 5-40% internally, but we have 2 PDFs
        // Split progress: 5-22.5% for general, 22.5-40% for particular
        setProgress(5);
        const gPages = await extractPagesFromPdf(input.general as FileData);
        setProgress(22);

        setLiveStatus({ message: 'Loading PDFs...', detail: 'Loading Particular PDF', isActive: true });
        const pPages = await extractPagesFromPdf(input.particular as FileData);
        setProgress(40);

        const maxPages = Math.max(gPages.length, pPages.length);
        setBatchInfo({ current: 0, total: Math.ceil(maxPages / 2) });
        setLiveStatus({ message: 'Analyzing clauses...', detail: 'Comparing General and Particular conditions', isActive: true });

        // Continue from 40% to 95%
        const analysisStartProgress = 40;
        const analysisEndProgress = 95;
        const batchCount = Math.ceil(maxPages / 2);

        for (let b = 0; b < batchCount; b++) {
          setBatchInfo({ current: b + 1, total: batchCount });
          const gChunk = gPages.slice(b * 2, (b + 1) * 2).join("\n\n");
          const pChunk = pPages.slice(b * 2, (b + 1) * 2).join("\n\n");
          const result = await analyzeContract({ general: gChunk, particular: pChunk });
          allExtractedClauses = [...allExtractedClauses, ...result];
          // Deduplicate after each batch to prevent accumulation of duplicates
          allExtractedClauses = deduplicateClauses(allExtractedClauses);

          const progressPercent = analysisStartProgress + Math.floor(((b + 1) / batchCount) * (analysisEndProgress - analysisStartProgress));
          setProgress(progressPercent);
          setLiveStatus({
            message: 'Analyzing clauses...',
            detail: `Processing batch ${b + 1} of ${batchCount}`,
            isActive: true
          });
        }
      }
      setProgress(95);
      finalizeAnalysis(allExtractedClauses);
    } catch (err: any) {
      setError(err.message);
      setStatus(AnalysisStatus.ERROR);
      setLiveStatus({ message: 'Error', detail: err.message || 'Unknown error', isActive: false });
    }
  };

  const finalizeAnalysis = async (allExtractedClauses: Clause[]) => {
    // Build a Set of all available clause IDs for link validation
    const availableClauseIds = new Set<string>(
      allExtractedClauses.map(c => normalizeClauseId(c.clause_number))
    );

    const processedClauses = allExtractedClauses.map(c => ({
      ...c,
      clause_text: linkifyText(c.clause_text, availableClauseIds),
      general_condition: linkifyText(c.general_condition, availableClauseIds),
      particular_condition: linkifyText(c.particular_condition, availableClauseIds)
    }));
    // Deduplicate clauses before sorting
    const deduplicated = deduplicateClauses(processedClauses);
    const sorted = deduplicated.sort((a, b) => {
      // Enhanced parsing to handle alphanumeric clause numbers like "2A.1", "3B.2.1"
      const parse = (s: string) => {
        return s.split('.').map(x => {
          // Try to parse as number first, if it contains letters, compare as string
          const num = parseInt(x);
          if (!isNaN(num) && x === num.toString()) {
            return { type: 'number', value: num, str: x };
          }
          return { type: 'string', value: 0, str: x };
        });
      };
      const aP = parse(a.clause_number);
      const bP = parse(b.clause_number);
      for (let i = 0; i < Math.max(aP.length, bP.length); i++) {
        const aPart = aP[i] || { type: 'number', value: 0, str: '' };
        const bPart = bP[i] || { type: 'number', value: 0, str: '' };

        // If both are numbers, compare numerically
        if (aPart.type === 'number' && bPart.type === 'number') {
          if (aPart.value !== bPart.value) return aPart.value - bPart.value;
        } else {
          // Mixed or string comparison - compare as strings
          const aStr = aPart.str.toLowerCase();
          const bStr = bPart.str.toLowerCase();
          if (aStr !== bStr) {
            // If one starts with number and other doesn't, number comes first
            const aNum = parseInt(aStr);
            const bNum = parseInt(bStr);
            if (!isNaN(aNum) && isNaN(bNum)) return -1;
            if (isNaN(aNum) && !isNaN(bNum)) return 1;
            // Otherwise compare alphabetically
            return aStr.localeCompare(bStr);
          }
        }
      }
      return 0;
    });
    // Reprocess clause links before setting
    setClauses(reprocessClauseLinks(sorted));
    const first = sorted.find(c => c.clause_title && c.clause_title !== 'Untitled');
    const detectedName = first?.clause_title || `Analysis ${new Date().toLocaleDateString()}`;
    setProjectName(detectedName);
    const newId = crypto.randomUUID();
    setActiveContractId(newId);

    // Create contract with sections
    const contractWithSections = ensureContractHasSections({
      id: newId,
      name: detectedName,
      timestamp: Date.now(),
      clauses: sorted,
      metadata: {
        totalClauses: sorted.length,
        generalCount: sorted.filter(c => c.condition_type === 'General').length,
        particularCount: sorted.filter(c => c.condition_type === 'Particular').length,
        highRiskCount: 0,
        conflictCount: sorted.filter(c => c.comparison && c.comparison.length > 0).length,
        timeSensitiveCount: sorted.filter(c => c.time_frames && c.time_frames.length > 0).length
      }
    });
    setContract(contractWithSections);

    await persistCurrentProject(sorted, detectedName, true); // Immediate save after analysis

    // Generate category suggestions
    if (sorted.length > 0) {
      setLiveStatus({ message: 'Generating Category Suggestions...', detail: 'Analyzing clauses for categorization', isActive: true });
      try {
        const suggestions = await suggestCategories(sorted);
        if (suggestions.length > 0) {
          setCategorySuggestions(suggestions);
          setShowCategorySuggestions(true);
        }
      } catch (error) {
        console.error('Failed to generate category suggestions:', error);
        // Don't block completion if suggestions fail
      }
    }

    setProgress(100);
    setTimeout(() => setStatus(AnalysisStatus.COMPLETED), 600);
  };

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

  const handleReorder = async (fromIndex: number, toIndex: number, sectionType?: SectionType) => {
    if (!contract) return;

    const contractWithSections = ensureContractHasSections(contract);

    if (sectionType) {
      // Reorder within specific section
      const section = contractWithSections.sections?.find(s => s.sectionType === sectionType);
      if (section) {
        const updatedItems = [...section.items];
        const [moved] = updatedItems.splice(fromIndex, 1);
        updatedItems.splice(toIndex, 0, moved);
        updatedItems.forEach((item, i) => {
          item.orderIndex = i;
        });

        const updatedSections = contractWithSections.sections!.map(s =>
          s.sectionType === sectionType ? { ...s, items: updatedItems } : s
        );

        const updatedContract: SavedContract = {
          ...contractWithSections,
          sections: updatedSections,
          clauses: getAllClausesFromContract({ ...contractWithSections, sections: updatedSections })
        };

        setContract(updatedContract);
        setClauses(reprocessClauseLinks(updatedContract.clauses || []));
        await performSaveContract(updatedContract);
      }
    } else {
      // Legacy: reorder clauses array
      const newClauses = [...clauses];
      const [movedItem] = newClauses.splice(fromIndex, 1);
      newClauses.splice(toIndex, 0, movedItem);
      setClauses(reprocessClauseLinks(newClauses));
      persistCurrentProject(newClauses);
    }
  };

  // Enhanced search function that supports multiple keywords and searches all text fields
  const matchesSearchKeywords = (clause: Clause, keywords: string[]): boolean => {
    if (keywords.length === 0) return true;

    // Combine all searchable text fields
    const searchableText = [
      clause.clause_number,
      clause.clause_title,
      clause.clause_text,
      clause.general_condition || '',
      clause.particular_condition || ''
    ].join(' ').toLowerCase();

    // Check if all keywords are found in the combined text
    return keywords.every(keyword => searchableText.includes(keyword.toLowerCase()));
  };

  const filteredClauses = clauses.filter(c => {
    // Split search filter into keywords (space-separated)
    const keywords = searchFilter.trim().split(/\s+/).filter(k => k.length > 0);
    const matchesSearch = searchFilter === '' || matchesSearchKeywords(c, keywords);
    const matchesType = selectedTypes.includes(c.condition_type);
    const matchesGroup = !selectedGroup || (selectedGroup === 'Other' && !/^[A-Za-z0-9]+/.test(String(c.clause_number))) || String(c.clause_number).startsWith(selectedGroup);
    return matchesSearch && matchesType && matchesGroup;
  });

  // Sort clauses based on sortMode
  const sortedClauses = useMemo(() => {
    if (sortMode === 'status') {
      const statusOrder = { 'added': 0, 'modified': 1, 'gc-only': 2 };
      return [...filteredClauses].sort((a, b) => {
        const statusDiff = statusOrder[getClauseStatus(a)] - statusOrder[getClauseStatus(b)];
        if (statusDiff !== 0) return statusDiff;
        // Secondary sort by clause number within same status
        const numA = parseFloat(a.clause_number) || 0;
        const numB = parseFloat(b.clause_number) || 0;
        return numA - numB;
      });
    }
    if (sortMode === 'chapter') {
      return [...filteredClauses].sort((a, b) => {
        // Sort by clause number numerically/alphanumerically
        const numA = parseFloat(a.clause_number) || 0;
        const numB = parseFloat(b.clause_number) || 0;
        if (numA !== numB) return numA - numB;
        return a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true });
      });
    }
    return filteredClauses;
  }, [filteredClauses, sortMode]);

  const goBackToInput = () => {
    setStatus(AnalysisStatus.IDLE);
    setClauses([]);
    setActiveContractId(null);
    setLiveStatus({ message: '', detail: '', isActive: false });
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1A2333',
            border: '1px solid #D1D9E6',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <AppWrapper onToggleBot={() => setIsBotOpen(!isBotOpen)} isBotOpen={isBotOpen}>
        <div className="min-h-screen flex flex-col">
          <input
            type="file"
            ref={importBackupRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />

          <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-surface-border px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer" onClick={goBackToInput}>
              <div className="w-10 h-10 bg-mac-blue rounded-mac-xs flex items-center justify-center">
                <span className="text-white font-bold text-sm">AAA</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-mac-navy">Contract Department</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {status === AnalysisStatus.COMPLETED && (
                <>
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 bg-white border border-surface-border rounded-mac-xs hover:border-mac-blue transition-all group"
                    title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                  >
                    {isSidebarOpen ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-mac-muted group-hover:text-mac-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-mac-muted group-hover:text-mac-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={smartSearchQuery}
                        onChange={(e) => setSmartSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && smartSearchClauses(smartSearchQuery)}
                        placeholder="Search clauses..."
                        className="w-72 px-4 py-2 bg-white border border-surface-border rounded-mac-sm text-sm focus:border-mac-blue focus:shadow-mac-focus outline-none transition-all"
                      />
                      <button
                        onClick={() => smartSearchClauses(smartSearchQuery)}
                        disabled={isSearching}
                        className="absolute right-1.5 p-1.5 bg-mac-blue text-white rounded-md hover:bg-mac-blue-hover transition-colors disabled:bg-mac-muted"
                      >
                        {isSearching ? (
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-mac-blue text-white rounded-mac-sm text-sm font-medium hover:bg-mac-blue-hover transition-all active:scale-[0.98]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Clause
                    </button>
                  </div>
                </>
              )}

              <button onClick={() => setStatus(AnalysisStatus.LIBRARY)} className="flex items-center gap-3 px-5 py-2.5 bg-white border border-aaa-border rounded-xl shadow-sm hover:shadow-md transition-all group">
                <span className="text-[10px] font-black uppercase tracking-widest text-aaa-muted group-hover:text-aaa-blue">Archive</span>
                <span className="w-6 h-6 bg-aaa-bg rounded-lg flex items-center justify-center text-[10px] font-black text-aaa-blue border border-aaa-blue/10">{library.length}</span>
              </button>

              {/* Admin Editor Link - Only visible to admins */}
              {isAdmin() && (
                <a
                  href="#/admin/contract-editor"
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl shadow-sm hover:shadow-md hover:bg-amber-100 transition-all group"
                  title="Open Admin Contract Editor"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Admin</span>
                </a>
              )}
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
            {status === AnalysisStatus.COMPLETED && isSidebarOpen && (
              <CategoryLedger
                contractId={contract?.id || null}
                searchQuery={searchFilter}
                onSearchChange={setSearchFilter}
              />
            )}

            <main className={`flex-1 overflow-y-auto px-6 py-6 custom-scrollbar transition-all ${status !== AnalysisStatus.COMPLETED ? 'max-w-7xl mx-auto' : status === AnalysisStatus.COMPLETED && isSidebarOpen ? 'lg:ml-80' : ''}`}>
              {status === AnalysisStatus.IDLE && (
                <div className="space-y-16 animate-in fade-in duration-1000">
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
                          <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], handlePdfAnalysis)} />
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
                                onClick={async () => {
                                  if (textToFix.trim()) {
                                    if (useAICleaning) {
                                      // AI-powered cleaning
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
                                                isActive: true
                                              });
                                            } else {
                                              setLiveStatus({
                                                message: total > 1 ? `Preparing chunk ${current + 1} of ${total}...` : 'Processing with AI...',
                                                detail: total > 1 ? 'Analyzing text structure' : 'Cleaning contract text',
                                                isActive: true
                                              });
                                            }
                                          }
                                        );
                                        setAiCleanedText(cleaned);
                                        setFixedText({
                                          cleaned: cleaned,
                                          fixes: [],
                                          removedLines: 0,
                                          corruptedLines: []
                                        });
                                        setShowCorruptionReview(false);
                                        setProgress(100);
                                        setLiveStatus({
                                          message: 'Complete!',
                                          detail: 'All clauses processed successfully',
                                          isActive: false
                                        });
                                      } catch (error: any) {
                                        setError(error.message || 'AI cleaning failed');
                                        setLiveStatus({
                                          message: 'Error',
                                          detail: error.message || 'Unknown error',
                                          isActive: false
                                        });
                                      } finally {
                                        setIsAICleaning(false);
                                      }
                                    } else {
                                      // Standard preprocessing
                                      const corrupted = detectCorruptedLines(textToFix);
                                      if (corrupted.length > 0) {
                                        // Show review step
                                        const result = preprocessText(textToFix, []);
                                        setFixedText({
                                          cleaned: result.cleaned,
                                          fixes: result.fixes,
                                          removedLines: 0,
                                          corruptedLines: result.corruptedLines
                                        });
                                        setLinesToRemove(new Set());
                                        setCurrentCorruptionIndex(0);
                                        setShowCorruptionReview(true);
                                      } else {
                                        // No corrupted lines, process directly
                                        const result = preprocessText(textToFix, []);
                                        setFixedText({
                                          cleaned: result.cleaned,
                                          fixes: result.fixes,
                                          removedLines: 0,
                                          corruptedLines: []
                                        });
                                        setShowCorruptionReview(false);
                                      }
                                    }
                                  }
                                }}
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

                            {/* Live Status Display for AI Cleaning */}
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

                                {/* Progress Bar */}
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

                          {/* Corruption Review Modal - List View */}
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

                              {/* Selection Summary */}
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

                              {/* List of Corrupted Lines */}
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

                              {/* Action Buttons */}
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
                                    // Apply removal and finalize
                                    const result = preprocessText(textToFix, Array.from(linesToRemove));
                                    setFixedText({
                                      cleaned: result.cleaned,
                                      fixes: result.fixes,
                                      removedLines: result.removedLines,
                                      corruptedLines: []
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
                              {/* Fixed Text Output */}
                              <div className="bg-white p-8 rounded-3xl border border-aaa-border shadow-premium border-t-4 border-t-green-500">
                                <div className="flex justify-between items-center mb-6">
                                  <h3 className="font-extrabold text-xl text-green-600">Fixed Text</h3>
                                  <button
                                    onClick={(e) => {
                                      navigator.clipboard.writeText(fixedText.cleaned);
                                      // Show feedback
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

                              {/* Fixes Applied */}
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
              )}

              {status === AnalysisStatus.ANALYZING && (
                <div className="flex flex-col items-center justify-center py-40 space-y-12 text-center max-w-2xl mx-auto">
                  <div className="w-full space-y-6">
                    <div className="flex justify-between items-end">
                      <div className="text-left">
                        {inputMode !== 'text' && (
                          <p className="text-[10px] font-black text-aaa-blue uppercase tracking-[0.4em] mb-1">Batch {batchInfo.current} / {batchInfo.total}</p>
                        )}
                        <h3 className="text-3xl font-black text-aaa-blue tracking-tighter">{activeStage.label}</h3>
                      </div>
                      <span className="text-4xl font-black text-aaa-blue mono">{progress}%</span>
                    </div>
                    <div className="w-full h-4 bg-aaa-bg rounded-full overflow-hidden p-1 border border-aaa-border shadow-inner">
                      <div className="h-full bg-gradient-to-r from-aaa-blue to-aaa-accent rounded-full transition-all duration-300 shadow-lg relative" style={{ width: `${progress}%` }}>
                        <div className="absolute inset-0 bg-white/20 shimmer" />
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-aaa-muted uppercase tracking-widest">{activeStage.sub}</p>

                    {/* Live Status Indicator */}
                    {liveStatus.message && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 shadow-md">
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

                        {/* Process Timeline for Chunks */}
                        {batchInfo.total > 1 && (
                          <div className="mt-3 pt-3 border-t border-cyan-200">
                            <div className="flex gap-2">
                              {Array.from({ length: batchInfo.total }).map((_, idx) => (
                                <div
                                  key={idx}
                                  className={`flex-1 h-1.5 rounded-full transition-all ${idx < batchInfo.current
                                    ? 'bg-green-400'
                                    : idx === batchInfo.current - 1
                                      ? 'bg-cyan-500 animate-pulse'
                                      : 'bg-cyan-200'
                                    }`}
                                />
                              ))}
                            </div>
                            <p className="text-[10px] text-cyan-600 mt-1.5 text-center">
                              {batchInfo.current} of {batchInfo.total} chunks processed
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Preprocessing Information Display */}
                    {preprocessingInfo && (
                      <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-lg">
                        <div className="text-left space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold text-aaa-blue">Text Preprocessing Complete</h4>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                                {preprocessingInfo.generalFixes + preprocessingInfo.particularFixes} fixes applied
                              </span>
                              {preprocessingInfo.estimatedClauses > 0 && (
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                                  ~{preprocessingInfo.estimatedClauses} clauses detected
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-3 bg-white/60 rounded-lg">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">General Text</p>
                              <p className="text-sm font-bold text-aaa-blue">{preprocessingInfo.generalFixes} issues fixed</p>
                            </div>
                            <div className="p-3 bg-white/60 rounded-lg">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Particular Text</p>
                              <p className="text-sm font-bold text-aaa-blue">{preprocessingInfo.particularFixes} issues fixed</p>
                            </div>
                          </div>

                          {/* Token Usage Display */}
                          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-bold text-purple-700">Token Usage</h5>
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${preprocessingInfo.tokenInfo.usagePercentage < 50
                                ? 'bg-green-100 text-green-700'
                                : preprocessingInfo.tokenInfo.usagePercentage < 80
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                                }`}>
                                {preprocessingInfo.tokenInfo.usagePercentage}% of budget
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">Input Tokens (Estimated):</span>
                                <span className="font-mono font-bold text-purple-700">
                                  {preprocessingInfo.tokenInfo.inputTokens.toLocaleString()} / {preprocessingInfo.tokenInfo.totalTokenBudget.toLocaleString()}
                                </span>
                              </div>
                              <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${preprocessingInfo.tokenInfo.usagePercentage < 50
                                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                                    : preprocessingInfo.tokenInfo.usagePercentage < 80
                                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                      : 'bg-gradient-to-r from-red-400 to-red-500'
                                    }`}
                                  style={{ width: `${preprocessingInfo.tokenInfo.usagePercentage}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-xs mt-2">
                                <span className="text-gray-600">Output Token Limit:</span>
                                <span className="font-mono font-bold text-indigo-700">
                                  {preprocessingInfo.tokenInfo.outputTokenLimit.toLocaleString()} tokens
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-500 mt-1">
                                Model: Claude Sonnet 4.5 • Context Window: {preprocessingInfo.tokenInfo.totalTokenBudget.toLocaleString()} tokens
                              </div>
                            </div>
                          </div>

                          {preprocessingInfo.fixes.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Sample Fixes Applied:</p>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {preprocessingInfo.fixes.map((fix, idx) => (
                                  <div key={idx} className="text-xs p-2 bg-white/80 rounded border border-blue-100">
                                    <span className="font-mono text-red-600 line-through mr-2">{fix.original}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-mono text-green-600 ml-2">{fix.fixed}</span>
                                    <span className="text-gray-500 ml-2 text-[10px]">({fix.reason})</span>
                                  </div>
                                ))}
                              </div>
                              {preprocessingInfo.generalFixes + preprocessingInfo.particularFixes > 10 && (
                                <p className="text-xs text-gray-500 mt-2">
                                  +{preprocessingInfo.generalFixes + preprocessingInfo.particularFixes - 10} more fixes...
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {status === AnalysisStatus.ERROR && (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-8 animate-in fade-in">
                  <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center border border-red-100 shadow-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <h3 className="text-3xl font-black text-aaa-blue">Process Stalled</h3>
                  <p className="text-aaa-muted max-w-md mx-auto">{error}</p>
                  <div className="flex gap-4">
                    <button onClick={goBackToInput} className="px-12 py-4 bg-aaa-blue text-white rounded-2xl font-black">Restart Extraction</button>
                  </div>
                </div>
              )}

              {status === AnalysisStatus.COMPLETED && (
                <div className="space-y-16 animate-in slide-in-from-bottom-12 pb-20">
                  <div className="flex flex-col gap-6 border-b border-aaa-border pb-12">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          onBlur={() => persistCurrentProject()}
                          className="text-7xl font-black text-aaa-blue bg-transparent border-none focus:ring-0 w-full tracking-tighter hover:bg-aaa-bg/50 rounded-2xl transition-all cursor-text outline-none"
                          placeholder="Enter Project Name..."
                        />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3">
                          {isSaving && (
                            <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Session Sync
                            </span>
                          )}
                          <span className="text-[10px] font-black text-aaa-muted uppercase tracking-widest opacity-40">Matrix v2.6.0</span>
                        </div>
                        <p className="text-aaa-muted text-[10px] font-bold uppercase tracking-[0.2em]">{clauses.length} Verbatim Data Nodes</p>
                      </div>
                    </div>
                  </div>

                  <React.Suspense fallback={<div className="h-64 flex items-center justify-center bg-aaa-bg/30 rounded-3xl border border-aaa-border animate-pulse"><p className="text-xs font-black uppercase tracking-[0.2em] text-aaa-muted">Loading Analytics...</p></div>}>
                    <Dashboard clauses={clauses} />
                  </React.Suspense>

                  {(searchResults || searchError || isSearching) && (
                    <div className="bg-white p-10 rounded-[32px] border border-aaa-blue/10 shadow-premium animate-in slide-in-from-bottom-6">
                      <div className="flex items-center justify-between mb-8 border-b border-aaa-border pb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-aaa-blue rounded-xl flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <h3 className="text-2xl font-black text-aaa-blue tracking-tighter">Smart Search Results</h3>
                        </div>
                        <button
                          onClick={() => { setSearchResults(null); setSmartSearchQuery(''); }}
                          className="text-[10px] font-black text-aaa-muted uppercase tracking-widest hover:text-red-500 transition-colors"
                        >
                          Clear Results
                        </button>
                      </div>

                      {isSearching && (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-aaa-muted">
                          <div className="w-8 h-8 border-4 border-aaa-blue border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs font-black uppercase tracking-[0.3em]">Querying Semantic Matrix...</p>
                        </div>
                      )}

                      {!isSearching && searchResults && searchResults.length > 0 && (
                        <div className="space-y-4">
                          {searchResults.map((res) => (
                            <div
                              key={res.clause_id}
                              onClick={() => onOpenClause(res.clause_number)}
                              className="group p-6 bg-aaa-bg/30 border border-aaa-border rounded-2xl hover:border-aaa-blue hover:bg-white hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                            >
                              <div className="absolute right-0 top-0 h-full w-1 bg-aaa-blue transform translate-x-full group-hover:translate-x-0 transition-transform" />
                              <div className="flex items-start justify-between gap-6">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-aaa-blue mono">C.{res.clause_number}</span>
                                    <h4 className="text-lg font-black text-aaa-text tracking-tight group-hover:text-aaa-blue transition-colors">{res.title}</h4>
                                  </div>
                                  <p className="text-[11px] font-bold text-aaa-muted leading-relaxed italic">" {res.reason} "</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] font-black text-aaa-blue opacity-30 uppercase tracking-widest mb-1">Relevance</div>
                                  <div className="text-2xl font-black text-aaa-blue tracking-tighter">{(res.relevance_score * 100).toFixed(0)}%</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contract Documents Tabs */}
                  {contract ? (
                    <ContractSectionsTabs
                      contract={contract}
                      onUpdate={async (updatedContract) => {
                        // Update local state immediately for responsive UI (no auto-save)
                        // Reprocess clause links to ensure internal references work
                        setContract(updatedContract);
                        setClauses(getClausesWithProcessedLinks(updatedContract));
                      }}
                      onSave={async (updatedContract) => {
                        // Explicit save when Save button is clicked
                        await performSaveContract(updatedContract);
                      }}
                      onEditClause={handleEditClause}
                      onCompareClause={setCompareClause}
                      onDeleteClause={handleDeleteClause}
                      onReorderClause={handleReorder}
                      onAddClause={() => setIsAddModalOpen(true)}
                      sortMode={sortMode}
                      onSortModeChange={setSortMode}
                    />
                  ) : clauses.length > 0 ? (
                    // Fallback: if contract not set but clauses exist, create contract
                    (() => {
                      const fallbackContract = ensureContractHasSections({
                        id: activeContractId || crypto.randomUUID(),
                        name: projectName || "Untitled Contract",
                        timestamp: Date.now(),
                        clauses,
                        metadata: {
                          totalClauses: clauses.length,
                          generalCount: clauses.filter(c => c.condition_type === 'General').length,
                          particularCount: clauses.filter(c => c.condition_type === 'Particular').length,
                          highRiskCount: 0,
                          conflictCount: clauses.filter(c => c.comparison && c.comparison.length > 0).length,
                          timeSensitiveCount: clauses.filter(c => c.time_frames && c.time_frames.length > 0).length
                        }
                      });
                      setContract(fallbackContract);
                      return (
                        <React.Suspense fallback={<div className="py-20 flex flex-col items-center justify-center gap-4 text-aaa-muted"><div className="w-8 h-8 border-4 border-aaa-blue border-t-transparent rounded-full animate-spin" /><p className="text-xs font-black uppercase tracking-[0.3em]">Opening Contract Structure...</p></div>}>
                          <ContractSectionsTabs
                            contract={fallbackContract}
                            onUpdate={async (updatedContract) => {
                              setContract(updatedContract);
                              setClauses(getClausesWithProcessedLinks(updatedContract));
                            }}
                            onSave={async (updatedContract) => {
                              await performSaveContract(updatedContract);
                            }}
                            onEditClause={handleEditClause}
                            onCompareClause={setCompareClause}
                            onDeleteClause={handleDeleteClause}
                            onReorderClause={handleReorder}
                            onAddClause={() => setIsAddModalOpen(true)}
                            sortMode={sortMode}
                            onSortModeChange={setSortMode}
                          />
                        </React.Suspense>
                      );
                    })()
                  ) : (
                    <div className="bg-white border border-aaa-border rounded-3xl p-16 text-center">
                      <p className="text-aaa-muted font-semibold">No contract data available</p>
                    </div>
                  )}

                  {/* Legacy View Toggle - Removed, replaced by ContractSectionsTabs */}
                  {false && (
                    <div className="space-y-12 max-w-[1400px] mx-auto">
                      {(() => {
                        // Group clauses by chapter
                        const chaptersMap = new Map<string, Clause[]>();
                        const unassigned: Clause[] = [];

                        filteredClauses.forEach(clause => {
                          if (clause.chapter) {
                            if (!chaptersMap.has(clause.chapter)) {
                              chaptersMap.set(clause.chapter, []);
                            }
                            chaptersMap.get(clause.chapter)!.push(clause);
                          } else {
                            unassigned.push(clause);
                          }
                        });

                        // Sort chapters
                        const sortedChapters = Array.from(chaptersMap.entries()).sort((a, b) => {
                          const aNum = parseInt(a[0]);
                          const bNum = parseInt(b[0]);
                          if (!isNaN(aNum) && !isNaN(bNum)) {
                            return aNum - bNum;
                          }
                          if (!isNaN(aNum) && isNaN(bNum)) return -1;
                          if (isNaN(aNum) && !isNaN(bNum)) return 1;
                          return a[0].localeCompare(b[0], undefined, { numeric: true });
                        });

                        return (
                          <>
                            {sortedChapters.map(([chapterName, chapterClauses], chapterIdx) => (
                              <div key={chapterName} className="stagger-item" style={{ animationDelay: `${chapterIdx * 0.1}s` }}>
                                <div className="mb-6 pb-4 border-b-2 border-aaa-blue">
                                  <h3 className="text-3xl font-black text-aaa-blue tracking-tighter">Chapter {chapterName}</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-12">
                                  {(() => {
                                    const grouped = groupClausesByParent(chapterClauses);
                                    const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
                                      const parse = (s: string) => {
                                        return s.split('.').map(x => {
                                          const num = parseInt(x);
                                          if (!isNaN(num) && x === num.toString()) {
                                            return { type: 'number', value: num, str: x };
                                          }
                                          return { type: 'string', value: 0, str: x };
                                        });
                                      };
                                      const aP = parse(a[1].parent.clause_number);
                                      const bP = parse(b[1].parent.clause_number);
                                      for (let i = 0; i < Math.max(aP.length, bP.length); i++) {
                                        const aPart = aP[i] || { type: 'number', value: 0, str: '' };
                                        const bPart = bP[i] || { type: 'number', value: 0, str: '' };
                                        if (aPart.type === 'number' && bPart.type === 'number') {
                                          if (aPart.value !== bPart.value) return aPart.value - bPart.value;
                                        } else {
                                          const aStr = aPart.str.toLowerCase();
                                          const bStr = bPart.str.toLowerCase();
                                          if (aStr !== bStr) {
                                            const aNum = parseInt(aStr);
                                            const bNum = parseInt(bStr);
                                            if (!isNaN(aNum) && isNaN(bNum)) return -1;
                                            if (isNaN(aNum) && !isNaN(bNum)) return 1;
                                            return aStr.localeCompare(bStr);
                                          }
                                        }
                                      }
                                      return 0;
                                    });

                                    return sortedGroups.map(([parentNumber, { parent, subClauses }], idx) => (
                                      <div
                                        key={`group-${parentNumber}-${idx}`}
                                        className="stagger-item"
                                        style={{ animationDelay: `${idx * 0.05}s` }}
                                      >
                                        <GroupedClauseCard
                                          parentClause={parent}
                                          subClauses={subClauses}
                                          onCompare={setCompareClause}
                                          onEdit={handleEditClause}
                                          searchKeywords={searchFilter.trim().split(/\s+/).filter(k => k.length > 0)}
                                        />
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            ))}
                            {unassigned.length > 0 && (
                              <div className="stagger-item">
                                <div className="mb-6 pb-4 border-b-2 border-aaa-border">
                                  <h3 className="text-2xl font-black text-aaa-muted tracking-tighter">Unassigned Clauses</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-12">
                                  {(() => {
                                    const grouped = groupClausesByParent(unassigned);
                                    const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
                                      const parse = (s: string) => {
                                        return s.split('.').map(x => {
                                          const num = parseInt(x);
                                          if (!isNaN(num) && x === num.toString()) {
                                            return { type: 'number', value: num, str: x };
                                          }
                                          return { type: 'string', value: 0, str: x };
                                        });
                                      };
                                      const aP = parse(a[1].parent.clause_number);
                                      const bP = parse(b[1].parent.clause_number);
                                      for (let i = 0; i < Math.max(aP.length, bP.length); i++) {
                                        const aPart = aP[i] || { type: 'number', value: 0, str: '' };
                                        const bPart = bP[i] || { type: 'number', value: 0, str: '' };
                                        if (aPart.type === 'number' && bPart.type === 'number') {
                                          if (aPart.value !== bPart.value) return aPart.value - bPart.value;
                                        } else {
                                          const aStr = aPart.str.toLowerCase();
                                          const bStr = bPart.str.toLowerCase();
                                          if (aStr !== bStr) {
                                            const aNum = parseInt(aStr);
                                            const bNum = parseInt(bStr);
                                            if (!isNaN(aNum) && isNaN(bNum)) return -1;
                                            if (isNaN(aNum) && !isNaN(bNum)) return 1;
                                            return aStr.localeCompare(bStr);
                                          }
                                        }
                                      }
                                      return 0;
                                    });

                                    return sortedGroups.map(([parentNumber, { parent, subClauses }], idx) => (
                                      <div
                                        key={`group-${parentNumber}-${idx}`}
                                        className="stagger-item"
                                        style={{ animationDelay: `${idx * 0.05}s` }}
                                      >
                                        <GroupedClauseCard
                                          parentClause={parent}
                                          subClauses={subClauses}
                                          onCompare={setCompareClause}
                                          onEdit={handleEditClause}
                                          searchKeywords={searchFilter.trim().split(/\s+/).filter(k => k.length > 0)}
                                        />
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {status === AnalysisStatus.LIBRARY && (
                <div className="space-y-12 max-w-7xl mx-auto pb-20">
                  <div className="flex items-center justify-between border-b border-aaa-border pb-10">
                    <h2 className="text-5xl font-black text-aaa-blue tracking-tighter">Secured Archive</h2>
                    <div className="flex gap-4">
                      <button
                        onClick={() => importBackupRef.current?.click()}
                        className="flex items-center gap-3 px-8 py-4 bg-white border border-aaa-blue text-aaa-blue rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-aaa-bg transition-all shadow-sm active:scale-95"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        Import Archive
                      </button>
                      <button onClick={() => setStatus(AnalysisStatus.IDLE)} className="px-10 py-4 bg-aaa-blue text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-aaa-hover transition-all">New Extraction</button>
                      <button
                        onClick={async () => {
                          const newContractId = `contract-${Date.now()}`;
                          const newContractName = `New Contract ${new Date().toLocaleDateString()}`;

                          const emptyContract = ensureContractHasSections({
                            id: newContractId,
                            name: newContractName,
                            timestamp: Date.now(),
                            clauses: [],
                            metadata: {
                              totalClauses: 0,
                              generalCount: 0,
                              particularCount: 0,
                              highRiskCount: 0,
                              conflictCount: 0,
                              timeSensitiveCount: 0
                            }
                          });
                          setContract(emptyContract);
                          setClauses([]);
                          setProjectName(newContractName);
                          setActiveContractId(newContractId);
                          setStatus(AnalysisStatus.COMPLETED);

                          // Save empty contract to database immediately
                          try {
                            await performSaveContract(emptyContract);
                          } catch (err) {
                            console.error("Failed to save new contract:", err);
                          }
                        }}
                        className="px-10 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-emerald-600 transition-all"
                      >
                        New Contract
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {library.map(c => (
                      <div key={c.id} onClick={() => {
                        const contractWithSections = ensureContractHasSections(c);
                        // Re-process clause links to fix any broken hyperlinks
                        const allClauses = getAllClausesFromContract(contractWithSections);
                        const reprocessedClauses = reprocessClauseLinks(allClauses);
                        setContract(contractWithSections);
                        setClauses(reprocessedClauses);
                        setProjectName(contractWithSections.name);
                        setActiveContractId(contractWithSections.id);
                        setStatus(AnalysisStatus.COMPLETED);
                      }} className={`group bg-white p-10 rounded-3xl border shadow-premium cursor-pointer transition-all relative flex flex-col hover:-translate-y-1 ${activeContractId === c.id ? 'border-aaa-blue ring-2 ring-aaa-blue/10' : 'border-aaa-border hover:border-aaa-blue'}`}>
                        <div className="flex justify-between items-start mb-8">
                          <h4 className="text-3xl font-black text-aaa-text truncate tracking-tighter pr-16">{c.name}</h4>
                          <div className="flex gap-2 absolute top-8 right-8">
                            <button onClick={(e) => handleExportContract(e, c)} title="Export to PC" className="p-2.5 bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                            <button onClick={(e) => handleRenameArchive(e, c)} className="p-2.5 bg-aaa-bg text-aaa-muted hover:text-aaa-blue hover:bg-aaa-blue/10 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={(e) => handleDeleteArchive(e, c.id)} className="p-2.5 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                        <div className="mt-auto pt-8 border-t border-aaa-border flex justify-between items-center text-[10px] font-black uppercase text-aaa-muted tracking-widest">
                          <span>{new Date(c.timestamp).toLocaleDateString()}</span>
                          <span className="px-3 py-1 bg-aaa-bg rounded-lg text-aaa-blue">{c.clauses?.length || c.metadata?.totalClauses || 0} Nodes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contract Selector Modal - Shows on startup */}
              {showContractSelector && (
                <div
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowContractSelector(false);
                    }
                  }}
                >
                  <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-aaa-border flex justify-between items-start">
                      <div>
                        <h2 className="text-3xl font-black text-aaa-text mb-2">Select a Contract</h2>
                        <p className="text-aaa-muted text-sm">Choose a contract to continue working, or create a new one</p>
                      </div>
                      <button
                        onClick={() => setShowContractSelector(false)}
                        className="p-2 text-aaa-muted hover:text-aaa-text hover:bg-aaa-bg rounded-lg transition-all"
                        title="Close"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                      {library.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-aaa-muted mb-6">No contracts found. Create a new one to get started.</p>
                          <div className="mt-6 p-4 bg-aaa-bg/50 rounded-xl border border-aaa-border">
                            <p className="text-xs text-aaa-muted mb-2">Troubleshooting:</p>
                            <ul className="text-xs text-left text-aaa-muted space-y-1 max-w-md mx-auto">
                              <li>• Check browser console (F12) for errors</li>
                              <li>• Verify you're logged in</li>
                              <li>• Check Supabase Dashboard → Table Editor → contracts</li>
                              <li>• Ensure RLS policies are set up (run migrations)</li>
                            </ul>
                          </div>
                          <button
                            onClick={refreshLibrary}
                            className="mt-4 px-6 py-2 bg-aaa-blue text-white rounded-xl text-sm font-bold hover:bg-aaa-hover transition-all"
                          >
                            Refresh Contracts
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {library.map(c => {
                            const savedContractId = localStorage.getItem('aaa_active_contract_id');
                            const isLastActive = savedContractId === c.id;

                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  const contractWithSections = ensureContractHasSections(c);
                                  // Re-process clause links to fix any broken hyperlinks
                                  const allClauses = getAllClausesFromContract(contractWithSections);
                                  const reprocessedClauses = reprocessClauseLinks(allClauses);
                                  setContract(contractWithSections);
                                  setClauses(reprocessedClauses);
                                  setProjectName(contractWithSections.name);
                                  setActiveContractId(contractWithSections.id);
                                  setStatus(AnalysisStatus.COMPLETED);
                                  setShowContractSelector(false);
                                }}
                                className={`group bg-white p-6 rounded-2xl border shadow-lg cursor-pointer transition-all relative flex flex-col hover:-translate-y-1 ${isLastActive
                                  ? 'border-aaa-blue ring-2 ring-aaa-blue/20 bg-aaa-blue/5'
                                  : 'border-aaa-border hover:border-aaa-blue'
                                  }`}
                              >
                                {isLastActive && (
                                  <div className="absolute top-4 right-4 px-3 py-1 bg-aaa-blue text-white text-[9px] font-black rounded-full uppercase tracking-widest">
                                    Last Active
                                  </div>
                                )}
                                <div className="flex justify-between items-start mb-4">
                                  <h4 className="text-2xl font-black text-aaa-text truncate tracking-tighter pr-16">{c.name}</h4>
                                </div>
                                <div className="mt-auto pt-4 border-t border-aaa-border flex justify-between items-center text-[10px] font-black uppercase text-aaa-muted tracking-widest">
                                  <span>{new Date(c.timestamp).toLocaleDateString()}</span>
                                  <span className="px-3 py-1 bg-aaa-bg rounded-lg text-aaa-blue">{c.clauses?.length || c.metadata?.totalClauses || 0} Nodes</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="p-8 border-t border-aaa-border flex gap-4 justify-end">
                      <button
                        onClick={async () => {
                          const newContractId = `contract-${Date.now()}`;
                          const newContractName = `New Contract ${new Date().toLocaleDateString()}`;

                          setClauses([]);
                          setProjectName(newContractName);
                          setActiveContractId(newContractId);
                          setStatus(AnalysisStatus.COMPLETED);
                          setShowContractSelector(false);

                          // Save empty contract to database immediately
                          try {
                            await performSave([], newContractName, newContractId);
                          } catch (err) {
                            console.error("Failed to save new contract:", err);
                          }
                        }}
                        className="px-8 py-3 bg-emerald-500 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all"
                      >
                        Create New Contract
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>

          <React.Suspense fallback={null}>
            {compareClause && (
              <ComparisonModal
                baseClause={compareClause}
                allClauses={clauses}
                onClose={() => setCompareClause(null)}
                onUpdateClause={handleUpdateClause}
              />
            )}
          </React.Suspense>

          <React.Suspense fallback={null}>
            {isAddModalOpen && (
              <AddClauseModal
                contractId={activeContractId || 'current-contract'}
                onClose={() => {
                  setIsAddModalOpen(false);
                  setEditingClause(null);
                }}
                onSave={editingClause ? handleUpdateClauseFromModal : handleSaveManualClause}
                editingClause={editingClause}
              />
            )}
          </React.Suspense>

          <React.Suspense fallback={null}>
            {showCategorySuggestions && categorySuggestions.length > 0 && (
              <CategorySuggestionsModal
                suggestions={categorySuggestions}
                clauses={clauses}
                onAccept={(suggestion) => {
                  // Assign clauses to category using CategoryManagerService
                  const categoryService = new CategoryManagerService();
                  categoryService.initialize(clauses);

                  // Create category if it doesn't exist (ignore error if already exists)
                  categoryService.processAction({
                    action: 'create_category',
                    category_name: suggestion.categoryName
                  });

                  // Add clauses to category
                  const updatedClauses = [...clauses];
                  suggestion.suggestedClauseNumbers.forEach(clauseNumber => {
                    const addResult = categoryService.processAction({
                      action: 'add_clause',
                      clause_number: clauseNumber,
                      category_name: suggestion.categoryName
                    });
                    if (addResult.success) {
                      const clause = updatedClauses.find(c => c.clause_number === clauseNumber);
                      if (clause) {
                        clause.category = suggestion.categoryName;
                      }
                    }
                  });
                  setClauses(updatedClauses);
                  persistCurrentProject(updatedClauses, projectName);
                }}
                onReject={(suggestion) => {
                  // Just remove from suggestions list
                  setCategorySuggestions(prev => prev.filter(s => s.categoryName !== suggestion.categoryName));
                }}
                onAcceptAll={() => {
                  // Accept all remaining suggestions
                  const categoryService = new CategoryManagerService();
                  categoryService.initialize(clauses);
                  const updatedClauses = [...clauses];

                  categorySuggestions.forEach(suggestion => {
                    // Create category if it doesn't exist (ignore error if already exists)
                    categoryService.processAction({
                      action: 'create_category',
                      category_name: suggestion.categoryName
                    });

                    // Add clauses to category
                    suggestion.suggestedClauseNumbers.forEach(clauseNumber => {
                      const addResult = categoryService.processAction({
                        action: 'add_clause',
                        clause_number: clauseNumber,
                        category_name: suggestion.categoryName
                      });
                      if (addResult.success) {
                        const clause = updatedClauses.find(c => c.clause_number === clauseNumber);
                        if (clause && !clause.category) {
                          clause.category = suggestion.categoryName;
                        }
                      }
                    });
                  });

                  setClauses(updatedClauses);
                  persistCurrentProject(updatedClauses, projectName);
                  setShowCategorySuggestions(false);
                }}
                onDismiss={() => {
                  setShowCategorySuggestions(false);
                  setCategorySuggestions([]);
                }}
              />
            )}
          </React.Suspense>

          <footer className="glass border-t border-aaa-border px-10 h-16 flex items-center justify-between z-10 shrink-0">
            <div className="flex flex-col">
              <p className="text-[9px] font-black text-aaa-muted uppercase tracking-[0.5em]">AAA CONTRACT DEPARTMENT © 2025</p>
            </div>
            <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Precision Engine Pro</span>
          </footer>
        </div>
      </AppWrapper>

      <React.Suspense fallback={null}>
        <AIBotSidebar
          isOpen={isBotOpen}
          onClose={() => setIsBotOpen(false)}
          clauses={clauses}
          selectedClause={selectedClauseForBot}
          contracts={library}
          activeContractId={activeContractId}
          onContractChange={(contractId) => {
            // Find and load the selected contract
            const selectedContract = library.find(c => c.id === contractId);
            if (selectedContract) {
              const contractWithSections = ensureContractHasSections(selectedContract);
              const allClauses = getAllClausesFromContract(contractWithSections);
              setContract(contractWithSections);
              setClauses(reprocessClauseLinks(allClauses));
              setProjectName(contractWithSections.name);
              setActiveContractId(contractWithSections.id);
              setStatus(AnalysisStatus.COMPLETED);
            }
          }}
        />
      </React.Suspense>

      <FloatingAIButton
        onClick={() => setIsBotOpen(!isBotOpen)}
        isOpen={isBotOpen}
      />
    </>
  );
};

export default App;
