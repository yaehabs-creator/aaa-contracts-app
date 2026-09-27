/**
 * Multi-Agent Orchestrator Service
 * 
 * Coordinates between OpenAI (Document Specialist) and Claude (GC/PC Specialist)
 * to provide comprehensive contract analysis responses.
 * 
 * Responsibilities:
 * - Query Analysis: Determine which agents should respond
 * - Context Routing: Send relevant data to each agent
 * - Parallel Execution: Query both agents simultaneously
 * - Response Synthesis: Combine insights from both agents
 * - Conflict Resolution: Handle disagreements between agents
 */

import { BotMessage, Clause, DocumentGroup } from '@/types';
import { getOpenAIProvider, OpenAIAgentResponse, isOpenAIAvailable } from './openaiProvider';
import { ClaudeProvider, isClaudeAvailable } from './aiProvider';
import { getDocumentReaderService } from './documentReaderService';
import { getJsonDataSources, buildJsonContext } from './jsonDataSourceService';

// Query classification keywords
const DOCUMENT_KEYWORDS = [
  'agreement', 'boq', 'bill of quantities', 'schedule', 'pricing', 'rates',
  'addendum', 'appendix', 'annex', 'specification', 'technical', 'milestone',
  'payment schedule', 'letter of acceptance', 'loa', 'contract sum', 'tender',
  'bid', 'proposal', 'scope of work', 'deliverables', 'quantities'
];

const CONDITIONS_KEYWORDS = [
  'clause', 'general condition', 'particular condition', 'gc', 'pc', 'fidic',
  'liability', 'obligation', 'notice', 'time bar', 'extension of time', 'eot',
  'variation', 'claim', 'delay', 'damages', 'liquidated damages', 'ld',
  'defects', 'warranty', 'guarantee', 'indemnity', 'insurance', 'force majeure',
  'termination', 'suspension', 'dispute', 'arbitration', 'rights', 'duties',
  'sub-clause', 'precedence', 'override', 'amendment'
];

const GLOBAL_KEYWORDS = [
  'whole', 'all', 'everything', 'entire', 'complete', 'overview', 'landscape',
  'summarize the contract', 'summarize everything', 'full analysis',
  'across all documents', 'total contract', 'compare all'
];

const GRAPH_KEYWORDS = [
  'party', 'who', 'when', 'relationship', 'connect', 'involved', 'expire',
  'sign', 'link', 'hierarchy', 'network', 'map', 'graph', 'database'
];

export interface AgentResponse {
  agent: 'openai' | 'claude';
  specialty: string;
  analysis: string;
  confidence: number;
  referencedSources: string[];
  error?: string;
}

export interface SynthesizedResponse {
  finalAnswer: string;
  openaiInsights: AgentResponse | null;
  claudeInsights: AgentResponse | null;
  crossReferences: string[];
  agentsUsed: ('openai' | 'claude')[];
  synthesisNotes: string;
}

export interface QueryClassification {
  requiresDocuments: boolean;
  requiresConditions: boolean;
  documentRelevance: number; // 0-1
  conditionsRelevance: number; // 0-1
  detectedTopics: string[];
}

export interface OrchestratorConfig {
  alwaysUseBothAgents?: boolean;
  confidenceThreshold?: number;
  maxRetries?: number;
}

// System prompt for response synthesis
const SYNTHESIS_SYSTEM_PROMPT = `You are a CONTRACT SYNTHESIS EXPERT. Your role is to combine analyses from two specialized AI agents into a coherent, comprehensive response.

AGENT SPECIALTIES:
1. Document Specialist (OpenAI): Analyzes Agreement, BOQ, Schedules, Addendums - focuses on commercial/financial aspects
2. Conditions Specialist (Claude): Analyzes General & Particular Conditions - focuses on legal rights, obligations, precedence

YOUR TASK:
- Combine insights from all agents into a unified, clear response
- Resolve any conflicts by noting which source takes precedence
- Highlight cross-references between documents and conditions
- Present the information in a logical, easy-to-understand format
- Maintain professional, precise contract language

FORMAT RULES:
- NO markdown (no **, ##, ---)
- Use plain text with emojis for structure: 🔵 🔹 🔸 🔷
- Keep responses clear and organized
- Always cite sources (which agent/document provided the information)`;

