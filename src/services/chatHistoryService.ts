/**
 * Chat History Service
 * Manages multi-session chat history with titles, package tracking, and persistence.
 */

import { BotMessage } from '@/types';

export interface ChatSession {
  id: string;
  title: string;
  contractId: string;
  contractName: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  preview?: string;
}

const SESSIONS_STORAGE_KEY = 'aehab_chat_sessions';

/**
 * Get all saved chat sessions ordered by latest updated
 */
export function getChatSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const sessions: ChatSession[] = JSON.parse(raw);
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/**
 * Save or update a session in the session list
 */
export function saveChatSession(session: ChatSession): void {
  try {
    const sessions = getChatSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = { ...sessions[existingIndex], ...session, updatedAt: Date.now() };
    } else {
      sessions.unshift({ ...session, updatedAt: Date.now() });
    }
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, 50))); // keep up to 50 sessions
  } catch { /* silent */ }
}

/**
 * Delete a chat session and its stored messages
 */
export function deleteChatSession(sessionId: string): void {
  try {
    const sessions = getChatSessions().filter(s => s.id !== sessionId);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    localStorage.removeItem(`chat_history_${sessionId}`);
  } catch { /* silent */ }
}

/**
 * Create a new chat session
 */
export function createNewSession(contractId: string, contractName: string): ChatSession {
  const newSession: ChatSession = {
    id: crypto.randomUUID(),
    title: 'New Conversation',
    contractId,
    contractName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
    preview: 'Ask AEHab about contract terms, delays, prices...'
  };
  saveChatSession(newSession);
  return newSession;
}

/**
 * Update session title and message count based on incoming messages
 */
export function updateSessionFromMessages(sessionId: string, messages: BotMessage[]): void {
  if (!sessionId || messages.length === 0) return;
  const sessions = getChatSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  // Use the first user message as the title if still default
  const firstUserMsg = messages.find(m => m.role === 'user');
  let title = session.title;
  if (firstUserMsg && (session.title === 'New Conversation' || session.title.startsWith('New Chat'))) {
    const cleanContent = firstUserMsg.content.trim().replace(/\n/g, ' ');
    title = cleanContent.length > 40 ? cleanContent.substring(0, 40) + '...' : cleanContent;
  }

  const lastMsg = messages[messages.length - 1];
  const preview = lastMsg?.content ? lastMsg.content.slice(0, 60) + '...' : session.preview;

  saveChatSession({
    ...session,
    title,
    messageCount: messages.length,
    preview,
    updatedAt: Date.now()
  });
}
