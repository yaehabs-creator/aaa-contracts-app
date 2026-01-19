import Anthropic from "@anthropic-ai/sdk";

export interface DetectedClause {
  clause_number: string;
  clause_title: string;
  general_condition?: string;
  particular_condition?: string;
  confidence: number;
}

const CLAUSE_DETECTION_SYSTEM_PROMPT = `You are a contract clause extraction expert for the AAA Contract Department.
Your task is to analyze contract text and identify all individual clauses, extracting their clause numbers and titles.

### Instructions:
1. Analyze the provided text and identify all distinct clauses
2. For each clause, extract:
   - The clause number (e.g., "1.6", "2A.1", "1.6(a)", "3B.2.1")
   - The clause title/heading
   - The clause content/text
3. If both General and Particular texts are provided, match clauses by number and assign accordingly
4. Provide a confidence score (0-1) for each detection

### Clause Number Patterns:
- Standard: "1.1", "2.3", "14.5"
- Alphanumeric: "2A.1", "3B.2.1"
- Sub-clauses: "1.6(a)", "1.6(b)", "2.3(i)"
- Articles: "Article 5", "Article 12"

### Output Format:
Return ONLY valid JSON in this exact format:
{
  "clauses": [
    {
      "clause_number": "string",
      "clause_title": "string",
      "general_condition": "string (optional)",
      "particular_condition": "string (optional)",
      "confidence": number (0-1)
    }
  ]
}

### Important:
- Do NOT include markdown formatting
- Do NOT include code blocks
- Return ONLY the JSON object
- Extract clause numbers exactly as they appear in the text
- If a clause appears in both General and Particular, include both texts
- If a clause only appears in one, leave the other empty`;

export async function detectClausesFromText(
  text: string,
  isDualInput: boolean = false,
  generalText?: string,
  particularText?: string
): Promise<DetectedClause[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not configured, cannot detect clauses');
    return [];
  }

  if (!text && !generalText && !particularText) {
    return [];
  }

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true
  });
  const model = 'claude-sonnet-4-5-20250929';

  let prompt = '';
  if (isDualInput && generalText && particularText) {
    prompt = `Analyze the following contract texts and extract all clauses with their numbers and titles.

GENERAL BASELINE TEXT:
${generalText}

PARTICULAR LEDGER TEXT:
${particularText}

Extract all clauses from both texts. If a clause number exists in both, include both general_condition and particular_condition. If it only exists in one, include only that one.`;
  } else {
    prompt = `Analyze the following contract text and extract all clauses with their numbers and titles.

CONTRACT TEXT:
${text}

Extract all distinct clauses, identifying their clause numbers and titles.`;
  }

  try {
    const message = await client.messages.create({
      model: model,
      max_tokens: 4096,
      system: CLAUSE_DETECTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const resultText = message.content.find(c => c.type === 'text') && 'text' in message.content.find(c => c.type === 'text')!
      ? (message.content.find(c => c.type === 'text') as any).text
      : '';

    if (!resultText) {
      return [];
    }

    // Extract JSON from response (might be wrapped in markdown)
    let jsonText = resultText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.clauses && Array.isArray(parsed.clauses)) {
        // Validate and filter clauses
        const validClauses = parsed.clauses
          .filter((c: any) => 
            c.clause_number && 
            c.clause_title &&
            typeof c.confidence === 'number' &&
            c.confidence >= 0 &&
            c.confidence <= 1
          )
          .map((c: any) => ({
            clause_number: c.clause_number.trim(),
            clause_title: c.clause_title.trim(),
            general_condition: c.general_condition?.trim() || '',
            particular_condition: c.particular_condition?.trim() || '',
            confidence: Math.max(0, Math.min(1, c.confidence))
          }))
          .sort((a: DetectedClause, b: DetectedClause) => {
            // Sort by clause number
            return a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true });
          });
        
        if (validClauses.length === 0 && parsed.clauses.length > 0) {
          // All clauses were filtered out during validation
        }
        
        return validClauses;
      }
      
      
      return [];
    } catch (parseError: any) {
      console.error('Failed to parse clause detection response:', parseError);
      console.error('Response text:', jsonText.substring(0, 500));
      
      
      return [];
    }
  } catch (error: any) {
    console.error('Failed to detect clauses:', error);
    return [];
  }
}
