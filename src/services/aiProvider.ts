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
  
  // #region agent log
  // Try multiple model names in order of preference
  private modelCandidates = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-20240620',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ];
  // #endregion

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiProvider.ts:16',message:'ClaudeProvider constructor - API key check',data:{hasApiKey:!!apiKey,apiKeyLength:apiKey?.length||0,apiKeyPrefix:apiKey?.substring(0,15)||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiProvider.ts:30',message:'Claude client initialized',data:{hasClient:!!this.client},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.log('Claude client initialized successfully');
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiProvider.ts:33',message:'Failed to initialize Claude client',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.error('Failed to initialize Claude client:', error);
      }
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiProvider.ts:36',message:'ANTHROPIC_API_KEY not found',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiProvider.ts:55',message:'chat method entry',data:{hasClient:!!this.client,model:this.model,messageCount:messages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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

    // Try each model candidate until one works
    let lastError: any = null;
    for (const model of this.modelCandidates) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiProvider.ts:88',message:'Trying model',data:{model,modelIndex:this.modelCandidates.indexOf(model)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      try {
        const message = await this.client.messages.create({
          model: model,
          max_tokens: 4096,
          system: systemInstruction,
          messages: anthropicMessages
        });

        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiProvider.ts:99',message:'Model succeeded',data:{model,hasContent:!!message.content},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        // Extract text content from response
        const content = message.content.find(c => c.type === 'text');
        return content && 'text' in content ? content.text : 'No response received';
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiProvider.ts:106',message:'Model failed',data:{model,errorMessage:error?.message||String(error),isNotFound:error?.message?.includes('not_found_error')||false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiProvider.ts:120',message:'All models failed',data:{lastError:lastError?.message||String(lastError),triedModels:this.modelCandidates},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
