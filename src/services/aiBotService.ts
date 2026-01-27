import { createAIProvider, isClaudeAvailable, getRateLimitStatus, isRequestInFlight } from './aiProvider';
import { Clause, BotMessage } from '../../types';
import { getDocumentReaderService, DocumentChunkContent } from './documentReaderService';
import { getEmbeddingService } from './embeddingService';
import { getOrchestrator, SynthesizedResponse } from './multiAgentOrchestrator';
import { isOpenAIAvailable } from './openaiProvider';

// Constants for token management
const MAX_CONTEXT_TOKENS = 80000;  // ~320,000 characters
const RESERVED_RESPONSE_TOKENS = 10000;
const CHARS_PER_TOKEN = 4;  // Rough estimate

// ============================================
// REQUEST THROTTLING & DEBOUNCING
// ============================================

// Track pending suggestions request
let pendingSuggestionsAbort: AbortController | null = null;
let suggestionsInFlight = false;
let lastSuggestionsRequest = 0;
const SUGGESTIONS_DEBOUNCE_MS = 500;
const SUGGESTIONS_COOLDOWN_MS = 2000;

/**
 * Get rate limit status for UI feedback
 */
export { getRateLimitStatus, isRequestInFlight };

const CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION = `You are CLAUDE CONTRACT EXPERT — a specialized AI in construction contracts, FIDIC conditions, claims, delays, variations, payments, EOT, LDs, and contract administration.

CRITICAL FORMATTING RULES:
- NO markdown formatting (no **bold**, no ### headers, no --- separators)
- NO asterisks, hashtags, or special markdown characters
- Use ONLY plain text with emojis for structure
- Use ONLY these emojis: 🔵 🔹 🔸 🔷
- Keep one blank line between sections
- Keep bullet points on single lines
- Never use bold text or markdown emphasis

RESPONSE STRUCTURE:
🔵 Section Title
🔹 Main point
🔸 Short explanation (one line only)
🔹 Next point
🔸 Short explanation

🔷 You can also ask me to:
- Option 1
- Option 2
- Option 3

ABSOLUTE RULES:
- Plain text only, no markdown
- One line per bullet point
- One blank line between sections
- Maximum 2–3 lines per explanation
- Always end with 2–3 follow-up options
- Never invent clause numbers
- Always end with 2–3 follow-up options
- Never invent clause numbers
- Use only clauses the user provides
- CITE CLAUSES PRECISELY: When referring to a clause, always use the format "Clause X" or "Clause X.X" so I can link to it.

EXAMPLE:

🔵 Payment Clauses
🔹 Clause 26 — Interim certificates
🔸 Contractor applies monthly, Engineer issues within 28 days
🔹 Clause 27 — Payment timelines
🔸 Employer pays within 56 days of certificate date

🔷 You can also ask me to:
- Compare Employer vs Contractor obligations
- Extract all payment deadlines
- Explain retention release process`;

const SUGGESTIONS_SYSTEM_INSTRUCTION = `You are a helpful assistant for contract analysis. Based on the current contract clauses, suggest 3-5 helpful actions or questions the user might want to explore. Return a JSON array of suggestion strings.`;

const EXPLAIN_SYSTEM_INSTRUCTION = `You are CLAUDE CONTRACT EXPERT — a specialized AI in construction contracts.

CRITICAL FORMATTING RULES:
- NO markdown formatting (no **bold**, no ### headers, no --- separators)
- NO asterisks, hashtags, or special markdown characters
- Use ONLY plain text with emojis for structure
- Use ONLY these emojis: 🔵 🔹 🔸 🔷
- Keep one blank line between sections
- Keep bullet points on single lines
- Never use bold text or markdown emphasis

When explaining a clause:

🔵 Clause [NUMBER] — [TITLE]
🔹 What this clause means
🔸 Brief explanation (one line only)

🔵 Key Obligations
🔹 Employer obligations (if any)
🔸 Short description
🔹 Contractor obligations (if any)
🔸 Short description

🔵 Important Timeframes
🔸 Any deadlines or notice periods
🔸 Response requirements

🔷 You can also ask me to:
- Compare with General Conditions
- Show payment implications
- Identify related clauses

Plain text only, no markdown formatting.`;

