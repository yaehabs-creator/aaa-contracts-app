import { callAIProxy } from "./aiProxyClient";

/**
 * Smart text preprocessing for PDF-extracted text
 * Fixes common OCR/extraction errors and prepares text for clause splitting
 */

export interface PreprocessedText {
  cleaned: string;
  fixes: Array<{ original: string; fixed: string; reason: string }>;
  estimatedClauses: number;
  removedLines: number;
  corruptedLines?: Array<{ line: string; reason: string; index: number }>;
}

/**
 * Common PDF extraction errors and their fixes
 */
const COMMON_FIXES = [
  // Spacing issues
  { pattern: /(\w)([A-Z][a-z])/g, fix: '$1 $2', reason: 'Missing space before capital' },
  { pattern: /([a-z])(\d)/g, fix: '$1 $2', reason: 'Missing space before number' },
  { pattern: /(\d)([A-Za-z])/g, fix: '$1 $2', reason: 'Missing space after number' },

  // Common OCR errors (context-dependent, be careful)
  { pattern: /\b0\b/g, fix: 'O', reason: 'Zero mistaken for O (context-dependent)' },
  { pattern: /\brn\b/g, fix: 'm', reason: 'RN mistaken for M' },
  { pattern: /\bvv\b/g, fix: 'w', reason: 'VV mistaken for W' },

  // Contract-specific fixes
  { pattern: /\bClause\s+(\d+)\s*[\.:]\s*/gi, fix: 'Clause $1. ', reason: 'Normalize clause numbering' },
  { pattern: /\bArticle\s+(\d+)\s*[\.:]\s*/gi, fix: 'Article $1. ', reason: 'Normalize article numbering' },
  { pattern: /\bSection\s+(\d+)\s*[\.:]\s*/gi, fix: 'Section $1. ', reason: 'Normalize section numbering' },

  // Remove excessive whitespace
  { pattern: /\s{3,}/g, fix: ' ', reason: 'Multiple spaces' },
  { pattern: /\n{3,}/g, fix: '\n\n', reason: 'Multiple newlines' },

  // Fix broken words at line breaks
  { pattern: /(\w+)-\s*\n\s*(\w+)/g, fix: '$1$2', reason: 'Fix hyphenated line breaks' },
];

/**
 * Check if a line is corrupted/nonsensical and should be removed
 */
