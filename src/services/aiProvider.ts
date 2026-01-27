import Anthropic from "@anthropic-ai/sdk";
import { Clause, BotMessage } from "../../types";

export interface AIProvider {
  chat(messages: BotMessage[], context: Clause[], systemInstruction: string): Promise<string>;
  getModel(): string;
  isAvailable(): boolean;
  getName(): string;
}

export class ClaudeProvider implements AIProvider {
  private client: Anthropic | null = null;
  private model: string = 'claude-sonnet-4-5-20250514';
  
  // Try multiple model names in order of preference
  private modelCandidates = [
    'claude-sonnet-4-5-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307'
  ];

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('ClaudeProvider constructor - API key check:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 15) || 'none',
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('ANTHROPIC') || k.includes('API'))
    });
    if (apiKey) {
      try {
        // Allow browser usage - API key is injected at build time via Vite, not exposed in client code
        this.client = new Anthropic({
          apiKey,
          dangerouslyAllowBrowser: true
        });
        console.log('Claude client initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Claude client:', error);
      }
    } else {
      console.warn('ANTHROPIC_API_KEY not found in process.env');
    }
  }

  isAvailable(): boolean {
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    const hasClient = this.client !== null;
    const available = hasClient && hasKey;
    console.log('Claude isAvailable check:', { hasKey, hasClient, available });
    return available;
  }

  getName(): string {
    return 'Claude';
  }

  getModel(): string {
    return this.model;
  }

  async chat(messages: BotMessage[], context: Clause[], systemInstruction: string): Promise<string> {
    if (!this.client) {
      throw new Error('Anthropic API key is not configured');
    }

    // Build context from clauses - include FULL clause text, not truncated
    // Smart truncation: only truncate extremely large clauses (>5000 chars)
    const MAX_CLAUSE_LENGTH = 5000;
    const contextText = context.length > 0
      ? `\n\nCURRENT CONTRACT CLAUSES (${context.length} clauses):\n${context.map(c => {
        const fullText = c.clause_text || '';
        const displayText = fullText.length > MAX_CLAUSE_LENGTH 
          ? fullText.substring(0, MAX_CLAUSE_LENGTH) + '... [truncated]'
          : fullText;
        
        // Include both GC and PC text if available
        let clauseContent = `Clause ${c.clause_number}: ${c.clause_title}\n`;
        clauseContent += `[${c.condition_type || 'General'}]\n`;
        clauseContent += displayText;
        
        // Add PC override if exists and different from main text
        if (c.particular_condition && c.particular_condition !== fullText) {
          const pcText = c.particular_condition.length > MAX_CLAUSE_LENGTH
            ? c.particular_condition.substring(0, MAX_CLAUSE_LENGTH) + '... [truncated]'
            : c.particular_condition;
          clauseContent += `\n[Particular Condition Override]:\n${pcText}`;
        }
        
        return clauseContent;
      }).join('\n\n---\n\n')}`
      : '';

    // Convert BotMessages to Anthropic format
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant' as 'user' | 'assistant',
      content: msg.content
    }));

    // If context is provided, append it to the LAST user message
    if (contextText && anthropicMessages.length > 0) {
      const lastMsg = anthropicMessages[anthropicMessages.length - 1];
      if (lastMsg.role === 'user') {
        lastMsg.content += contextText;
      }
    }

    // Try each model candidate until one works
    let lastError: any = null;
    for (const model of this.modelCandidates) {
      try {
        const message = await this.client.messages.create({
          model: model,
          max_tokens: 8192,  // Increased from 4096 for longer responses
          system: systemInstruction,
          messages: anthropicMessages
        });


        // Extract text content from response
        const content = message.content.find(c => c.type === 'text');
        return content && 'text' in content ? content.text : 'No response received';
      } catch (error: any) {
        // If this is a model not found error, try the next model
        if (error?.message && (error.message.includes('not_found_error') || error.message.includes('model'))) {
          console.warn(`Model ${model} not found, trying next model...`);
          lastError = error;
          continue; // Try next model
        }
        // For other errors, break and handle below
        lastError = error;
        break;
      }
    }

    // If we get here, all models failed
    if (!lastError) {
      throw new Error('All Claude models failed and no error was captured');
    }
    throw new Error(`Claude API error: ${lastError.message || 'Unknown error'}`);
  }
}

export function createAIProvider(): AIProvider {
  return new ClaudeProvider();
}

export function isClaudeAvailable(): boolean {
  const provider = new ClaudeProvider();
  return provider.isAvailable();
}
