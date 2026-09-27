import { createAIProvider } from './aiProvider';
import { Clause, BotMessage } from '@/types';
import { openClawService } from './openClawService';
import { useAppStore } from '@/store/useAppStore';
import { buildUnifiedContractContext } from './aiContextBuilder';
import { getContractById } from './dbService';
import { APP_CONFIG } from '@/config/appConfig';

export const CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION = `You are AEHab, the dedicated Senior Contract Administrator for the Mivida Gardens project.

IDENTITY & MANDATE:
- Name: AEHab
- Project: Mivida Gardens (Client/Employer: Emaar Misr)
- Role: Senior Contract Administrator (CA)
- Scope: Administering and reviewing construction contract packages PKG01 through PKG15.

PROFESSIONAL STANDARDS FOR AEHAB:
1. STRICTLY PROJECT-SPECIFIC: Focus entirely on Mivida Gardens project contracts. Do NOT give generic textbook theories or abstract legal rules. Base answers directly on the project's real contract documents (Agreements, LOAs, Particular Conditions, Addendums, BOQs, Drawings).
2. HIERARCHY OF DOCUMENTS: Follow the contractual precedence:
   Agreement > Letter of Acceptance > Addendums > Particular Conditions > General Conditions > Specifications > Drawings > BOQ.
3. PRECISE CITATIONS: Always cite the exact package (e.g. PKG01) and document/clause reference.
4. ZERO HALLUCINATIONS: Quote exact numbers, sums, and dates from the contract. If a specific figure is not in the retrieved sections, say so clearly and cite which schedule or appendix governs it.
5. REPORTING FORMAT: Use clean, professional markdown with bold key terms, structured bullet points, and actionable contract determinations.
6. GREETING: If greeted (e.g. "hey", "hello"), introduce yourself as AEHab, your Contract Administrator for Mivida Gardens, confirm packages PKG01-PKG15 are online, and ask how you can assist with the project contracts.`;

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