function isCorruptedLine(line: string): boolean {
  const trimmed = line.trim();

  // Remove empty lines or whitespace-only lines
  if (!trimmed || /^\s*$/.test(trimmed)) {
    return true;
  }

  // Remove very short lines (single digits or 1-2 characters, except common abbreviations)
  if (trimmed.length <= 2) {
    // Allow single uppercase letters (abbreviations) but remove digits and random chars
    if (!/^[A-Z]{1,2}$/.test(trimmed)) {
      return true;
    }
  }

  // Remove lines that are just a single digit
  if (/^\d$/.test(trimmed)) {
    return true;
  }

  // Detect company/entity headers with numbers (e.g., "Emaar Misr For 9")
  if (/^[A-Z][a-zA-Z\s]+For\s+\d+$/i.test(trimmed) || /^[A-Z][a-zA-Z\s]+For\s+\d+\s*$/.test(trimmed)) {
    return true;
  }

  // Detect tax card/ID numbers (e.g., "Tax Card 218-287-208", "Tax Card 218-287-208 t"A")
  // Match lines starting with "Tax Card" followed by numbers (with or without extra fragments)
  if (/^Tax\s+Card\s+\d+[-.\s]?\d+[-.\s]?\d+/i.test(trimmed)) {
    return true;
  }

  // Detect P.O. Box addresses (e.g., "P. O BOX 229, Mokattam Mier", "P.O. BOX 229")
  if (/^P\.?\s*O\.?\s*BOX\s+\d+/i.test(trimmed)) {
    return true;
  }

  // Detect address lines with city/country patterns (e.g., "Cairo, Egypt M5 l")
  if (/^[A-Z][a-z]+,\s*[A-Z][a-z]+\s+[A-Z]\d+\s*[a-z]*$/i.test(trimmed) ||
    /^[A-Z][a-z]+,\s*[A-Z][a-z]+$/i.test(trimmed) && trimmed.length < 30) {
    // Check if it's a simple city, country pattern without substantial content
    const cityCountryPattern = /^[A-Z][a-z]+,\s*[A-Z][a-z]+$/i;
    if (cityCountryPattern.test(trimmed) && trimmed.length < 30) {
      return true;
    }
  }

  // Detect document metadata (e.g., "ATRIUM", "FIRST EDITION 2006")
  if (/^(FIRST|SECOND|THIRD|FOURTH|FIFTH)\s+EDITION\s+\d{4}$/i.test(trimmed) ||
    /^[A-Z]{3,}$/.test(trimmed) && trimmed.length < 15 && !/^[A-Z]{3,}\s/.test(trimmed)) {
    // Single word all caps (likely document title/metadata)
    if (/^[A-Z]{4,}$/.test(trimmed) && trimmed.length < 20) {
      return true;
    }
  }

  // Detect random fragments with quotes and special chars (e.g., "t"A", "1 YA1): O s. l alli")
  if (/^[a-z]\s*"[A-Z]"/i.test(trimmed) || /^\d+\s+[A-Z]+\d+\):\s*[A-Z]\s*[a-z]\s*[a-z]\s*[a-z]+$/i.test(trimmed)) {
    return true;
  }

  // Detect lines with isolated single letters and fragments (e.g., "i ills", "M5 l")
  if (/^[a-z]\s+[a-z]{1,4}$/i.test(trimmed) || /^[A-Z]\d+\s+[a-z]$/i.test(trimmed)) {
    return true;
  }

  // Detect lines ending with random fragments (e.g., "t"A", "M5 l")
  if (/[a-z]\s*"[A-Z]"$/.test(trimmed) || /\s+[A-Z]\d+\s+[a-z]$/.test(trimmed)) {
    const readableWords = (trimmed.match(/\b[A-Za-z]{3,}\b/g) || []).length;
    if (readableWords < 2) {
      return true;
    }
  }

  // Remove lines with random character sequences like "B9ZRRRNPYMSC" or "AAv-1.A:4.4du"
  const randomSequencePattern = /[A-Z]{5,}[0-9]|[0-9][A-Z]{5,}|[A-Za-z]{1,2}[\.:][A-Za-z]{1,2}[\.:][A-Za-z]{1,2}/g;
  if (randomSequencePattern.test(trimmed)) {
    return true;
  }

  // Remove lines with patterns like "An1:*,63" or "~aa" or "J-c!" (special chars mixed with short text)
  const corruptedPatterns = [
    /[~`^][a-z]{1,2}[^a-zA-Z]/,  // Tilde/backtick with 1-2 letters like "~aa"
    /[A-Z][a-z]?[-_!@#$%^&*()]+[a-z]/,  // Mixed case with special chars like "J-c!"
    /[a-zA-Z]\d+[:*][\d,]+/,  // Letter followed by number, colon/asterisk, more numbers like "An1:*,63"
    /[A-Za-z]\d+[A-Za-z][:\.][A-Za-z]/,  // Pattern like "A1v:4" or "p"AAv-1.A:4.4du"
    /\d+[a-z]\s*[~`^!@#$%^&*()_+]/,  // Numbers followed by letter and special chars like "445l ~aa"
    /"[A-Z]{2,}[^"]*"/,  // Quoted random sequences like "AAv" or "M"
    /[A-Za-z]\d+[a-z]\s*[~`^]/,  // Pattern like "445l ~aa"
  ];

  let corruptedPatternCount = 0;
  for (const pattern of corruptedPatterns) {
    if (pattern.test(trimmed)) {
      corruptedPatternCount++;
    }
  }

  if (corruptedPatternCount > 0) {
    const readableWords = (trimmed.match(/\b[A-Za-z]{3,}\b/g) || []).length;
    // Remove if it has corrupted patterns - be more aggressive
    // If has 1+ corrupted pattern and less than 3 readable words, remove it
    // If has 2+ corrupted patterns, remove unless it has 5+ readable words (very substantial content)
    if (readableWords < 3 || (corruptedPatternCount >= 2 && readableWords < 5)) {
      return true;
    }
  }

  // Remove lines with excessive special characters mixed with text (like "p"AAv-1.A:4.4du,")
  const specialCharCount = (trimmed.match(/[~`!@#$%^&*()_+=\[\]{}|\\:;"'<>,\.\/?\-]/g) || []).length;
  const letterCount = (trimmed.match(/[A-Za-z]/g) || []).length;
  if (specialCharCount > 3 && letterCount < 10 && trimmed.length < 30) {
    return true;
  }

  // Remove lines that are mostly special characters or random symbols
  const specialCharRatio = specialCharCount / trimmed.length;
  if (specialCharRatio > 0.4 && trimmed.length < 25) {
    return true;
  }

  // Remove lines with too many random capital letters mixed with lowercase (OCR errors)
  const randomCapsPattern = /[a-z][A-Z][a-z]|[A-Z][a-z][A-Z][a-z]/g;
  const randomCapsMatches = (trimmed.match(randomCapsPattern) || []).length;
  if (randomCapsMatches > 1 && trimmed.length < 30) {
    const readableWords = (trimmed.match(/\b[A-Za-z]{3,}\b/g) || []).length;
    if (readableWords < 2) {
      return true;
    }
  }

  // Remove lines with excessive isolated characters (spaces between single chars)
  const isolatedChars = (trimmed.match(/\b[A-Za-z]\s+[A-Za-z]\s+[A-Za-z]/g) || []).length;
  if (isolatedChars > 1 && trimmed.length < 25) {
    return true;
  }

  // Remove lines with corrupted endings like "p"AAv-1.A:4.4du," or "~aa J-c!"
  // Check if line ends with corrupted patterns (last 40% of line)
  const endPortion = trimmed.substring(Math.floor(trimmed.length * 0.6));
  const corruptedEndPatterns = [
    /[~`^][a-z]{1,2}/,  // Ending with "~aa"
    /[A-Z][a-z]?[-_!@#$%^&*()]+[a-z]/,  // Ending with "J-c!"
    /\d+[a-z]\s*[~`^!@#$%^&*()_+]/,  // Ending with "445l ~aa"
    /[A-Za-z]{1,2}[\.:][A-Za-z]{1,2}[\.:][A-Za-z]{1,2}[,"]/,  // Ending with "A:4.4du,"
    /["'][A-Z]{1,3}\s*["']/,  // Ending with "'AAv'" or '"M"'
  ];

  for (const pattern of corruptedEndPatterns) {
    if (pattern.test(endPortion)) {
      const readableWords = (trimmed.match(/\b[A-Za-z]{3,}\b/g) || []).length;
      // Remove if ending is corrupted and doesn't have enough readable content
      if (readableWords < 3) {
        return true;
      }
    }
  }

  // Remove lines with no readable words (3+ consecutive letters) and sufficient content
  const readableWords = (trimmed.match(/\b[A-Za-z]{3,}\b/g) || []).length;
  if (readableWords === 0 && trimmed.length > 3) {
    return true; // No readable words but has content = likely corrupted
  }

  // Remove lines that are mostly non-readable (less than 30% readable words)
  const totalWords = (trimmed.match(/\b\S+\b/g) || []).length;
  if (totalWords > 0 && readableWords / totalWords < 0.3 && trimmed.length < 40) {
    return true;
  }

  return false;
}

/**
 * Detect corrupted lines without removing them
 */
export function detectCorruptedLines(text: string): Array<{ line: string; reason: string; index: number }> {
  const lines = text.split('\n');
  const corrupted: Array<{ line: string; reason: string; index: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    if (isCorruptedLine(lines[i])) {
      corrupted.push({
        line: lines[i],
        reason: 'Detected as corrupted or nonsensical',
        index: i
      });
    }
  }

  return corrupted;
}

/**
 * Get reason why a line is considered corrupted
 */
function getCorruptionReason(line: string): string {
  const trimmed = line.trim();

  if (trimmed.length <= 2 && !/^[A-Z]{1,2}$/.test(trimmed)) {
    return 'Line too short';
  }

  if (/^\d$/.test(trimmed)) {
    return 'Single digit only';
  }

  // Company/entity headers
  if (/^[A-Z][a-zA-Z\s]+For\s+\d+$/i.test(trimmed) || /^[A-Z][a-zA-Z\s]+For\s+\d+\s*$/.test(trimmed)) {
    return 'Company/entity header with number (e.g., "Emaar Misr For 9")';
  }

  // Tax card/ID numbers
  if (/^Tax\s+Card\s+\d+[-.\s]?\d+[-.\s]?\d+/i.test(trimmed)) {
    return 'Tax card or ID number (e.g., "Tax Card 218-287-208")';
  }

  // P.O. Box addresses
  if (/^P\.?\s*O\.?\s*BOX\s+\d+/i.test(trimmed)) {
    return 'P.O. Box address (e.g., "P. O BOX 229, Mokattam Mier")';
  }

  // City, Country patterns
  if (/^[A-Z][a-z]+,\s*[A-Z][a-z]+$/i.test(trimmed) && trimmed.length < 30) {
    return 'Address line (city, country)';
  }

  // Document metadata
  if (/^(FIRST|SECOND|THIRD|FOURTH|FIFTH)\s+EDITION\s+\d{4}$/i.test(trimmed)) {
    return 'Document metadata (e.g., "FIRST EDITION 2006")';
  }

  if (/^[A-Z]{4,}$/.test(trimmed) && trimmed.length < 20) {
    return 'Document title/metadata (all caps, single word)';
  }

  // Random fragments
  if (/^[a-z]\s*"[A-Z]"/i.test(trimmed)) {
    return 'Random fragment with quotes (e.g., "t"A")';
  }

  if (/^\d+\s+[A-Z]+\d+\):\s*[A-Z]\s*[a-z]\s*[a-z]\s*[a-z]+$/i.test(trimmed)) {
    return 'Random fragment pattern (e.g., "1 YA1): O s. l alli")';
  }

  if (/^[a-z]\s+[a-z]{1,4}$/i.test(trimmed)) {
    return 'Isolated single letters (e.g., "i ills")';
  }

  if (/^[A-Z]\d+\s+[a-z]$/i.test(trimmed)) {
    return 'Pattern with letter-number-letter (e.g., "M5 l")';
  }

  if (/[A-Z]{5,}[0-9]|[0-9][A-Z]{5,}|[A-Za-z]{1,2}[\.:][A-Za-z]{1,2}[\.:][A-Za-z]{1,2}/g.test(trimmed)) {
    return 'Random character sequences detected';
  }

  if (/[~`^][a-z]{1,2}[^a-zA-Z]/.test(trimmed)) {
    return 'Contains corrupted pattern (tilde/backtick with letters)';
  }

  if (/[A-Z][a-z]?[-_!@#$%^&*()]+[a-z]/.test(trimmed)) {
    return 'Contains corrupted pattern (special chars mixed)';
  }

  if (/[a-zA-Z]\d+[:*][\d,]+/.test(trimmed)) {
    return 'Contains corrupted pattern (letter-number-symbol sequence)';
  }

  if (/\d+[a-z]\s*[~`^!@#$%^&*()_+]/.test(trimmed)) {
    return 'Contains corrupted pattern (number-letter-special char)';
  }

  const specialCharCount = (trimmed.match(/[~`!@#$%^&*()_+=\[\]{}|\\:;"'<>,\.\/?\-]/g) || []).length;
  if (specialCharCount > 3) {
    const letterCount = (trimmed.match(/[A-Za-z]/g) || []).length;
    if (letterCount < 10 && trimmed.length < 30) {
      return 'Too many special characters relative to text';
    }
  }

  const readableWords = (trimmed.match(/\b[A-Za-z]{3,}\b/g) || []).length;
  if (readableWords === 0 && trimmed.length > 3) {
    return 'No readable words detected';
  }

  return 'Contains corrupted patterns';
}

/**
 * Preprocess text to fix common PDF extraction errors
 * Optionally remove corrupted lines if approvedLinesToRemove is provided
 */
export function preprocessText(text: string, approvedLinesToRemove?: number[]): PreprocessedText {
  let cleaned = text;
  const fixes: Array<{ original: string; fixed: string; reason: string }> = [];

  // Detect corrupted lines
  const corruptedLines = detectCorruptedLines(text);

  // Remove corrupted lines if user approved specific ones
  let removedLinesCount = 0;
  if (approvedLinesToRemove && approvedLinesToRemove.length > 0) {
    const lines = cleaned.split('\n');
    const validLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (!approvedLinesToRemove.includes(i)) {
        validLines.push(lines[i]);
      } else {
        removedLinesCount++;
      }
    }

    cleaned = validLines.join('\n');
  } else {
    // No approval yet, just detect but don't remove
    cleaned = text;
  }

  // Apply common fixes
  for (const { pattern, fix, reason } of COMMON_FIXES) {
    const matches = cleaned.match(pattern);
    if (matches) {
      const original = cleaned;
      cleaned = cleaned.replace(pattern, fix);
      if (original !== cleaned) {
        fixes.push({
          original: matches[0],
          fixed: fix,
          reason
        });
      }
    }
  }

  // Normalize quotes
  cleaned = cleaned.replace(/[""]/g, '"').replace(/['']/g, "'");

  // Fix common punctuation issues
  cleaned = cleaned.replace(/\.\.\./g, '…');
  cleaned = cleaned.replace(/\s+([.,;:!?])/g, '$1');
  cleaned = cleaned.replace(/([.,;:!?])([A-Za-z])/g, '$1 $2');

  // Remove excessive blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Estimate clause count based on patterns
  const clausePatterns = [
    /(?:^|\n)\s*(?:Clause|Article|Section)\s+[\dA-Z.]+/gi,
    /(?:^|\n)\s*[\dA-Z]+\.[\dA-Z.]*\s+/g
  ];

  let estimatedClauses = 0;
  for (const pattern of clausePatterns) {
    const matches = cleaned.match(pattern);
    if (matches) {
      estimatedClauses = Math.max(estimatedClauses, matches.length);
    }
  }

  // Add reasons to corrupted lines
  const corruptedLinesWithReasons = corruptedLines.map(cl => ({
    ...cl,
    reason: getCorruptionReason(cl.line)
  }));

  return {
    cleaned: cleaned.trim(),
    fixes,
    estimatedClauses,
    removedLines: removedLinesCount,
    corruptedLines: corruptedLinesWithReasons
  };
}

/**
 * Detect potential clause boundaries in text
 */
export function detectClauseBoundaries(text: string): number[] {
  const boundaries: number[] = [0]; // Start is always a boundary

  // Patterns that indicate clause starts
  const clauseStartPatterns = [
    /(?:^|\n)\s*(?:Clause|Article|Section)\s+[\dA-Z.]+/gi,
    /(?:^|\n)\s*[\dA-Z]+\.[\dA-Z.]*\s+[A-Z]/g,
    /(?:^|\n)\s*[IVX]+\.\s+[A-Z]/g, // Roman numerals
  ];

  for (const pattern of clauseStartPatterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      if (!boundaries.includes(match.index)) {
        boundaries.push(match.index);
      }
    }
  }

  boundaries.sort((a, b) => a - b);
  return boundaries;
}

/**
 * Split text into logical chunks for processing
 */
export function splitTextIntoChunks(
  text: string,
  maxChars: number = 100000
): string[] {
  if (text.length <= maxChars) return [text];

  const boundaries = detectClauseBoundaries(text);
  const chunks: string[] = [];
  let currentChunk = '';
  let lastBoundary = 0;

  for (let i = 1; i < boundaries.length; i++) {
    const boundary = boundaries[i];
    const segment = text.substring(lastBoundary, boundary);

    if (currentChunk.length + segment.length > maxChars && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = segment;
    } else {
      currentChunk += segment;
    }

    lastBoundary = boundary;
  }

  // Add remaining text
  if (lastBoundary < text.length) {
    const remaining = text.substring(lastBoundary);
    if (currentChunk.length + remaining.length > maxChars && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = remaining;
    } else {
      currentChunk += remaining;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

/**
 * AI-powered text cleaning for PDF-to-text conversion issues
 * Uses Claude to intelligently fix formatting while preserving legal meaning
 */
const TEXT_CLEANING_SYSTEM_PROMPT = `You are a construction contract expert and text-cleaning assistant.
I will give you raw contract text that was converted from PDF. The conversion caused a lot of formatting issues.

Your job is to:

Detect typical PDF-to-text problems.

Fix them while keeping the legal meaning and clause numbering exactly the same.

Common problems to fix:

Random line breaks inside sentences and clauses

Words broken by hyphen and newline (like "obliga-\n tion" → "obligation")

Missing spaces between words or after punctuation

Duplicated lines or paragraphs caused by page headers/footers

Page numbers, "Page X of Y", project titles, or header/footer texts in the middle of the clause

Broken clause numbers or titles (e.g. "1.\n1 Defi-\nnitions" → "1.1 Definitions")

Extra blank lines in the middle of clauses

Strange characters from encoding (like) – remove or replace with the obvious correct character if clear

Broken cross-references (e.g. "Clause\n7.1" → "Clause 7.1")

Very important rules:

Do NOT change the legal meaning.

Do NOT invent or delete any clause content except obvious noise like page headers/footers or page numbers.

Keep all original clause numbers (1.1, 1.2, 2.3, 6A.1, 22.4, etc.).

Keep clause titles exactly as in the text, just fix broken words/lines.

Keep each clause as a clean block of text (number + title + body).

Keep cross-references (like "Clause 7.1") but fix spacing/line breaks.

Output format:

Return ONLY the cleaned contract text as plain text.

No explanations, no bullets, no markdown, no comments.

Separate clauses with one blank line between them.`;

export async function cleanTextWithAI(
  text: string,
  _apiKey?: string,
  onProgress?: (current: number, total: number, currentLine?: number, totalLines?: number) => void
): Promise<string> {
  // API keys are now server-side via /api/ai-proxy
  const MAX_OUTPUT_TOKENS = 16384;
  const MAX_INPUT_TOKENS = 180000;

  // Helper to call the proxy
  async function callCleaning(inputText: string, systemPrompt: string) {
    const response = await callAIProxy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Clean the following contract text. Fix all PDF-to-text conversion issues while preserving legal meaning and clause numbering exactly:\n\n${inputText}`
        }
      ]
    });
    const content = response.content.find(c => c.type === 'text');
    if (!content?.text) {
      throw new Error('Unexpected response format from Claude');
    }
    return content.text.trim();
  }

  // Estimate tokens (rough: 1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil(text.length / 4);

  // If text is small enough, process in one go
  if (estimatedTokens < MAX_INPUT_TOKENS) {
    const totalLines = text.split('\n').length;
    if (onProgress) {
      onProgress(0, 1, 0, totalLines);
    }

    // Simulate progress during API call
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    if (onProgress) {
      let simulatedLine = 0;
      const lineIncrement = Math.max(1, Math.floor(totalLines / 40));
      progressInterval = setInterval(() => {
        simulatedLine = Math.min(totalLines, simulatedLine + lineIncrement);
        onProgress(0, 1, simulatedLine, totalLines);
      }, 300);
    }

    try {
      const result = await callCleaning(text, TEXT_CLEANING_SYSTEM_PROMPT);
      if (progressInterval) clearInterval(progressInterval);
      if (onProgress) onProgress(1, 1, totalLines, totalLines);
      return result;
    } catch (error: any) {
      if (progressInterval) clearInterval(progressInterval);
      if (error.message?.includes('context_length') || error.message?.includes('token')) {
        // Fall through to chunking
      } else {
        throw error;
      }
    }
  }

  // For large texts, split into chunks at clause boundaries
  const MAX_CHARS_PER_CHUNK = MAX_INPUT_TOKENS * 3;
  const chunks = splitTextIntoChunks(text, MAX_CHARS_PER_CHUNK);
  const cleanedChunks: string[] = [];

  const totalLines = text.split('\n').length;
  let processedChars = 0;

  if (onProgress) {
    onProgress(0, chunks.length, 0, totalLines);
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const textBeforeChunk = text.substring(0, processedChars);
    const linesBeforeChunk = textBeforeChunk.split('\n').length - 1;
    const chunkLines = chunk.split('\n').length;
    const startLine = linesBeforeChunk + 1;

    if (onProgress) {
      onProgress(i, chunks.length, startLine, totalLines);
    }

    let progressInterval: ReturnType<typeof setInterval> | null = null;
    if (onProgress) {
      let simulatedLine = startLine;
      const lineIncrement = Math.max(1, Math.floor(chunkLines / 20));
      progressInterval = setInterval(() => {
        simulatedLine = Math.min(startLine + chunkLines, simulatedLine + lineIncrement);
        onProgress(i, chunks.length, simulatedLine, totalLines);
      }, 500);
    }

    try {
      const chunkSystem = TEXT_CLEANING_SYSTEM_PROMPT + '\n\nIMPORTANT: This is part ' + (i + 1) + ' of ' + chunks.length + ' chunks. Clean this section completely, preserving all clause numbers and content.';
      const cleaned = await callCleaning(chunk, chunkSystem);

      if (progressInterval) clearInterval(progressInterval);
      cleanedChunks.push(cleaned);
      processedChars += chunk.length;

      const completedLines = linesBeforeChunk + chunkLines;
      if (onProgress) {
        onProgress(i + 1, chunks.length, completedLines, totalLines);
      }
    } catch (error: any) {
      if (progressInterval) clearInterval(progressInterval);

      if (error.message?.includes('context_length') || error.message?.includes('token')) {
        // Chunk is still too large, try splitting it further
        const subChunks = splitTextIntoChunks(chunk, (MAX_INPUT_TOKENS * 3) / 2);
        let subChunkProcessedChars = 0;

        for (let j = 0; j < subChunks.length; j++) {
          const subChunk = subChunks[j];
          const subChunkLines = subChunk.split('\n').length;
          const subChunkTextBefore = chunk.substring(0, subChunkProcessedChars);
          const subLinesBefore = linesBeforeChunk + subChunkTextBefore.split('\n').length;
          const subCurrentLine = subLinesBefore + 1;

          if (onProgress) {
            onProgress(i, chunks.length, subCurrentLine, totalLines);
          }

          const subCleaned = await callCleaning(subChunk, TEXT_CLEANING_SYSTEM_PROMPT);
          cleanedChunks.push(subCleaned);
          subChunkProcessedChars += subChunk.length;
          processedChars += subChunk.length;

          const subCompletedLines = subLinesBefore + subChunkLines;
          if (onProgress) {
            onProgress(i, chunks.length, subCompletedLines, totalLines);
          }
        }
      } else {
        throw new Error(`Text cleaning failed on chunk ${i + 1}: ${error.message || 'Unknown error'}`);
      }
    }
  }

  return cleanedChunks.join('\n\n').trim();
}
