import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Validate required environment variables in production build
    if (mode === 'production') {
      const requiredVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID'
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
    }
    
    return {
      base: '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY)
      },
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
              'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore']
            }
          }
        }
      }
    };
});
