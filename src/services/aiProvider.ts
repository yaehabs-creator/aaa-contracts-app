import { Clause, BotMessage } from '@/types';
import { callAIProxy } from "./aiProxyClient";

export interface AIProvider {
  chat(messages: BotMessage[], context: Clause[], systemInstruction: string): Promise<string>;
  getModel(): string;
  isAvailable(): boolean;
  getName(): string;
}

/**
 * Specialized system prompt for Claude as GC/PC Contract Conditions Expert
 * Used in multi-agent mode for analyzing General and Particular Conditions
 */
export const CLAUDE_GC_PC_SPECIALIST_PROMPT = `You are a FIDIC CONTRACT LAW EXPERT specializing in General and Particular Conditions analysis for construction contracts.

YOUR EXPERTISE:
- FIDIC Red/Yellow/Silver Book interpretation and application
- General Conditions baseline analysis and standard provisions  
- Particular Conditions overrides, amendments, and modifications
- Clause precedence and hierarchy rules (PC > GC > Agreement)
- Time-bar provisions and notice requirements
- Claims, variations, and extension of time (EOT) procedures
- Risk allocation analysis between Employer and Contractor
- Liquidated damages (LD) and delay analysis
- Defects liability and warranty provisions
- Force majeure and termination clauses
- Dispute resolution and arbitration procedures

YOUR ROLE: When analyzing contract conditions, you must:
1. Identify which clauses are directly relevant to the user's query
2. Explain the rights and obligations of each party (Employer, Contractor, Engineer)
3. Highlight where Particular Conditions override or amend General Conditions
4. Note any time-sensitive requirements (notice periods, response deadlines, time bars)
5. Assess risk allocation and liability implications
6. Reference related clauses that may impact the analysis
7. Provide practical contract administration guidance

RESPONSE FORMAT RULES:
- NO markdown formatting (no **, ##, ---, etc.)
- Use ONLY plain text with emojis for structure: 🔵 🔹 🔸 🔷
- One blank line between sections
- Keep bullet points on single lines
- Maximum 2-3 lines per explanation

CITATION RULES:
- ALWAYS cite specific clause numbers (e.g., "Clause 14.1", "Sub-Clause 20.1")  
- Use format: "Clause X.X" or "Sub-Clause X.X.X" for consistency
- When PC overrides GC, clearly state: "PC Clause X overrides GC Clause X"
- Note any cross-references between clauses

CRITICAL CONSTRAINTS:
- ONLY reference clauses that exist in the provided context
- If a relevant clause is not available, state: "Clause X.X is not available in the loaded contract"
- Do NOT invent or assume clause content
- Do NOT make up clause numbers
- Be precise with legal terminology
- If uncertain, acknowledge the limitation

EXAMPLE RESPONSE FORMAT:

🔵 Relevant Clauses
🔹 Clause 14.1 — Contract Price
🔸 Defines the lump sum contract price and adjustment mechanisms

🔵 Key Obligations
🔹 Employer obligations
🔸 Payment within 56 days of certificate (Clause 14.7)
🔹 Contractor obligations  
🔸 Submit monthly statements by day 28 (Clause 14.3)

🔵 PC Overrides
🔹 PC Clause 14.1 modifies payment terms
🔸 Payment period reduced from 56 to 42 days

🔷 Related clauses you may want to explore:
- Clause 14.8 (Delayed Payment)
- Clause 20.1 (Claims Procedure)`;

/**
 * Default system prompt for general contract chat (backwards compatible)
 */
export const CLAUDE_DEFAULT_SYSTEM_PROMPT = `You are CLAUDE CONTRACT EXPERT — a specialized AI in construction contracts, FIDIC conditions, claims, delays, variations, payments, EOT, LDs, and contract administration.

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
- Use only clauses the user provides
- CITE CLAUSES PRECISELY: When referring to a clause, always use the format "Clause X" or "Clause X.X" so I can link to it.`;

export interface ClaudeAgentResponse {
  agent: 'claude';
  specialty: 'conditions';
  analysis: string;
  confidence: number;
  referencedSources: string[];
  error?: string;
}

