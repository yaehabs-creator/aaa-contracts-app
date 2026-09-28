import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vite plugin: Local AI Proxy
 * In dev mode, handles /api/ai-proxy requests that would normally be
 * served by Vercel serverless functions. Reads API keys from .env files.
 */
/**
 * Vite plugin: Local AI Proxy
 * In dev mode, handles /api/* requests that would normally be
 * served by Vercel serverless functions.
 */
function localAIProxy(env: Record<string, string>): Plugin {
  return {
    name: 'local-ai-proxy',
    configureServer(server) {
      // 1. Unified API Handler
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        const path = req.url.split('?')[0];

        // Route: /api/antigravity-chat (Antigravity Agent)
        if (path === '/api/antigravity-chat') {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { contractId, message, conversationHistory, stream = false } = JSON.parse(body);
              const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured in .env.local on the server.' }));
                return;
              }
              const { runAntigravityAgent } = await import('./api/antigravity-chat');
              
              if (stream) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                const result = await runAntigravityAgent(
                  apiKey,
                  contractId,
                  message,
                  conversationHistory,
                  (chunk: string) => {
                    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
                  }
                );
                res.write(`data: ${JSON.stringify({ done: true, ...result })}\n\n`);
                res.end();
                return;
              }

              const result = await runAntigravityAgent(apiKey, contractId, message, conversationHistory);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message || 'Antigravity execution failed' }));
            }
          });
          return;
        }

        // Route: /api/ai-proxy
        if (path === '/api/ai-proxy') {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { provider, model, messages, system, max_tokens } = JSON.parse(body);
              const result = await handleAIRequest(env, provider, model, messages, system, max_tokens);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.data));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Route: /api/json-data-chat
        if (path === '/api/json-data-chat') {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body);
              const result = await handleJsonChatRequest(env, payload);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.data));
            } catch (err: any) {
              console.error('[json-data-chat] Error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Route: /api/ai-proxy-pdf
        if (path === '/api/ai-proxy-pdf') {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body);
              const result = await handlePdfProxyRequest(env, payload);
              res.statusCode = result.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result.data));
            } catch (err: any) {
              console.error('[ai-proxy-pdf] Error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

/**
 * Call Google Gemini API
 */
async function callGemini(env: Record<string, string>, messages: any[], system?: string, max_tokens?: number) {
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
  if (!apiKey) return { status: 500, data: { error: 'VITE_GEMINI_API_KEY not set' } };

  const contents: any[] = [];
  for (const m of messages) {
    const role = (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user';
    contents.push({
      role,
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
    });
  }

  if (contents.length > 0 && contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  const payload: any = {
    contents,
    generationConfig: {
      maxOutputTokens: max_tokens || 4096,
      temperature: 0.2
    }
  };

  if (system) {
    payload.systemInstruction = {
      parts: [{ text: system }]
    };
  }

  const candidateModels = [
    env.VITE_GEMINI_MODEL || null,
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest'
  ].filter(Boolean) as string[];

  let lastError = 'No model succeeded';

  for (const model of candidateModels) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return {
          status: 200,
          data: {
            content: [{ type: 'text', text }],
            model,
            usage: data.usageMetadata
          }
        };
      }
      lastError = data.error?.message || 'Empty response from model';
      console.warn(`[Gemini Proxy] Model ${model} returned error: ${lastError}, trying fallback...`);
    } catch (err: any) {
      lastError = err.message;
      console.warn(`[Gemini Proxy] Model ${model} fetch failed: ${lastError}, trying fallback...`);
    }
  }

  return { status: 500, data: { error: lastError } };
}

/**
 * Handle standard AI Proxy (Gemini/Claude/OpenAI)
 */
async function handleAIRequest(env: Record<string, string>, provider: string, model: string, messages: any[], system?: string, max_tokens?: number) {
  if (provider === 'gemini') {
    return await callGemini(env, messages, system, max_tokens);
  } else if (provider === 'anthropic') {
    const apiKey = env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      if (env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY) {
        return await callGemini(env, messages, system, max_tokens);
      }
      return { status: 500, data: { error: 'ANTHROPIC_API_KEY not set' } };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-7-sonnet-latest',
          max_tokens: max_tokens || 4096,
          messages,
          system,
        }),
      });

      const data = await response.json();
      if (!response.ok && (data.error?.message?.includes('credit') || data.error?.message?.includes('balance') || response.status === 400 || response.status === 401)) {
        if (env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY) {
          console.log('[AI Proxy] Anthropic failed (credits/auth), automatically routing to Gemini...');
          return await callGemini(env, messages, system, max_tokens);
        }
      }
      return { status: response.status, data };
    } catch (e: any) {
      if (env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY) {
        return await callGemini(env, messages, system, max_tokens);
      }
      return { status: 500, data: { error: e.message } };
    }
  } else if (provider === 'openai') {
    const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      if (env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY) {
        return await callGemini(env, messages, system, max_tokens);
      }
      return { status: 500, data: { error: 'OPENAI_API_KEY not set' } };
    }

    const openaiMessages: any[] = [];
    if (system) openaiMessages.push({ role: 'system', content: system });
    openaiMessages.push(...messages);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages: openaiMessages,
        max_tokens: max_tokens || 4096,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      if (env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY) {
        console.log('[AI Proxy] OpenAI failed, automatically routing to Gemini...');
        return await callGemini(env, messages, system, max_tokens);
      }
    }
    const normalized = {
      content: [{ type: 'text', text: data.choices?.[0]?.message?.content || '' }],
      model: data.model,
      usage: data.usage,
    };
    return { status: response.status, data: normalized };
  }
  
  // Default to Gemini if unknown or fallback
  if (env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY) {
    return await callGemini(env, messages, system, max_tokens);
  }
  return { status: 400, data: { error: `Unknown provider: ${provider}` } };
}

