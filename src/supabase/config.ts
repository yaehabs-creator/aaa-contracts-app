import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// SECURITY CHECK: Detect if service role key is being used (CRITICAL ERROR)
if (supabaseAnonKey) {
  // Service role keys typically start with 'eyJ' but have different structure
  // Anon keys are safe to use in browser, service role keys are NOT
  // Check for common patterns that indicate service role key
  if (supabaseAnonKey.includes('service_role') || 
      supabaseAnonKey.length > 200 || // Service role keys are typically longer
      supabaseAnonKey.startsWith('eyJ') && supabaseAnonKey.split('.').length > 3) {
    const errorMsg = 'SECURITY ERROR: Service role key detected in browser! Use VITE_SUPABASE_ANON_KEY (anon public key) instead. Service role keys must NEVER be exposed in frontend code.';
    console.error('🚨', errorMsg);
    throw new Error(errorMsg);
  }
}

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
