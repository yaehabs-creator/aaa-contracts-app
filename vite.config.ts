import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite plugin: Local AI Proxy
 * In dev mode, handles /api/ai-proxy requests that would normally be
 * served by Vercel serverless functions. Reads API keys from .env files.
 */
function localAIProxy(env: Record<string, string>): Plugin {
  return {
    name: 'local-ai-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai-proxy', async (req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // Read body
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { provider, model, messages, system, max_tokens } = JSON.parse(body);

            if (provider === 'anthropic') {
              const apiKey = env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in .env or .env.local' }));
                return;
              }

              const anthropicBody: any = {
                model: model || 'claude-sonnet-4-5',
                max_tokens: max_tokens || 4096,
                messages,
              };
              if (system) anthropicBody.system = system;

              const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify(anthropicBody),
              });

              const data = await response.json();
              res.statusCode = response.ok ? 200 : (response.status as number);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            } else if (provider === 'openai') {
              const apiKey = env.OPENAI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'OPENAI_API_KEY not set in .env or .env.local' }));
                return;
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
              // Normalize to Anthropic format
              const normalized = {
                content: [{ type: 'text', text: data.choices?.[0]?.message?.content || '' }],
                model: data.model,
                usage: data.usage,
              };
              res.statusCode = response.ok ? 200 : (response.status as number);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(normalized));
            } else {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: `Unknown provider: ${provider}` }));
            }
          } catch (err: any) {
            console.error('[local-ai-proxy] Error:', err.message);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
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
        '@': path.resolve(__dirname, './src'),
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
