import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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
 * Handle standard AI Proxy (Claude/OpenAI)
 */
async function handleAIRequest(env: Record<string, string>, provider: string, model: string, messages: any[], system?: string, max_tokens?: number) {
  if (provider === 'anthropic') {
    const apiKey = env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) return { status: 500, data: { error: 'ANTHROPIC_API_KEY not set' } };

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

    return { status: response.status, data: await response.json() };
  } else if (provider === 'openai') {
    const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;
    if (!apiKey) return { status: 500, data: { error: 'OPENAI_API_KEY not set' } };

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
    const normalized = {
      content: [{ type: 'text', text: data.choices?.[0]?.message?.content || '' }],
      model: data.model,
      usage: data.usage,
    };
    return { status: response.status, data: normalized };
  }
  return { status: 400, data: { error: `Unknown provider: ${provider}` } };
}

/**
 * Handle JSON Data Source Chat
 */
async function handleJsonChatRequest(env: Record<string, string>, { question, source_ids }: any) {
  const apiKey = env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY;
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    return { status: 500, data: { error: 'Dev server missing env keys for JSON chat' } };
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch sources
    const { data: sources, error } = await supabase
      .from('json_data_sources')
      .select('*')
      .in('id', source_ids);

    if (error) return { status: 500, data: { error: error.message } };
    if (!sources?.length) return { status: 404, data: { error: 'No sources found' } };

    // 2. Build context
    let context = '\n=== ATTACHED JSON DATA SOURCES ===\n';
    for (const s of sources) {
      context += `\n--- [${s.name}] ---\n`;
      if (s.parsed_content) {
        context += JSON.stringify(s.parsed_content, null, 2).slice(0, 30000) + '\n';
      } else if (s.public_url) {
        // Safety check for very large files (> 5MB)
        if (s.size_bytes > 5 * 1024 * 1024) {
          context += `[File is too large for full parsing (${(s.size_bytes / 1024 / 1024).toFixed(1)}MB). Summary: ${s.content_summary || 'No summary'}]\n`;
          continue;
        }

        try {
          const res = await fetch(s.public_url);
          if (res.ok) {
            const json = await res.json();
            context += JSON.stringify(json, null, 2).slice(0, 30000) + '\n';
          }
        } catch (fetchErr) {
          context += `[Error loading content: ${s.content_summary || 'unavailable'}]\n`;
        }
      }
    }

    // 3. Call Claude
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
        system: `You are a data assistant. Use these JSON sources to answer accurately:\n${context}`,
        messages: [{ role: 'user', content: question }],
      }),
    });

    const data = await response.json();
    return { status: response.status, data: { answer: data.content?.[0]?.text || 'No response', sources_used: sources.map(s => ({ id: s.id, name: s.name })) } };
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
  if (mode === 'production' && !isCI) {
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !env[varName]);

    if (missingVars.length > 0) {
      console.error('\n❌ Missing required environment variables for production build:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\n💡 Please ensure .env.local exists and contains all required variables.');
      console.error('   See DEPLOYMENT_GUIDE.md for setup instructions.\n');
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('✅ All required environment variables are present');
  } else if (mode === 'production' && isCI) {
    // In CI, just warn but don't fail - env vars will be injected by the platform
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !env[varName]);

    if (missingVars.length > 0) {
      console.warn('\n⚠️  Missing environment variables in CI environment:');
      missingVars.forEach(varName => console.warn(`   - ${varName}`));
      console.warn('\n💡 These should be set in your Vercel project settings.');
      console.warn('   The build will continue, but the app may not work correctly until variables are added.\n');
    } else {
      console.log('✅ All required environment variables are present');
    }
  }

  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      // Handle /api/ai-proxy locally in dev mode (reads API keys from .env/.env.local)
      ...(mode === 'development' ? [localAIProxy(env)] : []),
    ],
    // API keys are now handled server-side via /api/ai-proxy
    // DO NOT expose API keys in the client bundle
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'supabase-vendor': ['@supabase/supabase-js']
          }
        }
      }
    }
  };
});
