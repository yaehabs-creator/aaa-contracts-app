import { createAIProvider } from './aiProvider';
import { Clause, BotMessage } from '../../types';
import { getDocumentReaderService, DocumentChunkContent } from './documentReaderService';

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
- Always end with 2–3 follow-up options
- Never invent clause numbers
- Use only clauses the user provides
- CITE CLAUSES PRECISELY: When referring to a clause, always use the format "Clause X" or "Clause X.X" so I can link to it.

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
  messages: BotMessage[],
  context: Clause[]
): Promise<string> {
  const aiProvider = createAIProvider();

  if (!aiProvider.isAvailable()) {
    throw new Error('Claude API key is not configured. Please check your ANTHROPIC_API_KEY environment variable.');
  }

  try {
    return await aiProvider.chat(messages, context, CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION);
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
    const messages: BotMessage[] = [{
      id: 'suggestions-query',
      role: 'user',
      content: query,
      timestamp: Date.now()
    }];
    const response = await aiProvider.chat(messages, clauses, SUGGESTIONS_SYSTEM_INSTRUCTION);

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
    const messages: BotMessage[] = [{
      id: 'explain-query',
      role: 'user',
      content: query,
      timestamp: Date.now()
    }];
    return await aiProvider.chat(messages, [], EXPLAIN_SYSTEM_INSTRUCTION);
  } catch (error: any) {
    throw new Error(`Failed to explain clause: ${error.message}`);
  }
}

/**
 * Chat with bot using document content from Supabase
 * This allows the AI to read and analyze uploaded contract documents
 */
export async function chatWithDocuments(
  messages: BotMessage[],
  contractId: string,
  options: {
    focusClause?: string;
    searchQuery?: string;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const aiProvider = createAIProvider();

  if (!aiProvider.isAvailable()) {
    throw new Error('Claude API key is not configured.');
  }

  try {
    const readerService = getDocumentReaderService();
    
    // Get document context
    let documentContext = '';
    
    if (options.searchQuery) {
      // Search for relevant chunks
      const searchResults = await readerService.searchDocuments(contractId, options.searchQuery, { limit: 10 });
      if (searchResults.length > 0) {
        documentContext = formatSearchResults(searchResults);
      }
    }
    
    // Get formatted document context
    const fullContext = await readerService.formatForAIContext(contractId, {
      maxTokens: options.maxTokens || 30000,
      focusClause: options.focusClause
    });
    
    documentContext = documentContext + '\n\n' + fullContext;

    // Enhanced system instruction with document awareness
    const documentAwareInstruction = CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION + `

DOCUMENT CONTEXT:
You have access to the uploaded contract documents. The context below contains extracted text from these documents.
When answering questions:
- Reference specific clauses and their content from the documents
- Quote relevant text when appropriate (use quotation marks)
- Cite the source document group (A=Agreement, B=LOA, C=Conditions, D=Addendum, I=BOQ, N=Schedule)
- If information is not in the provided context, say so clearly

${documentContext}`;

    return await aiProvider.chat(messages, [], documentAwareInstruction);
  } catch (error: any) {
    // Fallback to regular chat if document reading fails
    console.error('Document reading failed, falling back to regular chat:', error);
    return await aiProvider.chat(messages, [], CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION);
  }
}

/**
 * Search documents and return relevant context
 */
export async function searchContractDocuments(
  contractId: string,
  query: string
): Promise<{ found: boolean; results: DocumentChunkContent[]; summary: string }> {
  try {
    const readerService = getDocumentReaderService();
    const results = await readerService.searchDocuments(contractId, query, { limit: 20 });
    
    if (results.length === 0) {
      return {
        found: false,
        results: [],
        summary: `No documents found matching "${query}"`
      };
    }

    const summary = `Found ${results.length} relevant sections:\n` +
      results.slice(0, 5).map((r, i) => 
        `${i + 1}. ${r.clauseNumber ? `Clause ${r.clauseNumber}` : 'Section'}: ${r.content.substring(0, 100)}...`
      ).join('\n');

    return {
      found: true,
      results,
      summary
    };
  } catch (error) {
    console.error('Search failed:', error);
    return {
      found: false,
      results: [],
      summary: 'Search failed. Make sure documents have been uploaded and processed.'
    };
  }
}

/**
 * Get document summary for AI context
 */
export async function getDocumentSummary(contractId: string): Promise<string> {
  try {
    const readerService = getDocumentReaderService();
    const summary = await readerService.getContractSummary(contractId);
    
    if (summary.totalDocuments === 0) {
      return 'No documents have been uploaded for this contract yet.';
    }

    const groupLabels: Record<string, string> = {
      A: 'Agreement & Annexes',
      B: 'Letter of Acceptance',
      C: 'Conditions of Contract',
      D: 'Addendums',
      I: 'BOQ & Pricing',
      N: 'Schedules & Appendices'
    };

    let result = `📁 Contract Documents Summary\n\n`;
    result += `Total: ${summary.totalDocuments} documents, ${summary.totalChunks} extracted sections\n\n`;
    
    // Group by document group
    const byGroup = new Map<string, typeof summary.documents>();
    for (const doc of summary.documents) {
      const group = doc.group;
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group)!.push(doc);
    }

    for (const [group, docs] of byGroup) {
      result += `${groupLabels[group] || group}:\n`;
      for (const doc of docs) {
        const statusIcon = doc.status === 'completed' ? '✅' : doc.status === 'processing' ? '⏳' : '⏸️';
        result += `  ${statusIcon} ${doc.name} (${doc.chunkCount} sections)\n`;
      }
      result += '\n';
    }

    return result;
  } catch (error) {
    console.error('Failed to get document summary:', error);
    return 'Unable to load document summary. Make sure Supabase is configured correctly.';
  }
}

/**
 * Format search results for display
 */
function formatSearchResults(results: DocumentChunkContent[]): string {
  if (results.length === 0) return '';
  
  let formatted = '=== SEARCH RESULTS ===\n\n';
  
  for (const result of results) {
    if (result.clauseNumber) {
      formatted += `[Clause ${result.clauseNumber}${result.clauseTitle ? ': ' + result.clauseTitle : ''}]\n`;
    }
    formatted += result.content + '\n\n';
  }
  
  return formatted;
}