/**
 * Build a unified contract context that combines parsed clauses with document chunks
 * This provides the AI with the complete contract view
 */
export async function buildUnifiedContractContext(
  contractId: string | null,
  parsedClauses: Clause[],
  options: {
    maxTokens?: number;
    prioritizeRecent?: boolean;
    includeDocumentChunks?: boolean;
  } = {}
): Promise<{
  context: string;
  hasDocuments: boolean;
  clauseCount: number;
  chunkCount: number;
}> {
  const {
    maxTokens = MAX_CONTEXT_TOKENS - RESERVED_RESPONSE_TOKENS,
    prioritizeRecent = true,
    includeDocumentChunks = true
  } = options;

  const maxChars = maxTokens * CHARS_PER_TOKEN;
  let usedChars = 0;
  const contextParts: string[] = [];
  let hasDocuments = false;
  let chunkCount = 0;

  // Priority order for clauses: PC > Addendums > GC
  // Sort clauses by condition type (Particular first, then General)
  const sortedClauses = [...parsedClauses].sort((a, b) => {
    // Particular conditions have priority
    if (a.condition_type === 'Particular' && b.condition_type !== 'Particular') return -1;
    if (b.condition_type === 'Particular' && a.condition_type !== 'Particular') return 1;
    // Then sort by clause number
    return a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true });
  });

  // Add header
  const header = `=== COMPLETE CONTRACT CONTENT ===\nTotal Parsed Clauses: ${parsedClauses.length}\n\n`;
  contextParts.push(header);
  usedChars += header.length;

  // 1. Add parsed clauses with full text
  if (sortedClauses.length > 0) {
    contextParts.push('=== PARSED CONTRACT CLAUSES ===\n');
    usedChars += 30;

    for (const clause of sortedClauses) {
      // Build clause content
      let clauseContent = `\n[Clause ${clause.clause_number}: ${clause.clause_title}]\n`;
      clauseContent += `Type: ${clause.condition_type || 'General'}\n`;

      // Include full clause text
      const mainText = clause.clause_text || '';
      clauseContent += mainText + '\n';

      // Include PC override if different
      if (clause.particular_condition && clause.particular_condition !== mainText) {
        clauseContent += `\n[Particular Condition Override]:\n${clause.particular_condition}\n`;
      }

      // Include GC reference if available and different
      if (clause.general_condition && clause.general_condition !== mainText && clause.general_condition !== clause.particular_condition) {
        clauseContent += `\n[General Condition Reference]:\n${clause.general_condition}\n`;
      }

      // Add time frames if present
      if (clause.time_frames && clause.time_frames.length > 0) {
        clauseContent += `\nTime Frames:\n`;
        clause.time_frames.forEach(tf => {
          clauseContent += `  - ${tf.type}: ${tf.original_phrase} (${tf.applies_to})\n`;
        });
      }

      clauseContent += '\n---\n';

      // Check if we have space
      if (usedChars + clauseContent.length <= maxChars) {
        contextParts.push(clauseContent);
        usedChars += clauseContent.length;
      } else {
        // Add truncated notice
        contextParts.push(`\n[Note: ${sortedClauses.length - sortedClauses.indexOf(clause)} more clauses available but truncated due to context limits]\n`);
        break;
      }
    }
  }

  // 2. Try to add document chunks from Supabase if available
  if (includeDocumentChunks && contractId) {
    try {
      const readerService = getDocumentReaderService();
      const summary = await readerService.getContractSummary(contractId);

      if (summary.totalChunks > 0) {
        hasDocuments = true;
        chunkCount = summary.totalChunks;

        // Add document summary header
        const docHeader = `\n=== UPLOADED DOCUMENTS ===\nTotal Documents: ${summary.totalDocuments}\nTotal Extracted Sections: ${summary.totalChunks}\n\n`;

        if (usedChars + docHeader.length <= maxChars) {
          contextParts.push(docHeader);
          usedChars += docHeader.length;

          // Get chunks organized by document group priority
          // Priority: C (Conditions) > D (Addendums) > A (Agreement) > B (LOA) > I (BOQ) > N (Schedules)
          const groupPriority: Record<string, number> = {
            'C': 1, // Conditions of Contract - highest priority
            'D': 2, // Addendums
            'A': 3, // Agreement
            'B': 4, // LOA
            'I': 5, // BOQ
            'N': 6  // Schedules
          };

          const sortedDocs = [...summary.documents].sort((a, b) => {
            const priorityA = groupPriority[a.group] || 99;
            const priorityB = groupPriority[b.group] || 99;
            return priorityA - priorityB;
          });

          // Fetch and add document content by priority
          for (const doc of sortedDocs) {
            if (doc.status !== 'completed' || doc.chunkCount === 0) continue;

            const docContent = await readerService.getDocumentContent(doc.id);
            if (!docContent) continue;

            const groupLabel = {
              A: 'Agreement & Annexes',
              B: 'Letter of Acceptance',
              C: 'Conditions of Contract',
              D: 'Addendum',
              I: 'BOQ & Pricing',
              N: 'Schedule'
            }[doc.group] || doc.group;

            let docSection = `\n--- [${groupLabel}] ${doc.name} ---\n`;

            for (const chunk of docContent.chunks) {
              let chunkText = '';
              if (chunk.clauseNumber) {
                chunkText += `[Clause ${chunk.clauseNumber}${chunk.clauseTitle ? ': ' + chunk.clauseTitle : ''}]\n`;
              }
              chunkText += chunk.content + '\n\n';

              if (usedChars + docSection.length + chunkText.length <= maxChars) {
                docSection += chunkText;
              } else {
                docSection += `[... ${docContent.chunks.length - docContent.chunks.indexOf(chunk)} more sections truncated]\n`;
                break;
              }
            }

            if (usedChars + docSection.length <= maxChars) {
              contextParts.push(docSection);
              usedChars += docSection.length;
            } else {
              contextParts.push(`\n[Note: Additional documents available but truncated due to context limits]\n`);
              break;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch document chunks:', error);
      // Continue without document chunks - not a fatal error
    }
  }

  return {
    context: contextParts.join(''),
    hasDocuments,
    clauseCount: parsedClauses.length,
    chunkCount
  };
}

/**
 * Enhanced chat function that automatically includes full contract context
 */
export async function chatWithFullContext(
  messages: BotMessage[],
  contractId: string | null,
  clauses: Clause[],
  options: {
    focusClause?: string;
    searchQuery?: string;
  } = {}
): Promise<string> {
  const aiProvider = createAIProvider();

  if (!aiProvider.isAvailable()) {
    throw new Error('Claude API key is not configured. Please check your ANTHROPIC_API_KEY environment variable.');
  }

  try {
    // Build unified context
    const { context, hasDocuments, clauseCount, chunkCount } = await buildUnifiedContractContext(
      contractId,
      clauses,
      { includeDocumentChunks: true }
    );

    // Enhanced system instruction
    let systemInstruction = CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION;

    if (hasDocuments || clauseCount > 0) {
      systemInstruction += `

CONTRACT CONTEXT AVAILABLE:
You have access to the complete contract content including:
- ${clauseCount} parsed clauses with full text
${hasDocuments ? `- ${chunkCount} extracted sections from uploaded documents` : ''}

When answering questions:
- Reference specific clauses by number (e.g., "Clause 14.1")
- Quote relevant text when appropriate
- If comparing GC vs PC, note which takes precedence (PC overrides GC)
- For addendums, later addendums override earlier ones
- If information is not in the provided context, say so clearly

${context}`;
    }

    return await aiProvider.chat(messages, [], systemInstruction);
  } catch (error: any) {
    console.error('Chat with full context failed:', error);
    // Fallback to basic chat with just clauses
    return await aiProvider.chat(messages, clauses, CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION);
  }
}

export async function chatWithBot(
  messages: BotMessage[],
  context: Clause[],
  contractId?: string | null
): Promise<string> {
  const aiProvider = createAIProvider();

  if (!aiProvider.isAvailable()) {
    throw new Error('Claude API key is not configured. Please check your ANTHROPIC_API_KEY environment variable.');
  }

  try {
    // If we have a contractId, use the enhanced full context chat
    if (contractId) {
      return await chatWithFullContext(messages, contractId, context);
    }

    // Otherwise, use standard chat with clauses
    return await aiProvider.chat(messages, context, CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION);
  } catch (error: any) {
    throw new Error(`Failed to get response from Claude: ${error.message}`);
  }
}

/**
 * Default suggestions when AI is unavailable or rate-limited
 */
const DEFAULT_SUGGESTIONS = [
  'Explain a clause',
  'Find clauses about payment',
  'Search for time-sensitive clauses',
  'Compare General vs Particular conditions'
];

/**
 * Get AI-powered suggestions with proper throttling and debouncing
 * - Debounces rapid calls (500ms)
 * - Cancels previous pending requests
 * - Returns cached/default suggestions if rate-limited
 * - Only allows one in-flight request at a time
 */
export async function getSuggestions(
  clauses: Clause[]
): Promise<string[]> {
  const aiProvider = createAIProvider();

  // Return defaults if AI not available
  if (!aiProvider.isAvailable()) {
    return DEFAULT_SUGGESTIONS;
  }

  // Check if we're rate limited
  const rateLimitStatus = getRateLimitStatus();
  if (rateLimitStatus.isLimited) {
    console.log('Suggestions skipped: rate limited');
    return DEFAULT_SUGGESTIONS;
  }

  // Check if a request is already in flight (global)
  if (isRequestInFlight()) {
    console.log('Suggestions skipped: request already in flight');
    return DEFAULT_SUGGESTIONS;
  }

  // Check cooldown between suggestions requests
  const now = Date.now();
  if (now - lastSuggestionsRequest < SUGGESTIONS_COOLDOWN_MS) {
    console.log('Suggestions skipped: cooldown period');
    return DEFAULT_SUGGESTIONS;
  }

  // Cancel any pending suggestions request
  if (pendingSuggestionsAbort) {
    pendingSuggestionsAbort.abort();
    pendingSuggestionsAbort = null;
  }

  // Check if suggestions request already in flight
  if (suggestionsInFlight) {
    console.log('Suggestions skipped: suggestions already loading');
    return DEFAULT_SUGGESTIONS;
  }

  // Create new abort controller
  pendingSuggestionsAbort = new AbortController();
  suggestionsInFlight = true;
  lastSuggestionsRequest = now;

  const query = `Based on these ${clauses.length} contract clauses, suggest 3-5 helpful actions or questions the user might want to explore. Return only a JSON array of strings, no other text.`;

  try {
    const messages: BotMessage[] = [{
      id: 'suggestions-query',
      role: 'user',
      content: query,
      timestamp: Date.now()
    }];
    
    const response = await aiProvider.chat(messages, clauses, SUGGESTIONS_SYSTEM_INSTRUCTION);

    // Try to parse JSON array from response
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 5);
      }
    } catch {
      // If parsing fails, extract suggestions from text
      const lines = response.split('\n').filter(line => line.trim().length > 0);
      return lines.slice(0, 5);
    }

    return DEFAULT_SUGGESTIONS.slice(0, 3);
  } catch (error: any) {
    // Don't log aborted requests as errors
    if (error.name === 'AbortError') {
      console.log('Suggestions request aborted');
      return DEFAULT_SUGGESTIONS;
    }
    
    console.error('Failed to get suggestions:', error);
    return DEFAULT_SUGGESTIONS.slice(0, 3);
  } finally {
    suggestionsInFlight = false;
    pendingSuggestionsAbort = null;
  }
}

