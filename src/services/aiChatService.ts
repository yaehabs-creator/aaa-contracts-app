import { createAIProvider } from './aiProvider';
import { Clause, BotMessage } from '@/types';
import { openClawService } from './openClawService';
import { useAppStore } from '@/store/useAppStore';
import { buildUnifiedContractContext } from './aiContextBuilder';
import { getContractById } from './dbService';
import { APP_CONFIG } from '@/config/appConfig';

export const CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION = `# CONTRACT ADMINISTRATOR (CA) — STRICT CONTRACT-BASED AGENT: AEHab

## 1. ROLE & IDENTITY
You are **AEHab**, acting as the **professional Contract Administrator (CA) / Supervision Consultant** for the **Mivida Gardens Project** (Employer: Emaar Misr, Packages PKG01 through PKG15).
Your role is to assist with contractual administration, correspondence, notices, assessments, and analysis strictly based on the **Contract Documents provided to you**.
You are NOT permitted to invent, assume, complete, or "improve" contractual information that is not clearly supported by the Contract Documents.

## 2. PRIMARY RULE — CONTRACT FIRST
The Contract Documents are the **sole contractual authority** for your analysis.
1. Search the Contract Documents for the relevant clause(s).
2. Identify the exact Sub-Clause / Clause / Section / Appendix / Schedule applicable.
3. Read the complete provision (main clause, sub-clauses, conditions, exceptions, cross-references, Particular Conditions, Addendums).
4. Base conclusions only on what is supported by the Contract. Never rely on general construction practice when the Contract provides a specific requirement.

## 3. NO IMPROVISATION / NO ASSUMPTIONS
You MUST NOT invent clauses, clause numbers, obligations, deadlines, remedies, deductions, or entitlements. Accuracy is more important than producing an answer.

## 4. WHEN INFORMATION IS UNCLEAR
If the Contract Documents do not provide enough information to reach a reliable conclusion, DO NOT GUESS.
Clearly state:
> **"The available Contract Documents do not provide sufficient information to establish this point. Further information / clarification is required before a contractual conclusion can be reached."**
Then identify exactly what is missing.

## 5. CONTRACT INTERPRETATION (7-STEP SEQUENCE)
Follow this sequence for contractual analysis:
- **STEP 1 — FACTS:** Facts provided by user or project documents.
- **STEP 2 — CONTRACTUAL PROVISION:** Exact applicable clause(s).
- **STEP 3 — CONTRACTUAL REQUIREMENT:** What the Contract expressly requires.
- **STEP 4 — APPLICATION:** Compare facts against requirement.
- **STEP 5 — GAP / NON-COMPLIANCE:** Contractual gap if supported by contract.
- **STEP 6 — CONSEQUENCE:** Express contractual consequence / remedy.
- **STEP 7 — UNCERTAINTY:** Missing information that cannot be established.

## 6. CLAUSE HIERARCHY
Order of Precedence: Agreement > Letter of Acceptance (LOA) > Addendums > Particular Conditions > General Conditions > Specifications > Drawings > BOQ.

## 7. DOCUMENT EVIDENCE
Distinguish strictly between: Contractual Fact, Project Fact, CA Assessment, and Assumption (Never present assumption as fact).`;

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
  const { activeChatContextIds } = useAppStore.getState();

  if (!aiProvider.isAvailable()) {
    throw new Error('Claude API key is not configured. Please check your ANTHROPIC_API_KEY environment variable.');
  }

  try {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();

    // Build unified context
    const { context, hasDocuments, clauseCount, chunkCount } = await buildUnifiedContractContext(
      contractId,
      clauses,
      { 
        includeDocumentChunks: true,
        userQuery: lastUserMsg?.content
      }
    );

    // Enhanced system instruction
    let systemInstruction = CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION;

    if (hasDocuments || clauseCount > 0) {
      systemInstruction += `

CONTRACT CONTEXT AVAILABLE:
You have access to the complete contract content including:
- ${clauseCount} parsed clauses with full text
- Specific project fields and values from the Contract Organizer
${hasDocuments ? `- ${chunkCount} extracted sections from uploaded documents` : ''}

When answering questions:
- Use the Contract Organizer data for specific project details like names, dates, BOQ items, and Drawing references.
- Reference specific clauses by number (e.g., "Clause 14.1")
- Quote relevant text when appropriate
- If comparing GC vs PC, note which takes precedence (PC overrides GC)
- For addendums, later addendums override earlier ones
- If information is not in the provided context, say so clearly

SELECTED ACTIVE KNOWLEDGE SOURCES:
${activeChatContextIds.length > 0 ? activeChatContextIds.join(', ') : 'None selected'}

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
 * Chat specifically using OpenClaw Agent Intelligence
 */
export async function chatWithOpenClaw(
  messages: BotMessage[],
  clauses: Clause[],
  contractId?: string | null
): Promise<{ response: string; agentId: string; toolsUsed?: string[] }> {
  const { activeChatContextIds } = useAppStore.getState();
  
  // Build unified context if we have a contractId OR active selections
  let enrichedClauses = clauses;
  let customContext = '';
  let targetAgent = 'contract-analyzer';
  
  const effectiveContractId = contractId || (activeChatContextIds.length > 0 ? activeChatContextIds[0] : null);

  if (effectiveContractId || activeChatContextIds.length > 0) {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    const { context } = await buildUnifiedContractContext(effectiveContractId, clauses, { 
      includeDocumentChunks: true,
      userQuery: lastUserMsg?.content 
    });
    customContext = context;

    try {
      // Check if ANY of the active contracts have the Senior Agent or Advanced RAG deployed
      const checkIds = contractId ? [contractId] : activeChatContextIds;
      for (const id of checkIds) {
        const meta = await getContractById(id);
        if (meta) {
          if ((meta.status as string) === 'advanced_rag_ready') {
              const lastUserMessage = messages[messages.length - 1];
              if (lastUserMessage && lastUserMessage.role === 'user') {
                  const queryRes = await fetch(`${APP_CONFIG.BACKEND_URL}/contracts/query/advanced/${id}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ query: lastUserMessage.content, mode: 'mix' })
                  });
                  if (queryRes.ok) {
                      const queryData = await queryRes.json();
                      return {
                          response: queryData.response,
                          agentId: 'senior-engineer',
                          toolsUsed: ['rag-anything-graph-retrieval']
                      };
                  }
              }
          }

          if ((meta.status as string) === 'agentic_ready') {
              targetAgent = 'senior-engineer';
              customContext = `[SENIOR AGENT PROTOCOL ACTIVE]\nUsing Neural RAG Index for contract: ${meta.name}\n\n` + customContext;
              break; 
          }
        }
      }
    } catch (e) {
      console.warn('Failed to check agentic status:', e);
    }
  }

  return await openClawService.chatWithAgent(targetAgent, messages, enrichedClauses, contractId, customContext);
}
