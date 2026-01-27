// Ordered list of Claude models to try (Jan 2026)
export const CLAUDE_MODEL_ORDER = [
  "claude-sonnet-4-5-20250514",      // Claude Sonnet 4.5 (latest, with date)
  "claude-sonnet-4-5",               // Claude Sonnet 4.5 (alias)
  "claude-3-5-sonnet-20241022",      // Claude 3.5 Sonnet (fallback)
  "claude-3-5-haiku-20241022"        // Claude 3.5 Haiku (lightweight fallback)
] as const;

export const CLAUDE_DEFAULT_MODEL = CLAUDE_MODEL_ORDER[0];
