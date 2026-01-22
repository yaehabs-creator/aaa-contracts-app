// Runtime configuration validators
// Helps detect missing critical configuration early at startup

export function getMissingConfig(): string[] {
  const missing: string[] = [];

  // Anthropic Claude API key (primary for OCR analysis)
  // Check both import.meta.env (Vite) and process.env (defined in vite.config.ts)
  const anthropicKey = 
    (import.meta as any).env?.VITE_ANTHROPIC_API_KEY || 
    (import.meta as any).env?.ANTHROPIC_API_KEY ||
    (typeof process !== 'undefined' && (process as any).env?.ANTHROPIC_API_KEY);
    
  if (!anthropicKey) {
    missing.push('ANTHROPIC_API_KEY (Claude)');
  }

  // You can add more keys as needed in the future
  return missing;
}
