import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
    plugins: [react()],
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