export class MultiAgentOrchestrator {
  private openaiProvider = getOpenAIProvider();
  private claudeProvider: ClaudeProvider;
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig = {}) {
    this.claudeProvider = new ClaudeProvider();
    this.config = {
      alwaysUseBothAgents: config.alwaysUseBothAgents ?? false,
      confidenceThreshold: config.confidenceThreshold ?? 0.3,
      maxRetries: config.maxRetries ?? 1
    };
  }

  /**
   * Check which agents are available
   */
  getAvailableAgents(): { openai: boolean; claude: boolean } {
    return {
      openai: isOpenAIAvailable(),
      claude: isClaudeAvailable()
    };
  }

  /**
   * Classify a query to determine which agents should handle it
   */
  classifyQuery(query: string): QueryClassification {
    const lowerQuery = query.toLowerCase();
    const detectedTopics: string[] = [];

    // Check for document-related keywords
    let documentScore = 0;
    for (const keyword of DOCUMENT_KEYWORDS) {
      if (lowerQuery.includes(keyword)) {
        documentScore += 1;
        detectedTopics.push(`doc:${keyword}`);
      }
    }

    // Check for conditions-related keywords
    let conditionsScore = 0;
    for (const keyword of CONDITIONS_KEYWORDS) {
      if (lowerQuery.includes(keyword)) {
        conditionsScore += 1;
        detectedTopics.push(`cond:${keyword}`);
      }
    }

    // Check for global keywords
    let globalScore = 0;
    for (const keyword of GLOBAL_KEYWORDS) {
      if (lowerQuery.includes(keyword)) {
        globalScore += 2; // High weight
        detectedTopics.push(`global:${keyword}`);
      }
    }

    // Check for graph-related keywords
    let graphScore = 0;
    for (const keyword of GRAPH_KEYWORDS) {
      if (lowerQuery.includes(keyword)) {
        graphScore += 1;
        detectedTopics.push(`graph:${keyword}`);
      }
    }

    // Norminalize scores
    const maxDocScore = Math.min(documentScore, 5);
    const maxCondScore = Math.min(conditionsScore, 5);

    const documentRelevance = maxDocScore > 0 ? Math.min(1, 0.3 + (maxDocScore * 0.14)) : 0.2;
    const conditionsRelevance = maxCondScore > 0 ? Math.min(1, 0.3 + (maxCondScore * 0.14)) : 0.2;

    // If query is generic (no specific keywords) or global, both agents should contribute
    const isGenericOrGlobal = (documentScore === 0 && conditionsScore === 0) || globalScore > 2;

    return {
      requiresDocuments: documentScore > 0 || isGenericOrGlobal,
      requiresConditions: conditionsScore > 0 || isGenericOrGlobal,
      documentRelevance: isGenericOrGlobal ? 0.8 : documentRelevance,
      conditionsRelevance: isGenericOrGlobal ? 0.8 : conditionsRelevance,
      detectedTopics
    };
  }

  /**
   * Get context for Claude (GC/PC clauses + Organizer Data)
   */
  private async buildClaudeContext(clauses: Clause[], contractId: string | null): Promise<string> {
    const readerService = getDocumentReaderService();
    let context = '';

    // 1. Add Document Landscape (The "Big Picture")
    if (contractId) {
      try {
        const summary = await readerService.getContractSummary(contractId);
        if (summary.totalDocuments > 0) {
          context += `=== DOCUMENT LANDSCAPE (OVERVIEW) ===\n`;
          context += `The contract consists of ${summary.totalDocuments} primary documents across ${summary.totalChunks} sections.\n`;
          context += `Consult these categories for specific data:\n`;

          const categoryMap: Record<string, string> = {
            A: 'Agreement (Core variables, legal parties)',
            B: 'LOA (Acceptance terms, Contract Sum)',
            C: 'Conditions (GC/PC rights & obligations)',
            D: 'Addendums (Overrides/Amendments)',
            I: 'BOQ (Rates, Quantities, Pricing)',
            N: 'Schedules (Milestones, Drawings, Appendices)'
          };

          for (const doc of summary.documents) {
            context += `- [${doc.group}] ${doc.name} (${categoryMap[doc.group] || 'Other'})\n`;
          }
          context += '\n';
        }
      } catch (err) {
        console.warn('Failed to fetch document landscape for orchestrator:', err);
      }
    }

    // 2. Add Organizer Data (High priority metadata)
    if (contractId) {
      try {
        const extractedData = await readerService.getContractExtractedData(contractId);
        if (extractedData.length > 0) {
          context += `=== CONTRACT ORGANIZER: PROJECT DATA ===\n`;
          for (const data of extractedData) {
            const value = data.value ? (typeof data.value === 'string' ? data.value : JSON.stringify(data.value)) : 'Not set';
            if (value && value !== 'Not set') {
              context += `${data.field_key}: ${value}\n`;
              if (data.doc_name) context += `Source: ${data.doc_name}\n`;
            }
          }
          context += '\n';
        }
      } catch (err) {
        console.warn('Failed to fetch organizer data for orchestrator:', err);
      }
    }

    // 2.5. Add JSON Data Sources (Uploaded interactive data)
    let hasJsonSources = false;
    if (contractId) {
      try {
        const jsonSources = await getJsonDataSources(contractId);
        if (jsonSources.length > 0) {
          const jsonContext = await buildJsonContext(jsonSources, 30000);
          if (jsonContext) {
            context += jsonContext;
            hasJsonSources = true;
          }
        }
      } catch (err) {
        console.warn('Failed to add JSON data sources to orchestrator context:', err);
      }
    }

    if (clauses.length === 0 && !hasJsonSources && !context) return '';

    context += `=== CONTRACT CONDITIONS (GC/PC) ===\n`;
    if (clauses.length === 0 && hasJsonSources) {
      context += `Note: No structured clauses were found in the primary database, but raw contract data is available in the "ATTACHED JSON DATA SOURCES" section above. Use those sources to identify clauses and conditions.\n\n`;
    } else {
      context += `Total Structured Clauses: ${clauses.length}\n\n`;
    }

    // Sort by condition type (Particular first, then General)
    const sortedClauses = [...clauses].sort((a, b) => {
      if (a.condition_type === 'Particular' && b.condition_type !== 'Particular') return -1;
      if (b.condition_type === 'Particular' && a.condition_type !== 'Particular') return 1;
      return a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true });
    });

    for (const clause of sortedClauses) {
      context += `[Clause ${clause.clause_number}: ${clause.clause_title}]\n`;
      context += `Type: ${clause.condition_type || 'General'}\n`;

      if (clause.clause_text) {
        context += clause.clause_text + '\n';
      }

      if (clause.particular_condition && clause.particular_condition !== clause.clause_text) {
        context += `[PC Override]: ${clause.particular_condition}\n`;
      }

      if (clause.general_condition && clause.general_condition !== clause.clause_text) {
        context += `[GC Reference]: ${clause.general_condition}\n`;
      }

      context += '\n---\n\n';
    }

    return context;
  }

  /**
   * Query Claude for GC/PC analysis
   */
  async queryClaudeAgent(
    query: string,
    clauses: Clause[],
    conversationHistory: BotMessage[] = []
  ): Promise<AgentResponse> {
    if (!isClaudeAvailable()) {
      return {
        agent: 'claude',
        specialty: 'conditions',
        analysis: '',
        confidence: 0,
        referencedSources: [],
        error: 'Claude API key not configured'
      };
    }

    try {
      const context = await this.buildClaudeContext(clauses, null);

      if (!context) {
        return {
          agent: 'claude',
          specialty: 'conditions',
          analysis: 'No contract context or clauses (GC/PC) are loaded for analysis.',
          confidence: 0.2,
          referencedSources: []
        };
      }

      const messages: BotMessage[] = [
        ...conversationHistory,
        {
          id: 'query',
          role: 'user',
          content: query,
          timestamp: Date.now()
        }
      ];

      // Use the enhanced Claude system prompt (will be updated in next step)
      const analysis = await this.claudeProvider.chat(messages, clauses,
        this.getClaudeSpecialistPrompt() + '\n\n' + context
      );

      // Extract referenced clauses from the response
      const clauseRefs = analysis.match(/Clause\s+[\d.]+[A-Za-z]?/gi) || [];
      const referencedSources = [...new Set(clauseRefs)];

      // Calculate confidence based on clause availability and response quality
      // Boost confidence if keywords are found or if we have a lot of clauses
      let confidence = 0.5;

      if (clauses.length > 0) confidence += 0.1;
      if (analysis.length > 200) confidence += 0.1;
      if (analysis.includes('Clause') || analysis.includes('General Condition')) confidence += 0.1;

      confidence = Math.min(0.95, confidence + (clauses.length * 0.005));

      return {
        agent: 'claude',
        specialty: 'conditions',
        analysis,
        confidence,
        referencedSources
      };
    } catch (error: any) {
      console.error('Claude agent error:', error);
      return {
        agent: 'claude',
        specialty: 'conditions',
        analysis: '',
        confidence: 0,
        referencedSources: [],
        error: error.message
      };
    }
  }

  /**
   * Get the specialized system prompt for Claude GC/PC analysis
   */
  private getClaudeSpecialistPrompt(): string {
    return `# CONTRACT ADMINISTRATOR (CA) — STRICT CONTRACT-BASED AGENT: AEHab

You are **AEHab**, the dedicated Senior Contract Administrator (CA) / Supervision Consultant for the **Mivida Gardens Project** (Employer: Emaar Misr, Packages PKG01 through PKG15).

**CORE MANDATE:**
Analyze and administer construction contract packages for the Mivida Gardens project strictly based on the actual contract documents provided to you. Never invent clauses, deadlines, figures, or obligations. Accuracy is more important than producing an answer.

**PROFESSIONAL STANDARDS:**
1. Apply Mivida Gardens contract precedence: Agreement → Letter of Acceptance → Addendums → Particular Conditions → General Conditions → BOQ.
2. Quote exact figures, contract sums, percentages, timeframes, and dates from the project documentation.
3. Cite the exact contract package, document name, and clause/article number (e.g., "PKG03 — Sub-Clause 8.4").
4. If a specific figure is not present in the contract context, clearly state which document or appendix governs it — never fabricate values.
5. Provide actionable Contract Administrator determinations: contractual entitlement, procedure, and financial/operational impact.
6. Follow the 7-step interpretation sequence: FACTS → CONTRACTUAL PROVISION → CONTRACTUAL REQUIREMENT → APPLICATION → GAP/NON-COMPLIANCE → CONSEQUENCE → UNCERTAINTY.
7. Distinguish between: Contractual Fact, Project Fact, CA Assessment, and Assumption.
8. Provide thorough, detailed analysis — do not truncate answers prematurely.

**DO NOT:**
- Give generic FIDIC lectures or textbook definitions that are not grounded in the Mivida Gardens contract documents.
- Invent clause numbers, obligations, deadlines, or entitlements.
- Assume that a requirement exists because it is common in construction contracts.
- State that the Contractor "is required" to do something unless the contractual basis has been identified in the provided documents.`;
  }

  /**
   * Query OpenAI for document analysis
   */
  async queryOpenAIAgent(
    query: string,
    contractId: string,
    conversationHistory: BotMessage[] = []
  ): Promise<AgentResponse> {
    const openaiResponse = await this.openaiProvider.analyzeDocuments(
      contractId,
      query,
      conversationHistory
    );

    return {
      agent: 'openai',
      specialty: 'documents',
      analysis: openaiResponse.analysis,
      confidence: openaiResponse.confidence,
      referencedSources: openaiResponse.referencedSources,
      error: openaiResponse.error
    };
  }



  /**
   * Synthesize responses from both agents
   */
  synthesizeResponses(
    query: string,
    openaiResponse: AgentResponse | null,
    claudeResponse: AgentResponse | null,
    classification: QueryClassification
  ): SynthesizedResponse {
    const agentsUsed: ('openai' | 'claude')[] = [];
    const crossReferences: string[] = [];
    let synthesisNotes = '';

    // Handle conversational greetings directly
    const isGreeting = /^(hey|hi|hello|greetings|good\s*(morning|afternoon|evening)|who\s*are\s*you|what\s*can\s*you\s*do|help)[\s!.,?]*$/i.test(query.trim());
    if (isGreeting) {
      return {
        finalAnswer: "**Hello, I am AEHab**, your dedicated Senior Contract Administrator for the **Mivida Gardens Project** (Employer: Emaar Misr).\n\nAll contract packages **PKG01 through PKG15** are indexed and available for contractual analysis.\n\nYou can ask me about:\n- **Contractual provisions and clause interpretation**\n- **Extension of Time (EOT) and delay entitlements**\n- **Variation orders and change management**\n- **Payment certificates and financial claims**\n- **Notices, time bars, and correspondence obligations**\n- **Liquidated damages and defects liability**\n- **Termination and suspension rights**\n\nWhat contractual issue or provision would you like to review?",
        openaiInsights: null,
        claudeInsights: null,
        crossReferences: [],
        agentsUsed: ['claude'],
        synthesisNotes: 'Handled greeting directly'
      };
    }

    // Determine which responses to use based on availability and confidence
    const hasOpenAI = openaiResponse && !openaiResponse.error && openaiResponse.confidence > this.config.confidenceThreshold!;
    const hasClaude = claudeResponse && !claudeResponse.error && claudeResponse.confidence > this.config.confidenceThreshold!;

    if (hasOpenAI) agentsUsed.push('openai');
    if (hasClaude) agentsUsed.push('claude');

    // If neither agent exceeded confidence threshold, check if one has valid analysis
    if (agentsUsed.length === 0) {
      if (claudeResponse && claudeResponse.analysis && !claudeResponse.error && claudeResponse.analysis.length > 30) {
        return {
          finalAnswer: claudeResponse.analysis,
          openaiInsights: openaiResponse,
          claudeInsights: claudeResponse,
          crossReferences: [],
          agentsUsed: ['claude'],
          synthesisNotes: 'Using Conditions Specialist response'
        };
      }
      if (openaiResponse && openaiResponse.analysis && !openaiResponse.error && !openaiResponse.analysis.includes('No relevant documents found') && openaiResponse.analysis.length > 30) {
        return {
          finalAnswer: openaiResponse.analysis,
          openaiInsights: openaiResponse,
          claudeInsights: claudeResponse,
          crossReferences: [],
          agentsUsed: ['openai'],
          synthesisNotes: 'Using Document Specialist response'
        };
      }

      // Create a helpful fallback message based on why they failed
      let fallbackMsg = "I am unable to provide a detailed analysis for this query because I couldn't find a high-confidence match in the specific sections of the contract documents or clauses.\n\n";

      if (classification.requiresDocuments) {
        fallbackMsg += "🔹 Try rephrasing your search for documents (Agreement, BOQ, etc.).\n";
      }
      if (classification.requiresConditions) {
        fallbackMsg += "🔹 Ensure the General and Particular conditions are correctly loaded.\n";
      }

      fallbackMsg += "\nTip: If you are looking for a specific section like 'Appendix B', check if it is listed in the 'Organizer' tab first.";

      return {
        finalAnswer: fallbackMsg,
        openaiInsights: openaiResponse,
        claudeInsights: claudeResponse,
        crossReferences: [],
        agentsUsed: [],
        synthesisNotes: 'Fallback triggered: No agent provided sufficient confidence.'
      };
    }

    // Build the final answer
    let finalAnswer = '';

    // If only one agent responded
    if (agentsUsed.length === 1) {
      if (hasOpenAI && openaiResponse) {
        finalAnswer = openaiResponse.analysis;
        synthesisNotes = 'Response from Document Specialist only';
      } else if (hasClaude && claudeResponse) {
        finalAnswer = claudeResponse.analysis;
        synthesisNotes = 'Response from Conditions Specialist only';
      }
    } else {
      // Multiple agents responded - synthesize their insights
      finalAnswer = this.buildSynthesizedAnswer(
        openaiResponse,
        claudeResponse,
        classification
      );
      synthesisNotes = `Combined analysis from ${agentsUsed.join(' and ')}`;

      // Find cross-references between the responses
      if (openaiResponse && claudeResponse) {
        // Look for clause numbers mentioned in document analysis
        const docClauseRefs = openaiResponse.analysis.match(/Clause\s+[\d.]+[A-Za-z]?/gi) || [];
        const condClauseRefs = claudeResponse.referencedSources || [];

        // Find common references
        for (const docRef of docClauseRefs) {
          for (const condRef of condClauseRefs) {
            if (docRef.toLowerCase().includes(condRef.toLowerCase().replace('clause ', '')) ||
              condRef.toLowerCase().includes(docRef.toLowerCase().replace('clause ', ''))) {
              crossReferences.push(`${docRef} referenced in both documents and conditions`);
            }
          }
        }
      }
    }

    return {
      finalAnswer,
      openaiInsights: openaiResponse,
      claudeInsights: claudeResponse,
      crossReferences: [...new Set(crossReferences)],
      agentsUsed,
      synthesisNotes
    };
  }

  /**
   * Build a synthesized answer from both agent responses
   */
  private buildSynthesizedAnswer(
    openaiResponse: AgentResponse | null,
    claudeResponse: AgentResponse | null,
    classification: QueryClassification
  ): string {
    const parts: string[] = [];



    const documentsFirst = classification.documentRelevance > classification.conditionsRelevance;

    if (documentsFirst) {
      if (openaiResponse && openaiResponse.analysis) {
        parts.push('\n🔵 From Contract Documents (Agreement, BOQ, Schedules)\n');
        parts.push(openaiResponse.analysis);
        parts.push('\n');
      }

      if (claudeResponse && claudeResponse.analysis) {
        parts.push('\n🔵 From Contract Conditions (GC/PC)\n');
        parts.push(claudeResponse.analysis);
      }
    } else {
      if (claudeResponse && claudeResponse.analysis) {
        parts.push('\n🔵 From Contract Conditions (GC/PC)\n');
        parts.push(claudeResponse.analysis);
        parts.push('\n');
      }

      if (openaiResponse && openaiResponse.analysis) {
        parts.push('\n🔵 From Contract Documents (Agreement, BOQ, Schedules)\n');
        parts.push(openaiResponse.analysis);
      }
    }



    return parts.join('');
  }

  /**
   * Main orchestration method - query both agents and synthesize
   */
  async orchestrate(
    query: string,
    contractId: string | null,
    clauses: Clause[],
    conversationHistory: BotMessage[] = [],
    options: { forceDocumentSearch?: boolean; forceGraphSearch?: boolean } = {}
  ): Promise<SynthesizedResponse> {
    // Classify the query
    const classification = this.classifyQuery(query);

    if (options.forceDocumentSearch) {
      classification.requiresDocuments = true;
      classification.documentRelevance = 1.0;
    }

    // Check available agents
    const available = this.getAvailableAgents();

    // Prepare promises for parallel execution
    const promises: Promise<AgentResponse | null>[] = [];

    // Build shared contexts
    const claudeContext = await this.buildClaudeContext(clauses, contractId);



    // 2. Query OpenAI if documents are relevant and available
    if ((classification.requiresDocuments || this.config.alwaysUseBothAgents) &&
      available.openai && contractId) {
      promises.push(
        this.queryOpenAIAgent(query, contractId, conversationHistory)
          .catch(err => {
            console.error('OpenAI agent failed:', err);
            return null;
          })
      );
    } else {
      promises.push(Promise.resolve(null));
    }

    // 3. Query Claude if conditions are relevant and available
    if ((classification.requiresConditions || this.config.alwaysUseBothAgents) &&
      available.claude) {
      const messages: BotMessage[] = [
        ...conversationHistory,
        {
          id: 'query',
          role: 'user',
          content: query,
          timestamp: Date.now()
        }
      ];

      promises.push(
        this.claudeProvider.chat(messages, clauses, this.getClaudeSpecialistPrompt() + '\n\n' + claudeContext, contractId)
          .then(analysis => {
            const clauseRefs = analysis.match(/Clause\s+[\d.]+[A-Za-z]?/gi) || [];
            return {
              agent: 'claude',
              specialty: 'conditions',
              analysis,
              confidence: Math.min(0.9, 0.5 + (clauses.length * 0.01)),
              referencedSources: [...new Set(clauseRefs)]
            } as AgentResponse;
          })
          .catch(err => {
            console.error('Claude agent failed:', err);
            return null;
          })
      );
    } else {
      promises.push(Promise.resolve(null));
    }

    // Execute in parallel
    const [openaiResponse, claudeResponse] = await Promise.all(promises);

    // Synthesize the responses
    return this.synthesizeResponses(
      query,
      openaiResponse,
      claudeResponse,
      classification
    );
  }

  /**
   * Get a summary of agent availability and capabilities
   */
  getAgentStatus(): {
    openai: { available: boolean; name: string; specialties: string[] };
    claude: { available: boolean; name: string; specialties: string[] };
    dualAgentMode: boolean;
  } {
    const available = this.getAvailableAgents();

    return {
      openai: {
        available: available.openai,
        name: 'Document Specialist (GPT-4)',
        specialties: ['Agreement', 'BOQ', 'Schedules', 'Addendums', 'Letter of Acceptance']
      },
      claude: {
        available: available.claude,
        name: 'Conditions Specialist (Claude)',
        specialties: ['General Conditions', 'Particular Conditions', 'FIDIC Interpretation', 'Claims & Variations']
      },
      dualAgentMode: available.openai && available.claude
    };
  }
}

// Singleton instance
let orchestrator: MultiAgentOrchestrator | null = null;

export function getOrchestrator(config?: OrchestratorConfig): MultiAgentOrchestrator {
  if (!orchestrator) {
    orchestrator = new MultiAgentOrchestrator(config);
  }
  return orchestrator;
}

export default MultiAgentOrchestrator;
