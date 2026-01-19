import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// #region agent log
fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:6',message:'Environment variables check',data:{hasUrl:!!supabaseUrl,hasKey:!!supabaseAnonKey,urlLength:supabaseUrl?.length||0,keyLength:supabaseAnonKey?.length||0,urlPrefix:supabaseUrl?.substring(0,30)||'undefined',keyPrefix:supabaseAnonKey?.substring(0,20)||'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

// SECURITY CHECK: Detect if service role key is being used (CRITICAL ERROR)
if (supabaseAnonKey) {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:8',message:'Checking API key security',data:{keyLength:supabaseAnonKey.length,keyPrefix:supabaseAnonKey.substring(0,20),hasServiceRoleString:supabaseAnonKey.includes('service_role')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Decode JWT payload to check the role field (most reliable method)
  try {
    const parts = supabaseAnonKey.split('.');
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:14',message:'JWT parts split',data:{partsCount:parts.length,part1Length:parts[0]?.length,part2Length:parts[1]?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (parts.length === 3) {
      // Decode the payload (second part of JWT) with proper base64 padding
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      while (base64.length % 4) {
        base64 += '=';
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:22',message:'Attempting JWT decode',data:{base64Length:base64.length,base64Prefix:base64.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const decoded = atob(base64);
      const payload = JSON.parse(decoded);
      
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:28',message:'Decoded JWT payload successfully',data:{role:payload.role,iss:payload.iss,ref:payload.ref},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Check if role is 'service_role' (CRITICAL SECURITY ISSUE)
      if (payload.role === 'service_role') {
        const errorMsg = 'SECURITY ERROR: Service role key detected in browser! Use VITE_SUPABASE_ANON_KEY (anon public key) instead. Service role keys must NEVER be exposed in frontend code.';
        console.error('🚨', errorMsg);
        
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:35',message:'Service role key detected - throwing error',data:{role:payload.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        throw new Error(errorMsg);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:42',message:'Key validation passed - anon key confirmed',data:{role:payload.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:46',message:'Invalid JWT format - checking for service_role string',data:{partsCount:parts.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Fallback: Check for explicit 'service_role' string in key
      if (supabaseAnonKey.includes('service_role')) {
        const errorMsg = 'SECURITY ERROR: Service role key detected in browser! Use VITE_SUPABASE_ANON_KEY (anon public key) instead. Service role keys must NEVER be exposed in frontend code.';
        console.error('🚨', errorMsg);
        
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:52',message:'Service role string found in key',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        throw new Error(errorMsg);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:59',message:'Invalid JWT but no service_role string - allowing through',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:64',message:'Error during JWT validation',data:{errorMessage:error?.message,errorName:error?.name,isSecurityError:error?.message?.includes('SECURITY ERROR')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // If decoding fails, don't block - let Supabase SDK handle validation
    // Only throw if we confirmed it's a service_role key
    if (error.message && error.message.includes('SECURITY ERROR')) {
      throw error;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:72',message:'JWT decode failed but not a security error - allowing through',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }
}

// Validate Supabase configuration
const missingVars: string[] = [];
if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

// #region agent log
fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:99',message:'Missing vars check',data:{missingVarsCount:missingVars.length,missingVars:missingVars,urlExists:!!supabaseUrl,keyExists:!!supabaseAnonKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

let supabase: any = null;
let configError: string | null = null;

if (missingVars.length > 0) {
  const errorMsg = `Missing Supabase environment variables: ${missingVars.join(', ')}`;
  configError = errorMsg;
  console.error('❌ Supabase Configuration Error:', errorMsg);
  console.error('📖 Please configure Supabase in your .env.local file.');
  console.error('📚 Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
  
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:107',message:'Missing vars branch - setting configError',data:{errorMsg,missingVars},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
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
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:120',message:'All vars present - attempting Supabase initialization',data:{urlPrefix:supabaseUrl.substring(0,30)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
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
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:128',message:'Supabase client created successfully',data:{hasClient:!!supabase},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    configError = `Failed to initialize Supabase: ${errorMessage}`;
    console.error('❌ Supabase Initialization Error:', error);
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/supabase/config.ts:135',message:'Supabase initialization failed',data:{errorMessage,errorName:error?.name,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
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