/**
 * Handle JSON Data Source Chat
 */
async function handleJsonChatRequest(env: Record<string, string>, { question, source_ids }: any) {
  try {
    return { status: 410, data: { error: 'JSON chat via Supabase is deprecated in local mode' } };
  } catch (err: any) {
    return { status: 500, data: { error: err.message } };
  }
}

/**
 * Handle PDF Proxy (Claude Native PDF)
 */
async function handlePdfProxyRequest(env: Record<string, string>, { pdf_url, prompt }: any) {
  const apiKey = env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return { status: 500, data: { error: 'ANTHROPIC_API_KEY not set' } };

  try {
    const res = await fetch(pdf_url);
    if (!res.ok) return { status: 400, data: { error: 'Failed to fetch PDF' } };
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-latest',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: prompt }
          ]
        }]
      }),
    });

    const data = await response.json();
    return { status: response.status, data: { analysis: { response: data.content?.[0]?.text || '' } } };
  } catch (err: any) {
    return { status: 500, data: { error: err.message } };
  }
}


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Check if we're in a CI environment (Vercel, GitHub Actions, etc.)
  const isCI = process.env.CI === 'true' || process.env.VERCEL === '1' || process.env.VERCEL_ENV;

  // Validate required environment variables in production build
  const hasAIKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.VITE_ANTHROPIC_API_KEY || env.VITE_OPENAI_API_KEY;
  if (mode === 'production' && !isCI && !hasAIKey) {
    console.warn('⚠️  No AI API key found (VITE_GEMINI_API_KEY, VITE_ANTHROPIC_API_KEY, or VITE_OPENAI_API_KEY). AI features may be disabled.');
  }

  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      tailwindcss(),
      // Handle /api/ai-proxy locally in dev mode (reads API keys from .env/.env.local)
      ...(mode === 'development' ? [localAIProxy(env)] : []),
    ],
    // API keys are now handled server-side via /api/ai-proxy
    // DO NOT expose API keys in the client bundle
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom']
          }
        }
      }
    }
  };
});
