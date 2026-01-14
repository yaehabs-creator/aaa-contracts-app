import { createAIProvider } from './aiProvider';
import { Clause } from '../../types';

const CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION = `You are CLAUDE CONTRACT EXPERT — a specialized AI in construction contracts, FIDIC conditions, claims, delays, variations, payments, EOT, LDs, and contract administration.

CRITICAL FORMATTING RULES:
- NO markdown formatting (no **bold**, no ### headers, no --- separators)
- NO asterisks, hashtags, or special markdown characters
- Use ONLY plain text with emojis for structure
- Use ONLY these emojis: 🔵 🔹 🔸 🔷
- Keep one blank line between sections
- Keep bullet points on single lines
- Never use bold text or markdown emphasis

RESPONSE STRUCTURE:
🔵 Section Title
🔹 Main point
🔸 Short explanation (one line only)
🔹 Next point
🔸 Short explanation

🔷 You can also ask me to:
- Option 1
- Option 2
- Option 3

ABSOLUTE RULES:
- Plain text only, no markdown
- One line per bullet point
- One blank line between sections
- Maximum 2–3 lines per explanation
- Always end with 2–3 follow-up options
- Never invent clause numbers
- Use only clauses the user provides

EXAMPLE:

🔵 Payment Clauses
🔹 Clause 26 — Interim certificates
🔸 Contractor applies monthly, Engineer issues within 28 days
🔹 Clause 27 — Payment timelines
🔸 Employer pays within 56 days of certificate date

🔷 You can also ask me to:
- Compare Employer vs Contractor obligations
- Extract all payment deadlines
- Explain retention release process`;

const SUGGESTIONS_SYSTEM_INSTRUCTION = `You are a helpful assistant for contract analysis. Based on the current contract clauses, suggest 3-5 helpful actions or questions the user might want to explore. Return a JSON array of suggestion strings.`;

const EXPLAIN_SYSTEM_INSTRUCTION = `You are CLAUDE CONTRACT EXPERT — a specialized AI in construction contracts.

CRITICAL FORMATTING RULES:
- NO markdown formatting (no **bold**, no ### headers, no --- separators)
- NO asterisks, hashtags, or special markdown characters
- Use ONLY plain text with emojis for structure
- Use ONLY these emojis: 🔵 🔹 🔸 🔷
- Keep one blank line between sections
- Keep bullet points on single lines
- Never use bold text or markdown emphasis

When explaining a clause:

🔵 Clause [NUMBER] — [TITLE]
🔹 What this clause means
🔸 Brief explanation (one line only)

🔵 Key Obligations
🔹 Employer obligations (if any)
🔸 Short description
🔹 Contractor obligations (if any)
🔸 Short description

🔵 Important Timeframes
🔸 Any deadlines or notice periods
🔸 Response requirements

🔷 You can also ask me to:
- Compare with General Conditions
- Show payment implications
- Identify related clauses

Plain text only, no markdown formatting.`;

export async function chatWithBot(
  query: string,
  context: Clause[]
): Promise<string> {
  const aiProvider = createAIProvider();
  
  if (!aiProvider.isAvailable()) {
    throw new Error('Claude API key is not configured. Please check your ANTHROPIC_API_KEY environment variable.');
  }

  try {
    return await aiProvider.chat(query, context, CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION);
  } catch (error: any) {
    throw new Error(`Failed to get response from Claude: ${error.message}`);
  }
}

export async function getSuggestions(
  clauses: Clause[]
): Promise<string[]> {
  const aiProvider = createAIProvider();
  
  if (!aiProvider.isAvailable()) {
    return [
      'Explain a clause',
      'Find clauses about payment',
      'Search for time-sensitive clauses',
      'Compare General vs Particular conditions'
    ];
  }

  const query = `Based on these ${clauses.length} contract clauses, suggest 3-5 helpful actions or questions the user might want to explore. Return only a JSON array of strings, no other text.`;

  try {
    const response = await aiProvider.chat(query, clauses, SUGGESTIONS_SYSTEM_INSTRUCTION);
    
    // Try to parse JSON array from response
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 5);
      }
    } catch {
      // If parsing fails, extract suggestions from text
      const lines = response.split('\n').filter(line => line.trim().length > 0);
      return lines.slice(0, 5);
    }
    
    return [
      'Explain a clause',
      'Find clauses about payment',
      'Search for time-sensitive clauses'
    ];
  } catch (error: any) {
    console.error('Failed to get suggestions:', error);
    return [
      'Explain a clause',
      'Find clauses about payment',
      'Search for time-sensitive clauses'
    ];
  }
}

export async function explainClause(
  clause: Clause
): Promise<string> {
  const aiProvider = createAIProvider();
  
  if (!aiProvider.isAvailable()) {
    throw new Error('Claude API key is not configured.');
  }

  const query = `Explain this contract clause in detail:\n\nClause ${clause.clause_number}: ${clause.clause_title}\n\n${clause.clause_text}\n\n${clause.general_condition ? `General Condition: ${clause.general_condition}\n` : ''}${clause.particular_condition ? `Particular Condition: ${clause.particular_condition}` : ''}`;

  try {
    return await aiProvider.chat(query, [], EXPLAIN_SYSTEM_INSTRUCTION);
  } catch (error: any) {
    throw new Error(`Failed to explain clause: ${error.message}`);
  }
}
