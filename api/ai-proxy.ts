/**
 * Vercel Serverless Function: AI API Proxy
 * 
 * This keeps API keys server-side only.
 * Client calls POST /api/ai-proxy with { provider, model, messages, system, max_tokens }
 * Server proxies to Anthropic/OpenAI with the real API key.
 */

interface ProxyRequest {
  provider: 'anthropic' | 'openai';
  model?: string;
  messages: Array<{ role: string; content: string }>;
  system?: string;
  max_tokens?: number;
}

interface VercelRequest {
  method: string;
  body: ProxyRequest;
  headers: Record<string, string>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (key: string, value: string) => VercelResponse;
}

// Anthropic API models with fallback
const CLAUDE_MODELS = [
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
  'claude-opus-4-5',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider, model, messages, system, max_tokens } = req.body;

  if (!provider || !messages) {
    return res.status(400).json({ error: 'Missing required fields: provider, messages' });
  }

  try {
    if (provider === 'anthropic') {
      return await handleAnthropic(req.body, res);
    } else if (provider === 'openai') {
      return await handleOpenAI(req.body, res);
    } else {
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
  } catch (error: any) {
    console.error('AI Proxy Error:', error);
    return res.status(error.status || 500).json({
      error: error.message || 'Internal server error',
      status: error.status,
    });
  }
}

async function handleAnthropic(body: ProxyRequest, res: VercelResponse) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  const model = body.model || CLAUDE_MODELS[0];
  const maxTokens = body.max_tokens || 4096;

  // Build the Anthropic API request
  const anthropicBody: any = {
    model,
    max_tokens: maxTokens,
    messages: body.messages,
  };

  if (body.system) {
    anthropicBody.system = body.system;
  }

  // Try models with fallback
  const modelsToTry = CLAUDE_MODELS.includes(model) ? CLAUDE_MODELS : [model, ...CLAUDE_MODELS];

  for (const candidateModel of modelsToTry) {
    try {
      const response = await fetchWithRetry(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({ ...anthropicBody, model: candidateModel }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If model not found, try next
        if (response.status === 404) {
          console.warn(`Model ${candidateModel} not available, trying next...`);
          continue;
        }
        throw { status: response.status, message: errorData.error?.message || `API error ${response.status}` };
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (error: any) {
      if (error.status === 404) continue;
      throw error;
    }
  }

  return res.status(500).json({ error: 'No Claude models available' });
}

async function handleOpenAI(body: ProxyRequest, res: VercelResponse) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' });
  }

  const model = body.model || 'gpt-4o';
  const maxTokens = body.max_tokens || 4096;

  const openaiMessages: any[] = [];
  if (body.system) {
    openaiMessages.push({ role: 'system', content: body.system });
  }
  openaiMessages.push(...body.messages);

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: openaiMessages,
        max_tokens: maxTokens,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw { status: response.status, message: errorData.error?.message || `API error ${response.status}` };
  }

  const data = await response.json();

  // Normalize OpenAI response to match Anthropic format for client simplicity
  const normalizedResponse = {
    content: [{
      type: 'text',
      text: data.choices?.[0]?.message?.content || '',
    }],
    model: data.model,
    usage: data.usage,
  };

  return res.status(200).json(normalizedResponse);
}

/**
 * Fetch with exponential backoff retry for rate limits
 */
async function fetchWithRetry(url: string, options: RequestInit, maxAttempts = 3): Promise<Response> {
  let attempt = 0;
  let backoffMs = 1000;

  while (attempt < maxAttempts) {
    const response = await fetch(url, options);

    if (response.status === 429 || response.status === 529) {
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : backoffMs;

      console.warn(`Rate limited (attempt ${attempt + 1}/${maxAttempts}). Retrying in ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));

      attempt++;
      backoffMs = Math.min(backoffMs * 2, 8000);
      continue;
    }

    return response;
  }

  throw { status: 429, message: 'Rate limited after max retries' };
}
