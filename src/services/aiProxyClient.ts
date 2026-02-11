/**
 * AI Proxy Client
 * 
 * Replaces direct Anthropic/OpenAI SDK calls in the browser.
 * All AI requests are routed through /api/ai-proxy to keep API keys server-side.
 */

interface AIProxyRequest {
    provider: 'anthropic' | 'openai';
    model?: string;
    messages: Array<{ role: string; content: string }>;
    system?: string;
    max_tokens?: number;
}

interface AIProxyResponse {
    content: Array<{ type: string; text: string }>;
    model?: string;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}

// Detect if running on Vercel (production) or locally
const getProxyUrl = (): string => {
    // In production (Vercel), the API route is at /api/ai-proxy
    // In development, use the Vite dev server proxy or direct URL
    if (import.meta.env.PROD) {
        return '/api/ai-proxy';
    }
    // In dev, Vercel CLI or direct URL
    return import.meta.env.VITE_AI_PROXY_URL || '/api/ai-proxy';
};

/**
 * Send a request to the AI proxy server.
 * This is the ONLY way AI API calls should be made from the client.
 */
export async function callAIProxy(request: AIProxyRequest): Promise<AIProxyResponse> {
    const url = getProxyUrl();

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `AI proxy error: ${response.status}`);
    }

    return response.json();
}

/**
 * Helper: Call Claude through the proxy (drop-in replacement for direct Anthropic SDK calls)
 */
export async function callClaude(options: {
    model?: string;
    system?: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens?: number;
}): Promise<string> {
    const response = await callAIProxy({
        provider: 'anthropic',
        model: options.model || 'claude-sonnet-4-5',
        system: options.system,
        messages: options.messages,
        max_tokens: options.max_tokens || 4096,
    });

    const textBlock = response.content.find(c => c.type === 'text');
    return textBlock?.text || '';
}

/**
 * Helper: Call OpenAI through the proxy
 */
export async function callOpenAI(options: {
    model?: string;
    system?: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens?: number;
}): Promise<string> {
    const response = await callAIProxy({
        provider: 'openai',
        model: options.model || 'gpt-4o',
        system: options.system,
        messages: options.messages,
        max_tokens: options.max_tokens || 4096,
    });

    const textBlock = response.content.find(c => c.type === 'text');
    return textBlock?.text || '';
}

/**
 * Check if the AI proxy is reachable (for UI availability indicators)
 */
export async function isAIProxyAvailable(): Promise<boolean> {
    try {
        const response = await fetch(getProxyUrl(), { method: 'OPTIONS' });
        return response.ok;
    } catch {
        return false;
    }
}