export async function explainClause(
  clause: Clause
): Promise<string> {
  const aiProvider = createAIProvider();

  if (!aiProvider.isAvailable()) {
    throw new Error('Claude API key is not configured.');
  }

  const query = `Explain this contract clause in detail:\n\nClause ${clause.clause_number}: ${clause.clause_title}\n\n${clause.clause_text}\n\n${clause.general_condition ? `General Condition: ${clause.general_condition}\n` : ''}${clause.particular_condition ? `Particular Condition: ${clause.particular_condition}` : ''}`;

  try {
    const messages: BotMessage[] = [{
      id: 'explain-query',
      role: 'user',
      content: query,
      timestamp: Date.now()
    }];
    return await aiProvider.chat(messages, [], EXPLAIN_SYSTEM_INSTRUCTION);
  } catch (error: any) {
    throw new Error(`Failed to explain clause: ${error.message}`);
  }
}

/**
 * Chat with bot using document content from Supabase
 * This allows the AI to read and analyze uploaded contract documents
 */
export async function chatWithDocuments(
  messages: BotMessage[],
  contractId: string,
  options: {
    focusClause?: string;
    searchQuery?: string;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const aiProvider = createAIProvider();

  if (!aiProvider.isAvailable()) {
    throw new Error('Claude API key is not configured.');
  }

  try {
    const readerService = getDocumentReaderService();

    // Get document context
    let documentContext = '';

    if (options.searchQuery) {
      // Search for relevant chunks
      try {
        const embeddingService = getEmbeddingService();
        const queryEmbedding = await embeddingService.generateEmbeddings(options.searchQuery);

        if (queryEmbedding && queryEmbedding.length > 0) {
          const searchResults = await readerService.searchSimilarChunks(contractId, queryEmbedding[0], { limit: 15 });
          if (searchResults.length > 0) {
            documentContext = formatSearchResults(searchResults);
          }
        }
      } catch (err) {
        console.warn('Vector search failed, falling back to text search');
        const searchResults = await readerService.searchDocuments(contractId, options.searchQuery, { limit: 10 });
        if (searchResults.length > 0) {
          documentContext = formatSearchResults(searchResults);
        }
      }
    }

    // Get formatted document context
    const fullContext = await readerService.formatForAIContext(contractId, {
      maxTokens: options.maxTokens || 30000,
      focusClause: options.focusClause
    });

    documentContext = documentContext + '\n\n' + fullContext;

    // Enhanced system instruction with document awareness
    const documentAwareInstruction = CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION + `

DOCUMENT CONTEXT:
You have access to the uploaded contract documents. The context below contains extracted text from these documents.
When answering questions:
- Reference specific clauses and their content from the documents
- Quote relevant text when appropriate (use quotation marks)
- Cite the source document group (A=Agreement, B=LOA, C=Conditions, D=Addendum, I=BOQ, N=Schedule)
- If information is not in the provided context, say so clearly

${documentContext}`;

    return await aiProvider.chat(messages, [], documentAwareInstruction);
  } catch (error: any) {
    // Fallback to regular chat if document reading fails
    console.error('Document reading failed, falling back to regular chat:', error);
    return await aiProvider.chat(messages, [], CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION);
  }
}

/**
 * Search documents and return relevant context
 */
export async function searchContractDocuments(
  contractId: string,
  query: string
): Promise<{ found: boolean; results: DocumentChunkContent[]; summary: string }> {
  try {
    const readerService = getDocumentReaderService();
    const results = await readerService.searchDocuments(contractId, query, { limit: 20 });

    if (results.length === 0) {
      return {
        found: false,
        results: [],
        summary: `No documents found matching "${query}"`
      };
    }

    const summary = `Found ${results.length} relevant sections:\n` +
      results.slice(0, 5).map((r, i) =>
        `${i + 1}. ${r.clauseNumber ? `Clause ${r.clauseNumber}` : 'Section'}: ${r.content.substring(0, 100)}...`
      ).join('\n');

    return {
      found: true,
      results,
      summary
    };
  } catch (error) {
    console.error('Search failed:', error);
    return {
      found: false,
      results: [],
      summary: 'Search failed. Make sure documents have been uploaded and processed.'
    };
  }
}

/**
 * Get document summary for AI context
 */
export async function getDocumentSummary(contractId: string): Promise<string> {
  try {
    const readerService = getDocumentReaderService();
    const summary = await readerService.getContractSummary(contractId);

    if (summary.totalDocuments === 0) {
      return 'No documents have been uploaded for this contract yet.';
    }

    const groupLabels: Record<string, string> = {
      A: 'Agreement & Annexes',
      B: 'Letter of Acceptance',
      C: 'Conditions of Contract',
      D: 'Addendums',
      I: 'BOQ & Pricing',
      N: 'Schedules & Appendices'
    };

    let result = `📁 Contract Documents Summary\n\n`;
    result += `Total: ${summary.totalDocuments} documents, ${summary.totalChunks} extracted sections\n\n`;

    // Group by document group
    const byGroup = new Map<string, typeof summary.documents>();
    for (const doc of summary.documents) {
      const group = doc.group;
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group)!.push(doc);
    }

    for (const [group, docs] of byGroup) {
      result += `${groupLabels[group] || group}:\n`;
      for (const doc of docs) {
        const statusIcon = doc.status === 'completed' ? '✅' : doc.status === 'processing' ? '⏳' : '⏸️';
        result += `  ${statusIcon} ${doc.name} (${doc.chunkCount} sections)\n`;
      }
      result += '\n';
    }

    return result;
  } catch (error) {
    console.error('Failed to get document summary:', error);
    return 'Unable to load document summary. Make sure Supabase is configured correctly.';
  }
}

