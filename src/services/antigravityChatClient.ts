/**
 * Client Service: Antigravity CA Chat
 * 
 * Communicates with the secure server-side Antigravity route (/api/antigravity-chat)
 * No API keys exist on the client.
 */

import { BotMessage } from '@/types';
import { callAIProxy } from './aiProxyClient';

export interface AntigravityChatResponse {
  response: string;
  toolsUsed: string[];
  citations: any[];
}

export async function chatWithAntigravity(
  contractId: string,
  userMessage: string,
  conversationHistory: BotMessage[] = [],
  onChunk?: (chunk: string) => void
): Promise<AntigravityChatResponse> {
  const formattedHistory = conversationHistory.map(m => ({
    role: m.role,
    content: m.content
  }));

  try {
    const res = await fetch('/api/antigravity-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contractId,
        message: userMessage,
        conversationHistory: formattedHistory,
        stream: !!onChunk
      })
    });

    if (res.ok) {
      if (onChunk && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let toolsUsed: string[] = [];
        let citations: any[] = [];
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.chunk) {
                  fullText += data.chunk;
                  onChunk(data.chunk);
                }
                if (data.done) {
                  if (data.toolsUsed) toolsUsed = data.toolsUsed;
                  if (data.citations) citations = data.citations;
                }
              } catch {}
            }
          }
        }

        if (fullText) {
          return { response: fullText, toolsUsed, citations };
        }
      }

      return await res.json();
    }

    console.warn(`[Antigravity CA] Primary route returned HTTP ${res.status}. Falling back to AI proxy...`);
  } catch (fetchErr: any) {
    console.warn('[Antigravity CA] Network error, falling back to AI proxy:', fetchErr.message);
  }

  // Resilient fallback: call /api/ai-proxy (Gemini with Claude/OpenAI fallback)
  const proxyMessages = [
    ...formattedHistory.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ];

  const proxyRes = await callAIProxy({
    provider: 'gemini',
    system: `You are AEhab, an intelligent and professional Contract Administrator for the Mivida Gardens project (Employer: Emaar Misr).
Answer naturally, intelligently, and directly. Provide clear, elegant markdown explanations with clause references (e.g. Sub-Clause 8.7 Delay Damages). Keep your answers direct, practical, and easy to read.`,
    messages: proxyMessages,
    max_tokens: 4096
  });

  const responseText = proxyRes.content?.find(c => c.type === 'text')?.text || 'Contract analysis complete.';

  return {
    response: responseText,
    toolsUsed: ['fallback_proxy'],
    citations: []
  };
}
