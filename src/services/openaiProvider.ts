/**
 * OpenAI Provider Service
 * Document Specialist Agent for contract document analysis
 * 
 * Specializes in:
 * - Form of Agreement (Group A)
 * - Letter of Acceptance (Group B)
 * - Addendums (Group D)
 * - BOQ & Pricing (Group I)
 * - Schedules & Annexes (Group N)
 */

import { BotMessage, DocumentGroup } from '@/types';
import { getDocumentReaderService, DocumentChunkContent } from './documentReaderService';
import { getEmbeddingService } from './embeddingService';

// OpenAI configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4-turbo-preview';

// Document groups this agent specializes in
export const OPENAI_DOCUMENT_GROUPS: DocumentGroup[] = [
  DocumentGroup.A, // Form of Agreement
  DocumentGroup.B, // Letter of Acceptance
  DocumentGroup.D, // Addendums
  DocumentGroup.I, // BOQ
  DocumentGroup.N  // Schedules
];

// System prompt for the Document Specialist
const DOCUMENT_SPECIALIST_SYSTEM_PROMPT = `You are a SENIOR CONTRACT ENGINEER specializing in commercial and contractual documentation analysis for construction contracts.

YOUR EXPERTISE:
- Form of Agreement & Contract Appendices (interpreting contract formation documents)
- Letter of Acceptance terms (understanding acceptance conditions and binding commitments)
- Bill of Quantities & Pricing Schedules (analyzing rates, quantities, and pricing structures)
- Technical Schedules & Specifications (understanding scope of works and technical requirements)
- Addendums & Clarifications (tracking contract modifications and their implications)

YOUR ROLE: When analyzing uploaded contract documents, you must:
1. Extract and explain financial terms, rates, and pricing structures
2. Identify milestone schedules, payment terms, and deliverables
3. Highlight technical requirements and specifications
4. Clarify commercial obligations and entitlements
5. Note any amendments or clarifications from addendums

RESPONSE STYLE:
- Be precise and cite specific document sections when possible
- Use clear, professional language suitable for contract administration
- Highlight commercial and financial implications
- Note any ambiguities or areas requiring clarification
- Reference specific page numbers, sections, or item numbers when available

CRITICAL RULES:
- Only reference information that exists in the provided document context
- If information is not available in the documents, clearly state this
- Do not make assumptions about terms not explicitly stated
- When citing amounts or rates, quote them exactly as they appear
- Flag any inconsistencies between documents

FORMAT YOUR RESPONSES:
- Use clear section headers for different topics
- Present financial data in structured formats when appropriate
- List key points and obligations clearly
- Summarize implications at the end of complex analyses`;

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface OpenAIAgentResponse {
  agent: 'openai';
  specialty: 'documents';
  analysis: string;
  confidence: number;
  referencedSources: string[];
  documentGroups: DocumentGroup[];
  error?: string;
}