/**
 * Format search results for display
 */
function formatSearchResults(results: DocumentChunkContent[]): string {
  if (results.length === 0) return '';

  let formatted = '=== SEARCH RESULTS ===\n\n';

  for (const result of results) {
    if (result.clauseNumber) {
      formatted += `[Clause ${result.clauseNumber}${result.clauseTitle ? ': ' + result.clauseTitle : ''}]\n`;
    }
    formatted += result.content + '\n\n';
  }

  return formatted;
}

// ============================================
// DUAL-AGENT MULTI-AI SYSTEM
// ============================================

/**
 * Check if dual-agent mode is available (both OpenAI and Claude configured)
 */
export function isDualAgentModeAvailable(): boolean {
  return isOpenAIAvailable() && isClaudeAvailable();
}

/**
 * Get the status of both AI agents
 */
export function getAgentStatus(): {
  openai: { available: boolean; name: string; specialties: string[] };
  claude: { available: boolean; name: string; specialties: string[] };
  dualAgentMode: boolean;
} {
  const orchestrator = getOrchestrator();
  return orchestrator.getAgentStatus();
}

/**
 * Chat with dual AI agents (OpenAI for documents, Claude for GC/PC)
 * 
 * This function orchestrates both AI agents to provide comprehensive contract analysis:
 * - OpenAI (Document Specialist): Analyzes Agreement, BOQ, Schedules, Addendums
 * - Claude (Conditions Specialist): Analyzes General & Particular Conditions
 * 
 * The responses are synthesized into a unified expert answer.
 */
