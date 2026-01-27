// Claude models - use official aliases (no dated versions needed)
export const CLAUDE_MODEL_ORDER = [
  "claude-sonnet-4-5",    // Claude Sonnet 4.5 (recommended default)
  "claude-haiku-4-5",     // Claude Haiku 4.5 (fast fallback)
  "claude-opus-4-5",      // Claude Opus 4.5 (most capable fallback)
] as const;

export const CLAUDE_DEFAULT_MODEL = CLAUDE_MODEL_ORDER[0];
