import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// SECURITY CHECK: Detect if service role key is being used (CRITICAL ERROR)
if (supabaseAnonKey) {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:8',message:'Checking API key security',data:{keyLength:supabaseAnonKey.length,keyPrefix:supabaseAnonKey.substring(0,20),hasServiceRoleString:supabaseAnonKey.includes('service_role')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Decode JWT payload to check the role field (most reliable method)
  try {
    const parts = supabaseAnonKey.split('.');
    if (parts.length === 3) {
      // Decode the payload (second part of JWT)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:15',message:'Decoded JWT payload',data:{role:payload.role,iss:payload.iss,ref:payload.ref},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Check if role is 'service_role' (CRITICAL SECURITY ISSUE)
      if (payload.role === 'service_role') {
        const errorMsg = 'SECURITY ERROR: Service role key detected in browser! Use VITE_SUPABASE_ANON_KEY (anon public key) instead. Service role keys must NEVER be exposed in frontend code.';
        console.error('🚨', errorMsg);
        
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:22',message:'Service role key detected - throwing error',data:{role:payload.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        throw new Error(errorMsg);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:28',message:'Key validation passed',data:{role:payload.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } else {
      // Fallback: Check for explicit 'service_role' string in key
      if (supabaseAnonKey.includes('service_role')) {
        const errorMsg = 'SECURITY ERROR: Service role key detected in browser! Use VITE_SUPABASE_ANON_KEY (anon public key) instead. Service role keys must NEVER be exposed in frontend code.';
        console.error('🚨', errorMsg);
        
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:36',message:'Service role string found in key',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        throw new Error(errorMsg);
      }
    }
  } catch (error: any) {
    // If decoding fails, don't block - let Supabase SDK handle validation
    // Only throw if we confirmed it's a service_role key
    if (error.message && error.message.includes('SECURITY ERROR')) {
      throw error;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:46',message:'JWT decode failed, allowing through',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
