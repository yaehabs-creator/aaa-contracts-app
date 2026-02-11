import { callAIProxy } from "../src/services/aiProxyClient";
import { Clause } from "../types";

export interface CategorySuggestion {
  categoryName: string;
  suggestedClauseNumbers: string[];
  confidence: number;
  reasoning: string;
}

const CATEGORY_SUGGESTION_SYSTEM_PROMPT = `You are a contract categorization expert for the AAA Contract Department.
Your task is to analyze contract clauses and suggest logical category names that group related clauses together.

### Instructions:
1. Analyze the provided clauses and identify common themes, topics, or functional areas
2. Suggest 5-10 category names that would logically group these clauses
3. For each category, identify which clause numbers should belong to it
4. Provide a confidence score (0-1) indicating how confident you are in the suggestion
5. Provide brief reasoning for each category

### Category Naming Guidelines:
- Use clear, descriptive names (e.g., "Payment Terms", "Time Frames", "Liability & Risk", "Quality Control")
- Keep names concise (2-4 words typically)
- Use professional terminology appropriate for construction contracts
- Avoid overly generic names like "General" or "Other"

### Output Format:
Return ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "categoryName": "string",
      "suggestedClauseNumbers": ["string"],
      "confidence": number (0-1),
      "reasoning": "string"
    }
  ]
}

### Important:
- Do NOT include markdown formatting
- Do NOT include code blocks
- Return ONLY the JSON object
- Ensure all clause numbers match exactly as provided in the input`;

export async function suggestCategories(clauses: Clause[]): Promise<CategorySuggestion[]> {
  if (!clauses || clauses.length === 0) {
    return [];
  }

  // Prepare clause summary for analysis
  const clauseSummaries = clauses.map(c => ({
    clause_number: c.clause_number,
    clause_title: c.clause_title || 'Untitled',
    text_snippet: (c.clause_text || c.general_condition || c.particular_condition || '').substring(0, 200)
  }));

  const prompt = `Analyze the following contract clauses and suggest logical category names that group related clauses together.

CLAUSES:
${JSON.stringify(clauseSummaries, null, 2)}

Provide category suggestions that would help organize these clauses into meaningful groups.`;

  try {
    const response = await callAIProxy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: CATEGORY_SUGGESTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const textBlock = response.content.find(c => c.type === 'text');
    const resultText = textBlock?.text || '';

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
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        return parsed.suggestions
          .filter((s: any) =>
            s.categoryName &&
            Array.isArray(s.suggestedClauseNumbers) &&
            typeof s.confidence === 'number' &&
            s.confidence >= 0 &&
            s.confidence <= 1
          )
          .map((s: any) => ({
            categoryName: s.categoryName.trim(),
            suggestedClauseNumbers: s.suggestedClauseNumbers.filter((num: string) =>
              clauses.some(c => c.clause_number === num)
            ),
            confidence: Math.max(0, Math.min(1, s.confidence)),
            reasoning: s.reasoning || ''
          }))
          .filter((s: CategorySuggestion) => s.suggestedClauseNumbers.length > 0)
          .sort((a: CategorySuggestion, b: CategorySuggestion) => b.confidence - a.confidence);
      }
      return [];
    } catch (parseError: any) {
      console.error('Failed to parse category suggestions:', parseError);
      console.error('Response text:', jsonText.substring(0, 500));
      return [];
    }
  } catch (error: any) {
    console.error('Failed to get category suggestions:', error);
    return [];
  }
}
