import { isClaudeAvailable } from './aiProvider';
import { isOpenAIAvailable } from './openaiProvider';
import { getOrchestrator, SynthesizedResponse } from './multiAgentOrchestrator';
import { useAppStore } from '@/store/useAppStore';
import { Clause, BotMessage } from '@/types';
import { UploadedContract } from '@/contexts/ChatContext';
import { getUploadedContractContext } from './chatContractUploadService';
import { chatWithBot, chatWithOpenClaw } from './aiChatService';
import { fetchKnowledgeContext } from './aiKnowledgeService';

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
  openClaw: { available: boolean; active: boolean; gateway: string };
  dualAgentMode: boolean;
} {
  const orchestrator = getOrchestrator();
  const state = useAppStore.getState();
  return {
    ...orchestrator.getAgentStatus(),
    openClaw: {
      available: true,
      active: state.isOpenClawActive,
      gateway: state.openClawGateway
    }
  };
}

/**
 * Chat with dual AI agents (OpenAI for documents, Claude for GC/PC)
 */
export async function chatWithDualAgents(
  messages: BotMessage[],
  clauses: Clause[],
  contractId: string | null,
  options: {
    forceBothAgents?: boolean;
    forceDocumentSearch?: boolean;
    forceGraphSearch?: boolean;
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
    conversationHistory,
    {
      forceDocumentSearch: options.forceDocumentSearch,
      forceGraphSearch: options.forceGraphSearch
    }
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
 */
export async function chatWithSmartRouting(
  messages: BotMessage[],
  clauses: Clause[],
  contractId: string | null,
  uploadedContract?: UploadedContract | null
): Promise<{
  response: string;
  mode: 'dual' | 'claude-only' | 'openai-only' | 'unavailable';
  agentsUsed: string[];
  crossReferences?: string[];
}> {
  let effectiveMessages = messages;
  if (uploadedContract && messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last.role === 'user') {
      const context = getUploadedContractContext(uploadedContract, last.content);
      effectiveMessages = [
        ...messages.slice(0, -1),
        { ...last, content: `${context}\n\n--- USER QUESTION ---\n${last.content}` }
      ];
    }
  }

  const agentStatus = getAgentStatus();

  // If OpenClaw is active, use it for "complete" agentic experience
  if (agentStatus.openClaw.active) {
    try {
      const result = await chatWithOpenClaw(effectiveMessages, clauses, contractId);
      return {
        response: result.response,
        mode: 'dual',
        agentsUsed: [result.agentId, ...(result.toolsUsed || [])],
        crossReferences: []
      };
    } catch (error) {
      console.warn('OpenClaw failed, falling back to standard orchestrator:', error);
    }
  }

  // Pre-check for knowledge hub content
  let knowledgeInjected = false;
  try {
    const knowledge = await fetchKnowledgeContext();
    if (knowledge && knowledge.length > 100) {
      knowledgeInjected = true;
    }
  } catch (e) {}

  // If both agents are available, use dual-agent mode
  if (agentStatus.dualAgentMode && contractId) {
    try {
      const result = await chatWithDualAgents(effectiveMessages, clauses, contractId);
      return {
        response: result.response,
        mode: result.isDualMode ? 'dual' : (result.agentsUsed[0] === 'claude' ? 'claude-only' : 'openai-only'),
        agentsUsed: knowledgeInjected ? [...result.agentsUsed, 'Knowledge Hub'] : result.agentsUsed,
        crossReferences: result.synthesizedResponse.crossReferences
      };
    } catch (error) {
      console.warn('Dual-agent mode failed, falling back to single agent:', error);
    }
  }

  // Fall back to Claude-only mode
  if (agentStatus.claude.available) {
    try {
      const response = await chatWithBot(effectiveMessages, clauses, contractId);
      return {
        response,
        mode: 'claude-only',
        agentsUsed: knowledgeInjected ? ['claude', 'Knowledge Hub'] : ['claude']
      };
    } catch (error) {
      console.error('Claude-only mode failed:', error);
    }
  }

  // If Claude is not available but OpenAI is, use OpenAI only
  if (agentStatus.openai.available && contractId) {
    try {
      const orchestrator = getOrchestrator();
      // Using bracket notation to access potentially private method if needed, 
      // but ideally we should expose a public way or just call orchestrate
      const openaiResponse = await (orchestrator as any).queryOpenAIAgent(
        effectiveMessages[effectiveMessages.length - 1]?.content || '',
        contractId,
        effectiveMessages.slice(0, -1)
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
    response: 'No AI agents are available. Please configure your API keys.',
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

  summary += `📄 Document Specialist (OpenAI GPT-4)\n`;
  summary += `Status: ${status.openai.available ? '✅ Available' : '❌ Not Configured'}\n`;
  if (status.openai.available) {
    summary += `Specialties: ${status.openai.specialties.join(', ')}\n`;
  }
  summary += '\n';

  summary += `📜 Conditions Specialist (Claude)\n`;
  summary += `Status: ${status.claude.available ? '✅ Available' : '❌ Not Configured'}\n`;
  if (status.claude.available) {
    summary += `Specialties: ${status.claude.specialties.join(', ')}\n`;
  }
  summary += '\n';

  if (status.dualAgentMode) {
    summary += `🔄 Dual-Agent Mode: ✅ ACTIVE\n`;
    summary += `Both agents will collaborate to provide comprehensive analysis.\n`;
  } else {
    summary += `🔄 Dual-Agent Mode: ❌ Not Available\n`;
    summary += `Configure both API keys to enable collaborative analysis.\n`;
  }

  return summary;
}
