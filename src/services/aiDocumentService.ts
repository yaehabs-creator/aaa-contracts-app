import { createAIProvider } from './aiProvider';
import { Clause, BotMessage } from '@/types';
import { getDocumentReaderService, DocumentChunkContent } from './documentReaderService';
import { getEmbeddingService } from './embeddingService';
import { CONTRACT_ASSISTANT_SYSTEM_INSTRUCTION } from './aiChatService';

export const EXPLAIN_SYSTEM_INSTRUCTION = `You are CLAUDE CONTRACT EXPERT — a specialized AI in construction contracts.

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

/**
 * Format search results for display
 */
export function formatSearchResults(results: DocumentChunkContent[]): string {
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

/**
 * Chat with bot using document content from service
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
      try {
        const embeddingService = getEmbeddingService();
        const queryEmbedding = await embeddingService.generateEmbeddings(options.searchQuery);

        if (queryEmbedding && queryEmbedding.length > 0) {
          const searchResults = await readerService.searchSimilarChunks(contractId, queryEmbedding[0], { limit: 15 });
          if (searchResults.length > 0) {
            documentContext = formatSearchResults(searchResults);
          }
        }
      } catch (err) {
        console.warn('Vector search failed, falling back to text search');
        const searchResults = await readerService.searchDocuments(contractId, options.searchQuery, { limit: 10 });
        if (searchResults.length > 0) {
          documentContext = formatSearchResults(searchResults);
        }
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
    return 'Unable to load document summary. Make sure backend is running correctly.';
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
