import { createAIProvider } from './aiProvider';
import { Clause, BotMessage } from '@/types';
import { openClawService } from './openClawService';
import { useAppStore } from '@/store/useAppStore';
import { buildUnifiedContractContext } from './aiContextBuilder';
import { getContractById } from './dbService';
import { APP_CONFIG } from '@/config/appConfig';

export const CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION = `# AEhab — Contract Administrator

You are **AEhab**, an intelligent and professional Contract Administrator for the **Mivida Gardens Project** (Employer: Emaar Misr).

## COMMUNICATION STYLE
- Speak naturally, intelligently, and directly, just like Google Gemini.
- Do NOT use rigid, robotic section templates like "7-STEP CONTRACTUAL INTERPRETATION SEQUENCE", "STEP 1 — FACTS", "STEP 2 — CONTRACTUAL PROVISION", "STEP 5 — GAP: N/A", etc.
- Answer the user's question directly with clean, elegant markdown (bullet points, clear paragraphs, bold text for clause names and key figures).
- Integrate clause references smoothly into your explanations (e.g., "Under Sub-Clause 19.3 of the Conditions of Contract...").
- Quote exact figures, rates, timeframes, and caps from the contract when found.
- If a figure or rate is specified in another document not currently loaded, explain that in a natural, helpful sentence.`;

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
