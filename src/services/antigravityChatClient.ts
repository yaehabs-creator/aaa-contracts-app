/**
 * Client Service: Antigravity CA Chat
 * 
 * Communicates with the secure server-side Antigravity route (/api/antigravity-chat)
 * No API keys exist on the client.
 */

import { BotMessage } from '@/types';

export interface AntigravityChatResponse {
  response: string;
  toolsUsed: string[];
  citations: any[];
}

export async function chatWithAntigravity(
  contractId: string,
  userMessage: string,
  conversationHistory: BotMessage[] = []
): Promise<AntigravityChatResponse> {
  const formattedHistory = conversationHistory.map(m => ({
    role: m.role,
    content: m.content
  }));

  const res = await fetch('/api/antigravity-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contractId,
      message: userMessage,
      conversationHistory: formattedHistory
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errorData.error || `Server error: ${res.status}`);
  }

  return await res.json();
}
