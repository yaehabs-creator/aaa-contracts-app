import { createAIProvider, getRateLimitStatus, isRequestInFlight } from './aiProvider';
import { Clause, BotMessage } from '@/types';

// REQUEST THROTTLING & DEBOUNCING
let pendingSuggestionsAbort: AbortController | null = null;
let suggestionsInFlight = false;
let lastSuggestionsRequest = 0;
const SUGGESTIONS_DEBOUNCE_MS = 500;
const SUGGESTIONS_COOLDOWN_MS = 2000;

export const SUGGESTIONS_SYSTEM_INSTRUCTION = `You are a helpful assistant for contract analysis. Based on the current contract clauses, suggest 3-5 helpful actions or questions the user might want to explore. Return a JSON array of suggestion strings.`;

const DEFAULT_SUGGESTIONS = [
  'Explain a clause',
  'Find clauses about payment',
  'Search for time-sensitive clauses',
  'Compare General vs Particular conditions'
];

/**
 * Get AI-powered suggestions with proper throttling and debouncing
 */
export async function getSuggestions(
  clauses: Clause[]
): Promise<string[]> {
  const aiProvider = createAIProvider();

  // Return defaults if AI not available
  if (!aiProvider.isAvailable()) {
    return DEFAULT_SUGGESTIONS;
  }

  // Check if we're rate limited
  const rateLimitStatus = getRateLimitStatus();
  if (rateLimitStatus.isLimited) {
    return DEFAULT_SUGGESTIONS;
  }

  // Check if a request is already in flight (global)
  if (isRequestInFlight()) {
    return DEFAULT_SUGGESTIONS;
  }

  // Check cooldown between suggestions requests
  const now = Date.now();
  if (now - lastSuggestionsRequest < SUGGESTIONS_COOLDOWN_MS) {
    return DEFAULT_SUGGESTIONS;
  }

  // Cancel any pending suggestions request
  if (pendingSuggestionsAbort) {
    pendingSuggestionsAbort.abort();
    pendingSuggestionsAbort = null;
  }

  // Check if suggestions request already in flight
  if (suggestionsInFlight) {
    return DEFAULT_SUGGESTIONS;
  }

  // Create new abort controller
  pendingSuggestionsAbort = new AbortController();
  suggestionsInFlight = true;
  lastSuggestionsRequest = now;

  const query = `Based on these ${clauses.length} contract clauses, suggest 3-5 helpful actions or questions the user might want to explore. Return only a JSON array of strings, no other text.`;

  try {
    const messages: BotMessage[] = [{
      id: 'suggestions-query',
      role: 'user',
      content: query,
      timestamp: Date.now()
    }];

    const response = await aiProvider.chat(messages, clauses, SUGGESTIONS_SYSTEM_INSTRUCTION);

    // Try to parse JSON array from response
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 5);
      }
    } catch {
      // If parsing fails, extract suggestions from text
      const lines = response.split('\n').filter(line => line.trim().length > 0);
      return lines.slice(0, 5);
    }

    return DEFAULT_SUGGESTIONS.slice(0, 3);
  } catch (error: any) {
    // Don't log aborted requests as errors
    if (error.name === 'AbortError') {
      return DEFAULT_SUGGESTIONS;
    }

    console.error('Failed to get suggestions:', error);
    return DEFAULT_SUGGESTIONS.slice(0, 3);
  } finally {
    suggestionsInFlight = false;
    pendingSuggestionsAbort = null;
  }
}