// Claude models - use official aliases (no dated versions needed)
const CLAUDE_MODELS = [
  "claude-sonnet-4-5",    // Claude Sonnet 4.5 (recommended default)
  "claude-haiku-4-5",     // Claude Haiku 4.5 (fast fallback)
  "claude-opus-4-5",      // Claude Opus 4.5 (most capable fallback)
];

// Rate limit state management
interface RateLimitState {
  isLimited: boolean;
  retryAfter: number | null;
  lastAttempt: number;
}

let rateLimitState: RateLimitState = {
  isLimited: false,
  retryAfter: null,
  lastAttempt: 0
};

// Global request lock to prevent multiple simultaneous requests
let requestInFlight = false;

/**
 * Get the current rate limit status for UI feedback
 */
export function getRateLimitStatus(): { isLimited: boolean; retryAfterMs: number | null } {
  if (!rateLimitState.isLimited) {
    return { isLimited: false, retryAfterMs: null };
  }

  const elapsed = Date.now() - rateLimitState.lastAttempt;
  const remaining = rateLimitState.retryAfter ? (rateLimitState.retryAfter * 1000) - elapsed : null;

  if (remaining !== null && remaining <= 0) {
    rateLimitState.isLimited = false;
    return { isLimited: false, retryAfterMs: null };
  }

  return { isLimited: true, retryAfterMs: remaining };
}

/**
 * Call AI proxy with automatic retry and exponential backoff for rate limits
 */
async function callClaudeViaProxy(
  model: string,
  system: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 4096,
  maxAttempts: number = 5
): Promise<{ content: Array<{ type: string; text: string }> }> {
  let attempt = 0;
  let backoffMs = 500;

  while (attempt < maxAttempts) {
    try {
      const response = await callAIProxy({
        provider: 'anthropic',
        model,
        system,
        messages,
        max_tokens: maxTokens,
      });

      // Success - clear rate limit state
      rateLimitState.isLimited = false;
      rateLimitState.retryAfter = null;

      return response;
    } catch (err: any) {
      const isRateLimited = err.message?.includes('429') || err.message?.includes('rate limit');
      const isOverloaded = err.message?.includes('529') || err.message?.includes('overload');
      const isRetryable = isRateLimited || isOverloaded;

      if (!isRetryable) {
        throw err;
      }

      // Update rate limit state for UI feedback
      rateLimitState.isLimited = true;
      rateLimitState.lastAttempt = Date.now();

      const waitMs = backoffMs;

      console.warn(`Claude API rate limited (attempt ${attempt + 1}/${maxAttempts}). Retrying in ${waitMs}ms...`);

      await new Promise(resolve => setTimeout(resolve, waitMs));

      attempt++;
      backoffMs = Math.min(backoffMs * 2, 8000);
    }
  }

  throw new Error("Claude API rate-limited (max retry attempts reached). Please wait a moment and try again.");
}

export class ClaudeProvider implements AIProvider {
  private model: string = CLAUDE_MODELS[0];

  // Try multiple model names in order of preference
  private modelCandidates = CLAUDE_MODELS;

  constructor() {
    // API keys are now server-side via /api/ai-proxy
    // No client-side key needed
    console.log('ClaudeProvider initialized (using server-side AI proxy)');
  }

  isAvailable(): boolean {
    // Always available — the proxy handles auth server-side
    return true;
  }

  getName(): string {
    return 'Claude GC/PC Specialist';
  }

  getModel(): string {
    return this.model;
  }

  /**
   * Get the specialty of this provider
   */
  getSpecialty(): string {
    return 'General & Particular Conditions';
  }