export async function chatWithDualAgents(
  messages: BotMessage[],
  clauses: Clause[],
  contractId: string | null,
  options: {
    forceBothAgents?: boolean;
    conversationHistory?: BotMessage[];
  } = {}
): Promise<{
  response: string;
  synthesizedResponse: SynthesizedResponse;
  agentsUsed: ('openai' | 'claude')[];
  isDualMode: boolean;
}> {
  const orchestrator = getOrchestrator({
    alwaysUseBothAgents: options.forceBothAgents ?? false
  });

  // Get the last user message as the query
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const query = lastUserMessage?.content || '';

  if (!query) {
    throw new Error('No query provided');
  }

  // Get conversation history (excluding the current query)
  const conversationHistory = options.conversationHistory || 
    messages.slice(0, -1).filter(m => m.role === 'user' || m.role === 'assistant');

  // Orchestrate the dual-agent response
  const synthesizedResponse = await orchestrator.orchestrate(
    query,
    contractId,
    clauses,
    conversationHistory
  );

  return {
    response: synthesizedResponse.finalAnswer,
    synthesizedResponse,
    agentsUsed: synthesizedResponse.agentsUsed,
    isDualMode: synthesizedResponse.agentsUsed.length === 2
  };
}

/**
 * Smart chat function that automatically uses dual-agent mode when available
 * Falls back to single-agent (Claude) mode if OpenAI is not configured
 */