export class OpenAIProvider {
  private apiKey: string | null = null;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: OpenAIProviderConfig = {}) {
    // Try multiple environment variable formats
    this.apiKey = config.apiKey ||
      import.meta.env.VITE_OPENAI_API_KEY ||
      process.env.VITE_OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      null;

    this.model = config.model ||
      import.meta.env.VITE_OPENAI_MODEL ||
      process.env.VITE_OPENAI_MODEL ||
      DEFAULT_MODEL;

    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.3; // Lower temperature for more precise analysis

    if (this.apiKey) {
      console.log('OpenAI Provider initialized (key length:', this.apiKey.length, ')');
    } else {
      console.warn('OpenAI API key not found. Document specialist will not be available.');
    }
  }

  /**
   * Check if the OpenAI provider is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get the model being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get the name of this provider
   */
  getName(): string {
    return 'OpenAI Document Specialist';
  }

  /**
   * Get the document groups this agent specializes in
   */
  getSpecializedGroups(): DocumentGroup[] {
    return OPENAI_DOCUMENT_GROUPS;
  }

  /**
   * Fetch relevant document context for a query
   */
  async getDocumentContext(
    contractId: string,
    query: string,
    options: {
      maxChunks?: number;
      useVectorSearch?: boolean;
    } = {}
  ): Promise<{
    context: string;
    chunks: DocumentChunkContent[];
    documentGroups: DocumentGroup[];
  }> {
    const { maxChunks = 20, useVectorSearch = true } = options;
    const readerService = getDocumentReaderService();
    let chunks: DocumentChunkContent[] = [];
    const foundGroups = new Set<DocumentGroup>();

    try {
      // Try vector search first for semantic relevance
      if (useVectorSearch) {
        try {
          const embeddingService = getEmbeddingService();
          const embeddings = await embeddingService.generateEmbeddings(query);
          
          if (embeddings && embeddings.length > 0) {
            const vectorResults = await readerService.searchSimilarChunks(
              contractId,
              embeddings[0],
              { limit: maxChunks, threshold: 0.5 }
            );
            chunks = vectorResults;
          }
        } catch (err) {
          console.warn('Vector search failed, falling back to text search:', err);
        }
      }

      // Fall back to text search if vector search didn't return results
      if (chunks.length === 0) {
        chunks = await readerService.searchDocuments(contractId, query, {
          limit: maxChunks,
          documentGroups: OPENAI_DOCUMENT_GROUPS
        });
      }

      // Also get document summary for context
      const summary = await readerService.getContractSummary(contractId);
      
      // Build context string
      let context = `=== DOCUMENT ANALYSIS CONTEXT ===\n`;
      context += `Contract Documents Available:\n`;
      
      for (const doc of summary.documents) {
        if (OPENAI_DOCUMENT_GROUPS.includes(doc.group)) {
          const groupLabel = this.getGroupLabel(doc.group);
          context += `- [${groupLabel}] ${doc.name} (${doc.chunkCount} sections)\n`;
          foundGroups.add(doc.group);
        }
      }
      context += `\n`;

      // Add relevant chunks
      if (chunks.length > 0) {
        context += `=== RELEVANT DOCUMENT SECTIONS ===\n\n`;
        
        for (const chunk of chunks) {
          if (chunk.clauseNumber) {
            context += `[Section ${chunk.clauseNumber}${chunk.clauseTitle ? ': ' + chunk.clauseTitle : ''}]\n`;
          }
          context += chunk.content + '\n\n---\n\n';
        }
      }

      return {
        context,
        chunks,
        documentGroups: Array.from(foundGroups)
      };
    } catch (error) {
      console.error('Error fetching document context:', error);
      return {
        context: 'Unable to fetch document context.',
        chunks: [],
        documentGroups: []
      };
    }
  }

  /**
   * Get human-readable label for document group
   */
  private getGroupLabel(group: DocumentGroup): string {
    const labels: Record<DocumentGroup, string> = {
      [DocumentGroup.A]: 'Agreement',
      [DocumentGroup.B]: 'Letter of Acceptance',
      [DocumentGroup.C]: 'Conditions',
      [DocumentGroup.D]: 'Addendum',
      [DocumentGroup.I]: 'BOQ/Pricing',
      [DocumentGroup.N]: 'Schedule'
    };
    return labels[group] || group;
  }

  /**
   * Chat with the Document Specialist agent
   */
  async chat(
    messages: BotMessage[],
    documentContext: string,
    customSystemPrompt?: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const systemPrompt = customSystemPrompt || DOCUMENT_SPECIALIST_SYSTEM_PROMPT;

    // Build the full system message with document context
    const fullSystemMessage = documentContext
      ? `${systemPrompt}\n\n${documentContext}`
      : systemPrompt;

    // Convert messages to OpenAI format
    const openaiMessages = [
      { role: 'system', content: fullSystemMessage },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: openaiMessages,
          max_tokens: this.maxTokens,
          temperature: this.temperature
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || 
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response received from OpenAI';
    } catch (error: any) {
      console.error('OpenAI chat error:', error);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Analyze documents for a specific query
   * This is the main method used by the orchestrator
   */
  async analyzeDocuments(
    contractId: string,
    query: string,
    conversationHistory: BotMessage[] = []
  ): Promise<OpenAIAgentResponse> {
    if (!this.isAvailable()) {
      return {
        agent: 'openai',
        specialty: 'documents',
        analysis: '',
        confidence: 0,
        referencedSources: [],
        documentGroups: [],
        error: 'OpenAI API key not configured'
      };
    }

    try {
      // Get relevant document context
      const { context, chunks, documentGroups } = await this.getDocumentContext(
        contractId,
        query
      );

      // If no documents found, return low confidence response
      if (chunks.length === 0) {
        return {
          agent: 'openai',
          specialty: 'documents',
          analysis: 'No relevant documents found for this query. The contract may not have uploaded documents in the Agreement, BOQ, Schedules, or Addendum categories.',
          confidence: 0.2,
          referencedSources: [],
          documentGroups: []
        };
      }

      // Build conversation with the query
      const messages: BotMessage[] = [
        ...conversationHistory,
        {
          id: 'query',
          role: 'user',
          content: query,
          timestamp: Date.now()
        }
      ];

      // Get analysis from OpenAI
      const analysis = await this.chat(messages, context);

      // Extract referenced sources from chunks
      const referencedSources = chunks
        .filter(c => c.clauseNumber || c.clauseTitle)
        .map(c => c.clauseNumber 
          ? `Section ${c.clauseNumber}${c.clauseTitle ? ': ' + c.clauseTitle : ''}`
          : c.clauseTitle || 'Document section'
        )
        .filter((v, i, a) => a.indexOf(v) === i); // Deduplicate

      // Calculate confidence based on search results quality
      const confidence = Math.min(0.9, 0.5 + (chunks.length * 0.02));

      return {
        agent: 'openai',
        specialty: 'documents',
        analysis,
        confidence,
        referencedSources,
        documentGroups
      };
    } catch (error: any) {
      console.error('Document analysis error:', error);
      return {
        agent: 'openai',
        specialty: 'documents',
        analysis: '',
        confidence: 0,
        referencedSources: [],
        documentGroups: [],
        error: error.message
      };
    }
  }
}

// Singleton instance
let openaiProvider: OpenAIProvider | null = null;

export function getOpenAIProvider(): OpenAIProvider {
  if (!openaiProvider) {
    openaiProvider = new OpenAIProvider();
  }
  return openaiProvider;
}

export function isOpenAIAvailable(): boolean {
  return getOpenAIProvider().isAvailable();
}

export default OpenAIProvider;
