import { CLAUDE_DEFAULT_MODEL, CLAUDE_MODEL_ORDER } from './claudeModels'

// Runtime accessors for Claude model selection
export function getCurrentClaudeModel(): string {
  if (typeof window === 'undefined') return CLAUDE_DEFAULT_MODEL;
  const raw = (window as any).localStorage?.getItem('CLAUDE_MODEL_OVERRIDE');
  if (raw && CLAUDE_MODEL_ORDER.includes(raw as any)) return raw as string;
  // Fallback to default when not overridden or unknown value
  return CLAUDE_DEFAULT_MODEL;
}

export function setClaudeModelOverride(model: string): void {
  if (typeof window === 'undefined') return;
  if (CLAUDE_MODEL_ORDER.includes(model as any)) {
    (window as any).localStorage.setItem('CLAUDE_MODEL_OVERRIDE', model);
  } else {
    // If default sentinel, clear override
    (window as any).localStorage.removeItem('CLAUDE_MODEL_OVERRIDE');
  }
}
