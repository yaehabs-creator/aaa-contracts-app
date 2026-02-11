// Runtime configuration validators
// Helps detect missing critical configuration early at startup

export function getMissingConfig(): string[] {
  const missing: string[] = [];

  // API keys are now handled server-side via /api/ai-proxy
  // The client no longer needs ANTHROPIC_API_KEY or OPENAI_API_KEY
  // 
  // We only check for Supabase config (which is safe to be client-side,
  // as the anon key is meant to be public and RLS protects the data)
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    missing.push('VITE_SUPABASE_URL');
  }
  if (!supabaseKey) {
    missing.push('VITE_SUPABASE_ANON_KEY');
  }

  return missing;
}
