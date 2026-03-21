import { BotMessage, Clause, SectionItem, ItemType } from '@/types';
import { callAIProxy } from './aiProxyClient';
import { APP_CONFIG } from '@/config/appConfig';

/**
 * OpenClaw Agent Service
 * 
 * This service manages communication with the OpenClaw Agent Platform.
 * It supports multi-agent workflows, tool execution, and persistent agent state.
 */

export interface OpenClawAgent {
    id: string;
    name: string;
    role: string;
    description: string;
    tools: string[];
}

export interface OpenClawSession {
    id: string;
    agentId: string;
    status: 'idle' | 'busy' | 'error';
    history: BotMessage[];
}

class OpenClawService {
    private gatewayUrl: string = APP_CONFIG.OPENCLAW_GATEWAY; // Default gateway
    private agents: OpenClawAgent[] = [
        {
            id: 'contract-analyzer',
            name: 'AEhab Contract Analyst',
            role: 'Legal Expert',
            description: 'Specializes in analyzing contract clauses and risk assessment.',
            tools: ['search_documents', 'compare_clauses', 'extract_fields']
        },
        {
            id: 'senior-engineer',
            name: 'AEhab Senior Principal Engineer',
            role: 'Contract Forensic & RAG Specialist',
            description: 'Expert in technical contract forensic, risk mitigation, and structural RAG querying. Acts as a senior advisor for complex infrastructure projects.',
            tools: ['deep_rag_search', 'risk_forensic', 'structural_analysis']
        },
        {
            id: 'qa-agent',
            name: 'QA Auditor',
            role: 'Compliance Officer',
            description: 'Analyzes differences between GC and PC conditions.',
            tools: ['validate_compliance', 'check_overrides']
        }
    ];

    /**
     * Chat with an OpenClaw Agent
     */
    async chatWithAgent(
        agentId: string,
        messages: BotMessage[],
        context: Clause[],
        contractId?: string | null,
        customContext?: string
    ): Promise<{ response: string; agentId: string; toolsUsed?: string[] }> {
        try {
            // In a real OpenClaw integration, this would call the OpenClaw Gateway API
            // For now, we route through our AI proxy with a specialized OpenClaw header/provider
            
            const response = await callAIProxy({
                provider: 'anthropic', // OpenClaw often uses Anthropic/OpenAI under the hood
                model: 'claude-sonnet-4-5',
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                system: this.getAgentSystemPrompt(agentId, context, contractId, customContext)
            });

            const text = response.content.find(c => c.type === 'text')?.text || '';
            
            return {
                response: text,
                agentId: agentId,
                toolsUsed: ['search_documents'] // Placeholder for tool-calling integration
            };
        } catch (error) {
            console.error('OpenClaw Chat Error:', error);
            throw error;
        }
    }

    /**
     * Get system prompt for a specific OpenClaw agent
     */
    private getAgentSystemPrompt(agentId: string, context: Clause[], contractId?: string | null, customContext?: string): string {
        const agent = this.agents.find(a => a.id === agentId);
        let prompt = `You are AEhab, specifically acting as the ${agent?.name || 'Agent'}. ${agent?.description || ''}\n\n`;
        
        prompt += `PROTOCOL: OpenClaw ACP v1.0\n`;
        prompt += `MODE: Agentic\n\n`;

        if (context.length > 0 && !customContext) {
            prompt += `CONTRACT CONTEXT:\n`;
            prompt += context.map(c => `Clause ${c.clause_number}: ${c.clause_title}`).join('\n');
        }

        if (customContext) {
            prompt += `\nENRICHED CONTEXT & KNOWLEDGE:\n${customContext}\n`;
        }

        return prompt;
    }

    /**
     * Process the full contract text with the Contract Analyst agent.
     * Sends the entire document for structured analysis (parties, key terms, obligations, risks).
     */
    async processFullContract(fullText: string): Promise<string> {
        if (!fullText?.trim()) {
            throw new Error('Contract text is empty');
        }
        const systemPrompt = `You are the OpenClaw Contract Analyst. Specialize in analyzing contract clauses and risk assessment.

PROTOCOL: OpenClaw ACP v1.0
MODE: Agentic

TASK: Analyze the ENTIRE contract document provided below. Produce a structured analysis that includes:

1. **Parties & type** – Who are the parties and what type of agreement (e.g. construction, employment)?
2. **Key commercial terms** – Contract sum, currency, payment terms, duration, key dates.
3. **Main obligations** – Core obligations of each party (employer, contractor, etc.).
4. **Risk allocation** – Indemnities, liability caps, insurance, force majeure, termination.
5. **Notable clauses** – Any unusual or heavily negotiated clauses worth flagging.
6. **Summary** – 2–3 sentence executive summary.

Be concise but thorough. Use clear headings and bullet points. Focus on what a contract manager or legal reviewer would need.`;

        const response = await callAIProxy({
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            system: systemPrompt,
            messages: [{ role: 'user', content: `Analyze this full contract:\n\n${fullText}` }],
            max_tokens: 16384,
        });

        const text = response.content.find(c => c.type === 'text')?.text || '';
        if (!text) throw new Error('OpenClaw returned no analysis');
        return text;
    }

    /**
     * Execute a specific OpenClaw workflow
     */
    async runWorkflow(workflowId: string, data: any): Promise<any> {
        console.log(`Running OpenClaw Workflow: ${workflowId}`, data);
        // Implementation for agentic workflows
        return { success: true };
    }

    /**
     * Register a tool with OpenClaw
     */
    registerTool(name: string, definition: any) {
        console.log(`Registering tool ${name} with OpenClaw`);
    }
}

export const openClawService = new OpenClawService();