  /**
   * Analyze contract conditions with specialized GC/PC expertise
   * Used by the multi-agent orchestrator
   */
  async analyzeConditions(
    query: string,
    clauses: Clause[],
    conversationHistory: BotMessage[] = []
  ): Promise<ClaudeAgentResponse> {
    if (!this.isAvailable()) {
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
      if (clauses.length === 0) {
        return {
          agent: 'claude',
          specialty: 'conditions',
          analysis: 'No contract clauses (GC/PC) are loaded for analysis. Please load a contract with General and/or Particular Conditions.',
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

      // Use specialized GC/PC system prompt
      const analysis = await this.chat(messages, clauses, CLAUDE_GC_PC_SPECIALIST_PROMPT);

      // Extract referenced clauses from the response
      const clauseRefs = analysis.match(/Clause\s+[\d.]+[A-Za-z]?/gi) || [];
      const subClauseRefs = analysis.match(/Sub-Clause\s+[\d.]+[A-Za-z]?/gi) || [];
      const referencedSources = [...new Set([...clauseRefs, ...subClauseRefs])];

      // Calculate confidence based on clause availability
      const confidence = Math.min(0.95, 0.5 + (clauses.length * 0.005) + (referencedSources.length * 0.05));

      return {
        agent: 'claude',
        specialty: 'conditions',
        analysis,
        confidence,
        referencedSources
      };
    } catch (error: any) {
      console.error('Claude conditions analysis error:', error);
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

  async chat(messages: BotMessage[], context: Clause[], systemInstruction: string, contractId?: string | null): Promise<string> {
    // Prevent multiple simultaneous requests
    if (requestInFlight) {
      throw new Error('A request is already in progress. Please wait.');
    }

    // Check if we're currently rate limited
    const limitStatus = getRateLimitStatus();
    if (limitStatus.isLimited && limitStatus.retryAfterMs) {
      const seconds = Math.ceil(limitStatus.retryAfterMs / 1000);
      throw new Error(`Rate limited. Please wait ${seconds} seconds before trying again.`);
    }

    requestInFlight = true;

    try {
      let contextText = '';

      // If we have a contractId, use the unified context builder (which includes JSON Data Sources)
      if (contractId) {
        try {
          // Dynamic import to avoid circular dependency
          const { buildUnifiedContractContext } = await import('./aiBotService');
          const unifiedContext = await buildUnifiedContractContext(contractId, context, { includeDocumentChunks: true });
          contextText = `\n\n=== CONTRACT CONTEXT ===\n${unifiedContext.context}`;
        } catch (ctxError) {
          console.warn('Failed to build unified context in ClaudeProvider:', ctxError);
        }
      }

      // Fallback: If unified context failed or no contractId, use the basic context builder
      if (!contextText && context.length > 0) {
        const MAX_CLAUSE_LENGTH = 5000;
        contextText = `\n\nCURRENT CONTRACT CLAUSES (${context.length} clauses):\n${context.map(c => {
          const fullText = c.clause_text || '';
          const displayText = fullText.length > MAX_CLAUSE_LENGTH
            ? fullText.substring(0, MAX_CLAUSE_LENGTH) + '... [truncated]'
            : fullText;

          let clauseContent = `Clause ${c.clause_number}: ${c.clause_title}\n`;
          clauseContent += `[${c.condition_type || 'General'}]\n`;
          clauseContent += displayText;

          if (c.particular_condition && c.particular_condition !== fullText) {
            const pcText = c.particular_condition.length > MAX_CLAUSE_LENGTH
              ? c.particular_condition.substring(0, MAX_CLAUSE_LENGTH) + '... [truncated]'
              : c.particular_condition;
            clauseContent += `\n[Particular Condition Override]:\n${pcText}`;
          }

          return clauseContent;
        }).join('\n\n---\n\n')}`;
      }

      // Convert BotMessages to simple format
      const proxyMessages = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // If context is provided, append it to the LAST user message
      if (contextText && proxyMessages.length > 0) {
        const lastMsg = proxyMessages[proxyMessages.length - 1];
        if (lastMsg.role === 'user') {
          lastMsg.content += contextText;
        }
      }

      // Call through the proxy with retry
      const response = await callClaudeViaProxy(
        this.model,
        systemInstruction,
        proxyMessages,
        4096
      );

      // Extract text content from response
      const content = response.content.find(c => c.type === 'text');
      return content?.text || 'No response received';
    } finally {
      requestInFlight = false;
    }
  }
}

export function createAIProvider(): AIProvider {
  return new ClaudeProvider();
}

export function isClaudeAvailable(): boolean {
  // Always available — keys are server-side
  return true;
}

/**
 * Check if a request is currently in flight
 */
export function isRequestInFlight(): boolean {
  return requestInFlight;
}
