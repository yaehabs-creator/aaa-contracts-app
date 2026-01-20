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
  private model: string = 'claude-3-5-sonnet-20241022';

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

    // Build context from clauses
    const contextText = context.length > 0
      ? `\n\nCURRENT CONTRACT CLAUSES:\n${context.map(c =>
        `Clause ${c.clause_number}: ${c.clause_title}\n${c.clause_text.substring(0, 500)}...`
      ).join('\n\n')}`
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

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemInstruction,
        messages: anthropicMessages
      });

      // Extract text content from response
      const content = message.content.find(c => c.type === 'text');
      return content && 'text' in content ? content.text : 'No response received';
    } catch (error: any) {
      throw new Error(`Claude API error: ${error.message || 'Unknown error'}`);
    }
  }
}

export function createAIProvider(): AIProvider {
  return new ClaudeProvider();
}

export function isClaudeAvailable(): boolean {
  const provider = new ClaudeProvider();
  return provider.isAvailable();
}
