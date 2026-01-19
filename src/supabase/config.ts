import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate Supabase configuration
const missingVars: string[] = [];
if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

let supabase: any = null;
let configError: string | null = null;

if (missingVars.length > 0) {
  const errorMsg = `Missing Supabase environment variables: ${missingVars.join(', ')}`;
  configError = errorMsg;
  console.error('❌ Supabase Configuration Error:', errorMsg);
  console.error('📖 Please configure Supabase in your .env.local file.');
  console.error('📚 Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
  
  // Store error in window for error boundary to access
  if (typeof window !== 'undefined') {
    (window as any).__SUPABASE_CONFIG_ERROR__ = {
      message: errorMsg,
      missingVars: missingVars,
      instructions: 'Please check your .env.local file and ensure all VITE_SUPABASE_* variables are set correctly.'
    };
    console.warn('⚠️ Supabase not configured. Database operations will not work.');
  }
} else {
  // Initialize Supabase
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    console.log('✅ Supabase initialized successfully');
    console.log('📊 Supabase URL:', supabaseUrl);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    configError = `Failed to initialize Supabase: ${errorMessage}`;
    console.error('❌ Supabase Initialization Error:', error);
    
    // Store error in window for error boundary to access
    if (typeof window !== 'undefined') {
      (window as any).__SUPABASE_CONFIG_ERROR__ = {
        message: configError,
        error: error,
        instructions: 'Please verify your Supabase configuration values are correct.'
      };
    }
  }
}

// Export Supabase client (may be null if not configured)
export { supabase, configError };

export default supabase;