export async function chatWithSmartRouting(
  messages: BotMessage[],
  clauses: Clause[],
  contractId: string | null
): Promise<{
  response: string;
  mode: 'dual' | 'claude-only' | 'openai-only' | 'unavailable';
  agentsUsed: string[];
  crossReferences?: string[];
}> {
  const agentStatus = getAgentStatus();

  // If both agents are available, use dual-agent mode
  if (agentStatus.dualAgentMode && contractId) {
    try {
      const result = await chatWithDualAgents(messages, clauses, contractId);
      return {
        response: result.response,
        mode: result.isDualMode ? 'dual' : (result.agentsUsed[0] === 'claude' ? 'claude-only' : 'openai-only'),
        agentsUsed: result.agentsUsed,
        crossReferences: result.synthesizedResponse.crossReferences
      };
    } catch (error) {
      console.warn('Dual-agent mode failed, falling back to single agent:', error);
    }
  }

  // Fall back to Claude-only mode
  if (agentStatus.claude.available) {
    try {
      const response = await chatWithBot(messages, clauses, contractId);
      return {
        response,
        mode: 'claude-only',
        agentsUsed: ['claude']
      };
    } catch (error) {
      console.error('Claude-only mode failed:', error);
    }
  }

  // If Claude is not available but OpenAI is, use OpenAI only
  if (agentStatus.openai.available && contractId) {
    try {
      const orchestrator = getOrchestrator();
      const openaiResponse = await orchestrator['queryOpenAIAgent'](
        messages[messages.length - 1]?.content || '',
        contractId,
        messages.slice(0, -1)
      );
      
      if (openaiResponse.analysis) {
        return {
          response: openaiResponse.analysis,
          mode: 'openai-only',
          agentsUsed: ['openai']
        };
      }
    } catch (error) {
      console.error('OpenAI-only mode failed:', error);
    }
  }

  return {
    response: 'No AI agents are available. Please configure your API keys (VITE_ANTHROPIC_API_KEY for Claude and/or VITE_OPENAI_API_KEY for OpenAI).',
    mode: 'unavailable',
    agentsUsed: []
  };
}

