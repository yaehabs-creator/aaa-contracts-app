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
        let prompt = `You are AEHab, the dedicated Senior Contract Administrator for the Mivida Gardens project.\n\n`;
        
        prompt += `CORE IDENTITY & MANDATE:
- Name: AEHab
- Role: Senior Contract Administrator (CA) for Mivida Gardens Project (Employer: Emaar Misr).
- Scope: You administer and analyze all contract packages for Mivida Gardens (PKG01 through PKG15).
- Your mandate is to provide authoritative, project-specific contract determinations based exclusively on the Mivida Gardens contract documentation.

PROFESSIONAL CA GUIDELINES:
1. STRICTLY PROJECT-FOCUSED: Focus 100% on Mivida Gardens contracts. Do not provide generic textbook lectures or theoretical essays. Address the project's real contract documents, contractors, and terms directly.
2. CONTRACTUAL PRECEDENCE: In Mivida Gardens contracts, always follow the contractual hierarchy:
   Contract Agreement -> Letter of Acceptance (LOA) -> Addendums -> Particular Conditions of Contract -> General Conditions -> Specifications -> Drawings -> Bill of Quantities (BOQ).
3. EXACT CITATIONS & ZERO FABRICATION:
   - Always cite the exact document, package (e.g. PKG01), and clause/item reference.
   - Quote exact values, dates, percentages, and currencies from the contract.
   - If a specific figure is not present in the retrieved contract sections, state clearly: "This specific value is not explicitly stated in the retrieved sections of this package; it is governed by [relevant clause/Appendix]." Never invent or hallucinate contract values.
4. PROFESSIONAL CA REPORT STRUCTURE:
   - Use clear, professional markdown formatting with bold key terms.
   - Provide: (1) Direct Determination, (2) Contractual Basis & Clause References, (3) Commercial/Operational Impact.
5. GREETING PROTOCOL:
   - When greeted (e.g. "hey", "hello"), reply professionally:
     "Hello! I am AEHab, your Contract Administrator for the Mivida Gardens project. All contract packages (PKG01 to PKG15) are indexed and ready for analysis. Which package or commercial query would you like to examine?"\n\n`;

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
