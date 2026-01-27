// Ordered list of Claude models to try
export const CLAUDE_MODEL_ORDER = [
  "claude-3-5-sonnet-latest",
  "claude-3-5-haiku-latest",
  "claude-3-opus-latest"
] as const;

export const CLAUDE_DEFAULT_MODEL = CLAUDE_MODEL_ORDER[0];