/**
 * Get a formatted summary of agent capabilities and status
 */
export function getAgentCapabilitiesSummary(): string {
  const status = getAgentStatus();
  
  let summary = '🤖 AI Agent Status\n\n';
  
  // OpenAI Status
  summary += `📄 Document Specialist (OpenAI GPT-4)\n`;
  summary += `Status: ${status.openai.available ? '✅ Available' : '❌ Not Configured'}\n`;
  if (status.openai.available) {
    summary += `Specialties: ${status.openai.specialties.join(', ')}\n`;
  }
  summary += '\n';
  
  // Claude Status
  summary += `📜 Conditions Specialist (Claude)\n`;
  summary += `Status: ${status.claude.available ? '✅ Available' : '❌ Not Configured'}\n`;
  if (status.claude.available) {
    summary += `Specialties: ${status.claude.specialties.join(', ')}\n`;
  }
  summary += '\n';
  
  // Dual Mode Status
  if (status.dualAgentMode) {
    summary += `🔄 Dual-Agent Mode: ✅ ACTIVE\n`;
    summary += `Both agents will collaborate to provide comprehensive analysis.\n`;
  } else {
    summary += `🔄 Dual-Agent Mode: ❌ Not Available\n`;
    summary += `Configure both API keys to enable collaborative analysis.\n`;
  }
  
  return summary;
}
