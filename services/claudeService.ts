import Anthropic from "@anthropic-ai/sdk";
import { Clause, DualSourceInput, FileData } from "../types";

const SYSTEM_INSTRUCTION = `You are the high-fidelity extraction engine for AAA Contract Department. 
Your SOLE PURPOSE is to extract contract clauses 100% VERBATIM.

### 🔴 MANDATORY RULES:
1. **NO SUMMARIZING**: Do not summarize. Do not condense. Do not "explain" the clause instead of providing the text.
2. **NO SKIPPING**: Every clause, sub-clause, and paragraph in the provided text MUST be extracted.
3. **VERBATIM ONLY**: Every field must contain EXACT words from the source.
4. **TEXT CLEANING**: The input text may contain PDF extraction errors. You should:
   - Fix obvious OCR errors (e.g., "rn" → "m", "vv" → "w", "0" → "O" when contextually appropriate)
   - Correct spacing issues (missing spaces between words)
   - Fix broken words at line breaks
   - Normalize punctuation and quotes
   - However, preserve the ORIGINAL MEANING and legal terminology exactly
5. **SMART CLAUSE SPLITTING**: 
   - Identify clause boundaries by looking for: "Clause X.X", "Article X", numbered headings, or clear structural breaks
   - Each clause should be a complete, standalone unit
   - Sub-clauses should be included within their parent clause's text
   - Do NOT split clauses that are clearly part of the same provision
6. **INTERNAL HYPERLINKS**: Detect references to other parts of the document (e.g., "Clause 14.1", "Clause 2A.1", "sub-clause 1.6 (b)", "paragraph 2.1.3", "Article 5") and preserve them as plain text. Do NOT use HTML tags. Keep the reference text exactly as it appears (e.g., "See Clause 14.1" or "as per sub-clause 1.6 (b)"). Preserve alphanumeric clause numbers exactly as they appear (e.g., "2A.1", "3B.2.1").

### 🔵 DUAL INPUT HANDLING:
If both General and Particular texts are provided:
- **Correlate**: If a clause number exists in both, put the General text in "general_condition" and the Particular text in "particular_condition".
- **Standalone**: If a clause ONLY exists in the General Baseline, "particular_condition" MUST be empty.
- **New Additions**: If a clause ONLY exists in the Particular Ledger, "general_condition" MUST be empty.

### 🟠 OUTPUT FORMAT:
You MUST output ONLY valid JSON.

RULES:
- Do NOT include HTML.
- Do NOT include markdown.
- Do NOT include tags like <a>, <p>, <br>.
- Do NOT include angle brackets < >
- Do NOT include unescaped quotes inside text.
- Do NOT include newline characters inside strings.
- Do NOT add commentary.
- Do NOT summarize.
- Escape all internal quotes like: \\"
- Escape all backslashes like: \\\\
- Output only a JSON array.

JSON FORMAT EXACTLY:

[
  {
    "clause_number": "",
    "clause_title": "",
    "condition_type": "",
    "clause_text": "",
    "general_condition": "",
    "particular_condition": "",
    "time_frames": "",
    "cost_implications": ""
  }
]

IF YOU CANNOT FILL A FIELD, RETURN AN EMPTY STRING.
NEVER break the JSON structure.

Field Descriptions:
- **clause_number**: String (e.g. "1.1", "2A.1", "3B.2.1" - can be alphanumeric).
- **clause_title**: Heading string.
- **condition_type**: "General" or "Particular".
- **clause_text**: THE FULL VERBATIM TEXT (cleaned and corrected). For hyperlinks, use plain text format like "See Clause 14.1" instead of HTML tags.
- **general_condition**: VERBATIM Baseline text (cleaned).
- **particular_condition**: VERBATIM Revision text (cleaned).
- **time_frames**: String description of timeframes, or empty string if none.
- **cost_implications**: String description of cost/financial implications, or empty string if none.

### 🟢 TEXT PROCESSING INSTRUCTIONS:
When processing text that appears to be from a PDF:
1. **Identify and fix errors** while preserving legal accuracy
2. **Detect clause boundaries** intelligently
3. **Maintain verbatim accuracy** - only fix obvious errors, don't rewrite
4. **Preserve formatting** - keep paragraph breaks, numbering, and structure
5. **Handle edge cases** - incomplete sentences, table data, footnotes`;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function analyzeContract(input: string | FileData | DualSourceInput, retryCount = 0): Promise<Clause[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true
  });
  
  
  // Try multiple model names in order of preference (Jan 2026)
  const CLAUDE_MODELS = [
    "claude-sonnet-4-5-20250514",      // Claude Sonnet 4.5 (latest, with date)
    "claude-sonnet-4-5",               // Claude Sonnet 4.5 (alias)
    "claude-3-5-sonnet-20241022",      // Claude 3.5 Sonnet (fallback)
    "claude-3-5-haiku-20241022"        // Claude 3.5 Haiku (lightweight fallback)
  ];
  

  let promptText = "";
  let isTextInput = false;

  if (typeof input === 'string') {
    isTextInput = true;
    promptText = `EXTRACT EVERY CLAUSE VERBATIM FROM TEXT:\n\n${input}\n\nNOTE: This text may contain PDF extraction errors. Please intelligently fix obvious errors while maintaining verbatim accuracy.`;
  } else if ('data' in input) {
    promptText = `EXTRACT EVERY CLAUSE VERBATIM FROM PDF:\n\n${atob((input as FileData).data)}`;
  } else {
    const dual = input as DualSourceInput;
    isTextInput = typeof dual.general === 'string' && typeof dual.particular === 'string';
    const isCleanText = dual.skipCleaning === true;

    promptText = `PERFORM DUAL EXTRACTION.
    
GENERAL BASELINE:
${typeof dual.general === 'string' ? dual.general : '[PDF DATA]'}

PARTICULAR LEDGER:
${typeof dual.particular === 'string' ? dual.particular : '[PDF DATA]'}

${isTextInput && !isCleanText ? 'NOTE: This text may contain PDF extraction errors. Please intelligently fix obvious errors (spacing, OCR mistakes, broken words) while maintaining verbatim accuracy and legal terminology.' : isCleanText ? 'NOTE: This text is already clean and preprocessed. Extract clauses verbatim without additional cleaning or error correction.' : ''}`;
  }

  // Try each model candidate until one works
  for (const model of CLAUDE_MODELS) {
    try {
      const message = await client.messages.create({
        model: model,
        max_tokens: 16384,
        system: SYSTEM_INSTRUCTION,
        messages: [
          {
            role: 'user',
            content: promptText
          }
        ]
      });

      const resultText = message.content.find(c => c.type === 'text') && 'text' in message.content.find(c => c.type === 'text')!
        ? (message.content.find(c => c.type === 'text') as any).text
        : '';

      if (!resultText) return [];

      // Try to extract JSON from the response (Claude might wrap it in markdown)
      let jsonText = resultText.trim();
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      try {
        return JSON.parse(jsonText);
      } catch (parseError: any) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response text (first 500 chars):', jsonText.substring(0, 500));
        throw new Error(`Failed to parse Claude's response as JSON. The response may be incomplete or malformed. ${parseError.message}`);
      }
    } catch (error: any) {
      // If this is a 404 model not found error, try the next model
      if (error?.status === 404) {
        console.warn(`Claude model ${model} not available`);
        continue;
      }
      // For other errors (real errors), stop and throw
      throw error;
    }
  }

  // If we get here, no models were available
  const error = new Error("No Claude models available");
  if (!error) {
    throw new Error('All Claude models failed and no error was captured');
  }

  // Log the actual error for debugging
  console.error('Claude API Error:', error);

  if (retryCount < 1) {
    await delay(2000);
    return analyzeContract(input, retryCount + 1);
  }

  // Preserve and provide specific error messages
  let errorMessage = "Batch extraction failed. ";

  if (error.message) {
    // Check for specific error types
    if (error.message.includes('JSON') || error.name === 'SyntaxError' || error.message.includes('parse')) {
      errorMessage += "Invalid JSON response from Claude. The response may be malformed or incomplete.";
    } else if (error.status === 401 || error.message.includes('401') || error.message.includes('authentication') || error.message.includes('API key')) {
      errorMessage += "API authentication failed. Please check your ANTHROPIC_API_KEY.";
    } else if (error.status === 429 || error.message.includes('429') || error.message.includes('rate limit')) {
      errorMessage += "Rate limit exceeded. Please wait a moment and try again.";
    } else if (error.status === 500 || error.message.includes('500') || error.message.includes('server error')) {
      errorMessage += "Claude API server error. Please try again later.";
    } else if (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage += "Network error or timeout. Please check your connection and try again.";
    } else if (error.message.includes('content_filter') || error.message.includes('safety')) {
      errorMessage += "Content was filtered by Claude's safety system. Please review your input.";
    } else if (error.message.includes('context_length') || error.message.includes('token')) {
      errorMessage += "Input is too large. Please split your text into smaller chunks.";
    } else if (error.message.includes('not_found_error') || error.message.includes('model')) {
      errorMessage += `Model not found. Tried: ${modelCandidates.join(', ')}. Please check your API key has access to Claude models.`;
    } else {
      errorMessage += `Error: ${error.message}`;
    }
  } else if (error.status) {
    errorMessage += `API returned status ${error.status}. Please try again.`;
  } else {
    errorMessage += "Unknown error occurred. Please check the browser console for details.";
  }

  throw new Error(errorMessage);
}
