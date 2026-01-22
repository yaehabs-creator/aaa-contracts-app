// Ordered list of Claude models to try for OCR analysis
export const CLAUDE_MODEL_ORDER = [
  'claude-3',
  'claude-2',
  'claude-instant',
] as const;

export const CLAUDE_DEFAULT_MODEL = CLAUDE_MODEL_ORDER[0];
