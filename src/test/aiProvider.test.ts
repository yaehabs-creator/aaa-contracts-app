import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeProvider, getRateLimitStatus } from '../services/aiProvider';
import { callAIProxy } from '../services/aiProxyClient';

// Mock the proxy client
vi.mock('../services/aiProxyClient', () => ({
  callAIProxy: vi.fn()
}));

// Mock aiBotService to avoid circular dependency in tests
vi.mock('../services/aiBotService', () => ({
  buildUnifiedContractContext: vi.fn().mockResolvedValue({ context: 'Mocked Context' })
}));

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ClaudeProvider();
  });

  it('should be initialized correctly', () => {
    expect(provider.getName()).toBe('Claude GC/PC Specialist');
    expect(provider.isAvailable()).toBe(true);
  });

  it('should format messages and call proxy', async () => {
    const mockResponse = {
      content: [{ type: 'text', text: 'Hello from Claude' }]
    };
    (callAIProxy as any).mockResolvedValue(mockResponse);

    const messages = [
      { id: '1', role: 'user' as const, content: 'Hello', timestamp: Date.now() }
    ];
    
    const response = await provider.chat(messages, [], 'Direct instruction');
    
    expect(response).toBe('Hello from Claude');
    expect(callAIProxy).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'anthropic',
      system: 'Direct instruction',
      messages: [{ role: 'user', content: 'Hello' }]
    }));
  });

  it('should handle rate limits with retry logic', async () => {
    // First call fails with 429, second succeeds
    (callAIProxy as any)
      .mockRejectedValueOnce(new Error('429 Rate Limit'))
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Success after retry' }]
      });

    const messages = [
      { id: '1', role: 'user' as const, content: 'Retry test', timestamp: Date.now() }
    ];

    const response = await provider.chat(messages, [], 'Instruction');
    
    expect(response).toBe('Success after retry');
    expect(callAIProxy).toHaveBeenCalledTimes(2);
  });

  it('should report rate limit status correctly', () => {
    // Note: rateLimitState is internal to aiProvider.ts, 
    // we can only test the exported getRateLimitStatus function indirectly
    const status = getRateLimitStatus();
    expect(status).toHaveProperty('isLimited');
  });
});
