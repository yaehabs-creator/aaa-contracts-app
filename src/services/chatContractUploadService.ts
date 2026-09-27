/**
 * Chat Contract Upload Service
 * Extracts text from TXT/PDF (Docling for PDF), runs OpenClaw full-contract analysis,
 * and returns extracted text + analysis for persistence in chat context.
 */

import { callAIProxy } from './aiProxyClient';
import type { UploadedContract } from '@/contexts/ChatContext';
import { APP_CONFIG } from '@/config/appConfig';

const DOCLING_URL = `${APP_CONFIG.BACKEND_URL}/process/base64`;

export type UploadPhase = 'reading' | 'extracting' | 'analyzing';

export interface UploadProgress {
  phase: UploadPhase;
  message: string;
}

export interface UploadResult {
  name: string;
  fileType: 'pdf' | 'txt';
  extractedText: string;
  openClawAnalysis: string;
  createdAt: number;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Expected string result'));
        return;
      }
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64 || '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function extractTextFromTxtFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function extractTextFromPdfViaDocling(
  file: File,
  onProgress: (p: UploadProgress) => void
): Promise<string> {
  onProgress({ phase: 'extracting', message: 'Connecting to OCR backend…' });
  const base64 = await fileToBase64(file);
  onProgress({ phase: 'extracting', message: 'Extracting text from PDF…' });

  const response = await fetch(DOCLING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_name: file.name || 'document.pdf',
      base64_data: base64
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `OCR backend error. Start the Docling backend on port 8000 (e.g. \`python scripts/docling_backend.py\`). ${response.status}: ${text.slice(0, 200)}`
    );
  }

  const data = await response.json();
  const pages: string[] = Array.isArray(data.pages) ? data.pages : data.text ? [data.text] : [];
  const extractedText = pages.join('\n\n').trim();

  if (!extractedText) {
    throw new Error('No text extracted from PDF. Try a text-based PDF or upload a .txt file.');
  }

  return extractedText;
}

/**
 * Process an uploaded contract file: extract text (TXT or PDF via Docling), then run OpenClaw analysis.
 */
export async function processUploadedContract(
  file: File,
  onProgress: (p: UploadProgress) => void
): Promise<UploadResult> {
  const name = file.name || 'contract';
  const isPdf = file.type === 'application/pdf' || name.toLowerCase().endsWith('.pdf');

  let extractedText: string;

  if (isPdf) {
    extractedText = await extractTextFromPdfViaDocling(file, onProgress);
  } else {
    onProgress({ phase: 'reading', message: 'Reading file…' });
    extractedText = await extractTextFromTxtFile(file);
  }

  if (!extractedText.trim()) {
    throw new Error('File is empty or no text could be extracted. Use a .txt file or a PDF with selectable text.');
  }

  onProgress({ phase: 'analyzing', message: 'Analyzing contract structure…' });
  const aiRes = await callAIProxy({
    provider: 'gemini',
    model: 'gemini-flash-latest',
    system: `You are an expert Contract Administrator. Analyze the contract document provided below. Produce a structured analysis that includes:
1. Parties & contract type
2. Key commercial terms (sum, currency, duration)
3. Main obligations & milestones
4. Risk allocation (delay damages, liability, termination)
5. Executive summary`,
    messages: [{ role: 'user', content: `Analyze this full contract:\n\n${extractedText.slice(0, 50000)}` }],
    max_tokens: 4096,
  });
  const openClawAnalysis = aiRes.content.find(c => c.type === 'text')?.text || 'Analysis complete.';

  return {
    name,
    fileType: isPdf ? 'pdf' : 'txt',
    extractedText,
    openClawAnalysis,
    createdAt: Date.now()
  };
}

const MAX_EXCERPT_CHARS = 4000;
const EXCERPT_RADIUS = 120;

/**
 * Build a compact context string from uploaded contract for inclusion in chat:
 * OpenClaw analysis summary + relevant excerpts from extracted text (keyword match).
 */
export function getUploadedContractContext(
  uploaded: UploadedContract,
  userQuestion: string,
  maxExcerptChars: number = MAX_EXCERPT_CHARS
): string {
  const parts: string[] = [];
  parts.push('=== UPLOADED CONTRACT ANALYSIS ===\n');
  parts.push(uploaded.openClawAnalysis);
  parts.push('\n\n=== RELEVANT EXCERPTS (from contract text) ===\n');

  const keywords = userQuestion
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|has|have|this|that|what|when|where|which|who|will|with)$/.test(w));
  const text = uploaded.extractedText;
  if (!text || keywords.length === 0) {
    parts.push(text.slice(0, maxExcerptChars));
    return parts.join('');
  }

  const lower = text.toLowerCase();
  const excerpts: string[] = [];
  let totalChars = 0;

  for (const kw of keywords) {
    if (totalChars >= maxExcerptChars) break;
    let idx = lower.indexOf(kw);
    while (idx !== -1 && totalChars < maxExcerptChars) {
      const start = Math.max(0, idx - EXCERPT_RADIUS);
      const end = Math.min(text.length, idx + kw.length + EXCERPT_RADIUS);
      let excerpt = text.slice(start, end).trim();
      if (start > 0) excerpt = '…' + excerpt;
      if (end < text.length) excerpt = excerpt + '…';
      if (excerpt && !excerpts.includes(excerpt)) {
        excerpts.push(excerpt);
        totalChars += excerpt.length;
      }
      idx = lower.indexOf(kw, idx + 1);
    }
  }

  if (excerpts.length === 0) {
    parts.push(text.slice(0, maxExcerptChars));
  } else {
    parts.push(excerpts.slice(0, 8).join('\n\n'));
  }

  return parts.join('');
}
