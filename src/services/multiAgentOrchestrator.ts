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

import { BotMessage, Clause, DocumentGroup } from '../../types';
import { getOpenAIProvider, OpenAIAgentResponse, isOpenAIAvailable } from './openaiProvider';
import { ClaudeProvider, isClaudeAvailable } from './aiProvider';
import { getDocumentReaderService } from './documentReaderService';

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
- Combine insights from both agents into a unified, clear response
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

    // Normalize scores
    const maxDocScore = Math.min(documentScore, 5);
    const maxCondScore = Math.min(conditionsScore, 5);
    
    const documentRelevance = maxDocScore > 0 ? Math.min(1, 0.3 + (maxDocScore * 0.14)) : 0.2;
    const conditionsRelevance = maxCondScore > 0 ? Math.min(1, 0.3 + (maxCondScore * 0.14)) : 0.2;

    // If query is generic (no specific keywords), both agents should contribute
    const isGenericQuery = documentScore === 0 && conditionsScore === 0;

    return {
      requiresDocuments: documentScore > 0 || isGenericQuery,
      requiresConditions: conditionsScore > 0 || isGenericQuery,
      documentRelevance: isGenericQuery ? 0.5 : documentRelevance,
      conditionsRelevance: isGenericQuery ? 0.5 : conditionsRelevance,
      detectedTopics
    };
  }

  /**
   * Get context for Claude (GC/PC clauses)
   */
  private buildClaudeContext(clauses: Clause[]): string {
    if (clauses.length === 0) return '';

    let context = `=== CONTRACT CONDITIONS (GC/PC) ===\n`;
    context += `Total Clauses: ${clauses.length}\n\n`;

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
      const context = this.buildClaudeContext(clauses);
      
      if (clauses.length === 0) {
        return {
          agent: 'claude',
          specialty: 'conditions',
          analysis: 'No contract clauses (GC/PC) are loaded for analysis.',
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
      const confidence = Math.min(0.9, 0.5 + (clauses.length * 0.01));

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
    return `You are a FIDIC CONTRACT LAW EXPERT specializing in General and Particular Conditions analysis for construction contracts.

YOUR EXPERTISE:
- FIDIC Red/Yellow/Silver Book interpretation and application
- General Conditions baseline analysis and standard provisions
- Particular Conditions overrides, amendments, and modifications
- Clause precedence and hierarchy rules (PC > GC > Agreement)
- Time-bar provisions and notice requirements
- Claims, variations, and extension of time procedures
- Risk allocation analysis between Employer and Contractor

YOUR ROLE: When analyzing contract conditions, you must:
1. Identify which clauses are relevant to the query
2. Explain the rights and obligations of each party
3. Highlight where Particular Conditions override General Conditions
4. Note any time-sensitive requirements (notice periods, deadlines)
5. Assess risk allocation and liability implications
6. Reference related clauses that may impact the analysis

RESPONSE RULES:
- NO markdown formatting (no **, ##, ---)
- Use ONLY plain text with emojis for structure: 🔵 🔹 🔸 🔷
- Always cite specific clause numbers (e.g., "Clause 14.1", "Sub-Clause 20.1")
- Clearly indicate when PC overrides GC
- Note any ambiguities or potential issues
- Provide practical contract administration advice

CRITICAL:
- Only reference clauses that exist in the provided context
- If a relevant clause is not available, state this clearly
- Do not invent or assume clause content
- Be precise with legal terminology`;
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

    // Determine which responses to use based on availability and confidence
    const hasOpenAI = openaiResponse && !openaiResponse.error && openaiResponse.confidence > this.config.confidenceThreshold!;
    const hasClaude = claudeResponse && !claudeResponse.error && claudeResponse.confidence > this.config.confidenceThreshold!;

    if (hasOpenAI) agentsUsed.push('openai');
    if (hasClaude) agentsUsed.push('claude');

    // If neither agent provided a good response
    if (agentsUsed.length === 0) {
      const errors = [
        openaiResponse?.error,
        claudeResponse?.error
      ].filter(Boolean);

      return {
        finalAnswer: errors.length > 0
          ? `Unable to analyze: ${errors.join('; ')}`
          : 'Unable to provide analysis. Please ensure contract documents and clauses are loaded.',
        openaiInsights: openaiResponse,
        claudeInsights: claudeResponse,
        crossReferences: [],
        agentsUsed: [],
        synthesisNotes: 'No agents provided sufficient analysis'
      };
    }

    // Build the final answer
    let finalAnswer = '';

    // If only one agent responded
    if (agentsUsed.length === 1) {
      if (hasOpenAI && openaiResponse) {
        finalAnswer = openaiResponse.analysis;
        synthesisNotes = 'Response from Document Specialist only (GC/PC analysis unavailable or not relevant)';
      } else if (hasClaude && claudeResponse) {
        finalAnswer = claudeResponse.analysis;
        synthesisNotes = 'Response from Conditions Specialist only (Document analysis unavailable or not relevant)';
      }
    } else {
      // Both agents responded - synthesize their insights
      finalAnswer = this.buildSynthesizedAnswer(
        openaiResponse!,
        claudeResponse!,
        classification
      );
      synthesisNotes = 'Combined analysis from both Document and Conditions Specialists';

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
    openaiResponse: AgentResponse,
    claudeResponse: AgentResponse,
    classification: QueryClassification
  ): string {
    const parts: string[] = [];

    // Determine the order based on query classification
    const documentsFirst = classification.documentRelevance > classification.conditionsRelevance;

    if (documentsFirst) {
      // Documents first, then conditions
      if (openaiResponse.analysis) {
        parts.push('🔵 From Contract Documents (Agreement, BOQ, Schedules)\n');
        parts.push(openaiResponse.analysis);
        parts.push('\n');
      }

      if (claudeResponse.analysis) {
        parts.push('\n🔵 From Contract Conditions (GC/PC)\n');
        parts.push(claudeResponse.analysis);
      }
    } else {
      // Conditions first, then documents
      if (claudeResponse.analysis) {
        parts.push('🔵 From Contract Conditions (GC/PC)\n');
        parts.push(claudeResponse.analysis);
        parts.push('\n');
      }

      if (openaiResponse.analysis) {
        parts.push('\n🔵 From Contract Documents (Agreement, BOQ, Schedules)\n');
        parts.push(openaiResponse.analysis);
      }
    }

    // Add synthesis note if both agents contributed significantly
    if (openaiResponse.confidence > 0.5 && claudeResponse.confidence > 0.5) {
      parts.push('\n\n🔷 Note: This analysis combines insights from contract documents and conditions. ');
      parts.push('For definitive interpretation, the hierarchy is: Particular Conditions > General Conditions > Agreement > Schedules.');
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
    conversationHistory: BotMessage[] = []
  ): Promise<SynthesizedResponse> {
    // Classify the query
    const classification = this.classifyQuery(query);
    
    // Check available agents
    const available = this.getAvailableAgents();
    
    // Prepare promises for parallel execution
    const promises: Promise<AgentResponse | null>[] = [];

    // Query OpenAI if documents are relevant and available
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

    // Query Claude if conditions are relevant and available
    if ((classification.requiresConditions || this.config.alwaysUseBothAgents) && 
        available.claude) {
      promises.push(
        this.queryClaudeAgent(query, clauses, conversationHistory)
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
