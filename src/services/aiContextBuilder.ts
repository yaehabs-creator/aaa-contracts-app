import { Clause } from '@/types';
import { getDocumentReaderService } from './documentReaderService';
import { getJsonDataSources, buildJsonContext } from './jsonDataSourceService';
import { fetchKnowledgeContext } from './aiKnowledgeService';
import { localKnowledgeService } from './localKnowledgeService';
import { useAppStore } from '@/store/useAppStore';
import { APP_CONFIG } from '@/config/appConfig';
import { retrieveRelevantChunks } from './ragRetrievalService';

// Constants for token management
export const MAX_CONTEXT_TOKENS = 80000;  // ~320,000 characters
export const RESERVED_RESPONSE_TOKENS = 10000;
export const CHARS_PER_TOKEN = 4;  // Rough estimate

/**
 * Build a unified contract context that combines parsed clauses with document chunks
 * This provides the AI with the complete contract view
 */
export async function buildUnifiedContractContext(
  contractId: string | null,
  parsedClauses: Clause[],
  options: {
    maxTokens?: number;
    prioritizeRecent?: boolean;
    includeDocumentChunks?: boolean;
    userQuery?: string;
  } = {}
): Promise<{
  context: string;
  hasDocuments: boolean;
  clauseCount: number;
  chunkCount: number;
}> {
  const {
    maxTokens = MAX_CONTEXT_TOKENS - RESERVED_RESPONSE_TOKENS,
    prioritizeRecent = true,
    includeDocumentChunks = true,
    userQuery
  } = options;

  const { activeChatContextIds } = useAppStore.getState();
  const BACKEND = APP_CONFIG.BACKEND_URL;

  const maxChars = maxTokens * CHARS_PER_TOKEN;
  let usedChars = 0;
  const contextParts: string[] = [];
  let hasDocuments = false;
  let chunkCount = 0;

  // Priority order for clauses: PC > Addendums > GC
  // Sort clauses by condition type (Particular first, then General)
  const sortedClauses = [...parsedClauses].sort((a, b) => {
    // Particular conditions have priority
    if (a.condition_type === 'Particular' && b.condition_type !== 'Particular') return -1;
    if (b.condition_type === 'Particular' && a.condition_type !== 'Particular') return 1;
    // Then sort by clause number
    return a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true });
  });

  // Add header
  const header = `=== COMPLETE CONTRACT ANALYSIS CONTEXT ===\nTotal Parsed Clauses: ${parsedClauses.length}\n`;
  contextParts.push(header);
  usedChars += header.length;

  // Search relevant contract sections for user query
  if (contractId && userQuery) {
    try {
      const readerService = getDocumentReaderService();
      // First try keyword & text search across chunks in Supabase
      const textChunks = await readerService.searchDocuments(contractId, userQuery, { limit: 25 });
      
      if (textChunks && textChunks.length > 0) {
        let chunkBlock = `\n=== MIVIDA GARDENS CONTRACT SECTIONS MATCHING QUERY ("${userQuery}") ===\n`;
        chunkBlock += `Found ${textChunks.length} relevant sections directly from the contract documents:\n\n`;

        for (const c of textChunks) {
          const clauseRef = c.clauseNumber ? `[Clause ${c.clauseNumber}: ${c.clauseTitle || ''}]` : '[Contract Section]';
          const pageRef = c.pageNumber ? ` (Page ${c.pageNumber})` : '';
          chunkBlock += `${clauseRef}${pageRef}\n${c.content}\n\n---\n\n`;
        }

        if (usedChars + chunkBlock.length <= maxChars) {
          contextParts.push(chunkBlock);
          usedChars += chunkBlock.length;
          hasDocuments = true;
          chunkCount += textChunks.length;
        }
      }
    } catch (e) {
      console.warn('Text search retrieval in context builder failed:', e);
    }
  }

  // 0. Add Document Landscape (The "Big Picture")
  if (contractId) {
    try {
      const readerService = getDocumentReaderService();
      const summary = await readerService.getContractSummary(contractId);
      if (summary.totalDocuments > 0) {
        let landscape = '\n=== DOCUMENT LANDSCAPE (OVERVIEW) ===\n';
        landscape += `The contract consists of ${summary.totalDocuments} primary documents across ${summary.totalChunks} sections.\n`;
        landscape += `Consult these categories for specific data:\n`;

        const categoryMap: Record<string, string> = {
          A: 'Agreement (Core variables, legal parties)',
          B: 'LOA (Acceptance terms, Contract Sum)',
          C: 'Conditions (GC/PC rights & obligations)',
          D: 'Addendums (Overrides/Amendments)',
          I: 'BOQ (Rates, Quantities, Pricing)',
          N: 'Schedules (Milestones, Drawings, Appendices)'
        };

        for (const doc of summary.documents) {
          landscape += `- [${doc.group}] ${doc.name} (${categoryMap[doc.group] || 'Other'})\n`;
        }
        landscape += '\n';

        if (usedChars + landscape.length <= maxChars) {
          contextParts.push(landscape);
          usedChars += landscape.length;
        }
      }
    } catch (e) {
      console.warn('Failed to build landscape:', e);
    }
  }

  // 1. Add parsed clauses with full text
  if (sortedClauses.length > 0) {
    contextParts.push('=== PARSED CONTRACT CLAUSES ===\n');
    usedChars += 30;

    for (const clause of sortedClauses) {
      // Build clause content
      let clauseContent = `\n[Clause ${clause.clause_number}: ${clause.clause_title}]\n`;
      clauseContent += `Type: ${clause.condition_type || 'General'}\n`;

      // Include full clause text
      const mainText = clause.clause_text || '';
      clauseContent += mainText + '\n';

      // Include PC override if different
      if (clause.particular_condition && clause.particular_condition !== mainText) {
        clauseContent += `\n[Particular Condition Override]:\n${clause.particular_condition}\n`;
      }

      // Include GC reference if available and different
      if (clause.general_condition && clause.general_condition !== mainText && clause.general_condition !== clause.particular_condition) {
        clauseContent += `\n[General Condition Reference]:\n${clause.general_condition}\n`;
      }

      // Add time frames if present
      if (clause.time_frames && clause.time_frames.length > 0) {
        clauseContent += `\nTime Frames:\n`;
        clause.time_frames.forEach(tf => {
          clauseContent += `  - ${tf.type}: ${tf.original_phrase} (${tf.applies_to})\n`;
        });
      }

      clauseContent += '\n---\n';

      // Check if we have space
      if (usedChars + clauseContent.length <= maxChars) {
        contextParts.push(clauseContent);
        usedChars += clauseContent.length;
      } else {
        // Add truncated notice
        contextParts.push(`\n[Note: ${sortedClauses.length - sortedClauses.indexOf(clause)} more clauses available but truncated due to context limits]\n`);
        break;
      }
    }
  }

  // 1.5. Add Contract Organizer Data (Fields and integrated summaries)
  if (contractId) {
    try {
      const readerService = getDocumentReaderService();
      const extractedData = await readerService.getContractExtractedData(contractId);

      if (extractedData.length > 0) {
        const organizerHeader = '\n=== CONTRACT ORGANIZER: PROJECT DATA ===\n';
        if (usedChars + organizerHeader.length <= maxChars) {
          contextParts.push(organizerHeader);
          usedChars += organizerHeader.length;

          for (const data of extractedData) {
            const value = data.value ? (typeof data.value === 'string' ? data.value : JSON.stringify(data.value)) : 'Not set';
            if (value && value !== 'Not set') {
              let fieldLine = `${data.field_key}: ${value}\n`;
              if (data.doc_name) fieldLine += `Source: ${data.doc_name}\n`;

              if (usedChars + fieldLine.length <= maxChars) {
                contextParts.push(fieldLine);
                usedChars += fieldLine.length;
              }
            }
          }
          contextParts.push('\n');
          usedChars += 1;
        }
      }
    } catch (error) {
      console.warn('Failed to add organizer data to context:', error);
    }
  }

  // 2. Try to add document chunks from service if available
  if (includeDocumentChunks && contractId) {
    try {
      const readerService = getDocumentReaderService();
      const summary = await readerService.getContractSummary(contractId);

      if (summary.totalChunks > 0) {
        hasDocuments = true;
        chunkCount = summary.totalChunks;

        // Add document summary header
        const docHeader = `\n=== UPLOADED DOCUMENTS ===\nTotal Documents: ${summary.totalDocuments}\nTotal Extracted Sections: ${summary.totalChunks}\n\n`;

        if (usedChars + docHeader.length <= maxChars) {
          contextParts.push(docHeader);
          usedChars += docHeader.length;

          // Get chunks organized by document group priority
          const groupPriority: Record<string, number> = {
            'C': 1, // Conditions of Contract - highest priority
            'D': 2, // Addendums
            'A': 3, // Agreement
            'B': 4, // LOA
            'I': 5, // BOQ
            'N': 6  // Schedules
          };

          const sortedDocs = [...summary.documents].sort((a, b) => {
            const priorityA = groupPriority[a.group] || 99;
            const priorityB = groupPriority[b.group] || 99;
            return priorityA - priorityB;
          });

          // Fetch and add document content by priority
          for (const doc of sortedDocs) {
            if (doc.status !== 'completed' || doc.chunkCount === 0) continue;

            const docContent = await readerService.getDocumentContent(doc.id);
            if (!docContent) continue;

            const groupLabel = {
              A: 'Agreement & Annexes',
              B: 'Letter of Acceptance',
              C: 'Conditions of Contract',
              D: 'Addendum',
              I: 'BOQ & Pricing',
              N: 'Schedule'
            }[doc.group] || doc.group;

            let docSection = `\n--- [${groupLabel}] ${doc.name} ---\n`;

            for (const chunk of docContent.chunks) {
              let chunkText = '';
              if (chunk.clauseNumber) {
                chunkText += `[Clause ${chunk.clauseNumber}${chunk.clauseTitle ? ': ' + chunk.clauseTitle : ''}]\n`;
              }
              chunkText += chunk.content + '\n\n';

              if (usedChars + docSection.length + chunkText.length <= maxChars) {
                docSection += chunkText;
              } else {
                docSection += `[... ${docContent.chunks.length - docContent.chunks.indexOf(chunk)} more sections truncated]\n`;
                break;
              }
            }

            if (usedChars + docSection.length <= maxChars) {
              contextParts.push(docSection);
              usedChars += docSection.length;
            } else {
              contextParts.push(`\n[Note: Additional documents available but truncated due to context limits]\n`);
              break;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch document chunks:', error);
    }
  }

  // 2.5. Add JSON Data Sources (Uploaded interactive data)
  if (contractId) {
    try {
      const jsonSources = await getJsonDataSources(contractId);
      if (jsonSources.length > 0) {
        const jsonContext = await buildJsonContext(jsonSources, maxChars - usedChars - 5000);
        if (jsonContext && usedChars + jsonContext.length <= maxChars) {
          contextParts.push(jsonContext);
          usedChars += jsonContext.length;
        }
      }
    } catch (error) {
      console.warn('Failed to add JSON data sources to context:', error);
    }
  }

  // 2.7. Add Neural RAG Content from Local Database (only when running locally)
  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocalDev && activeChatContextIds.length > 0) {
    const BACKEND = APP_CONFIG.BACKEND_URL;
    for (const id of activeChatContextIds) {
      try {
        const res = await fetch(`${BACKEND}/contracts/get/${id}`);
        if (res.ok) {
          const data = await res.json();
          const text = data.extracted_text || '';
          if (text) {
             const neuralSection = `\n=== NEURAL RAG CONTEXT: ${data.name} ===\n${text.slice(0, 50000)}\n[Full document in neural memory]\n`;
             if (usedChars + neuralSection.length <= maxChars) {
               contextParts.push(neuralSection);
               usedChars += neuralSection.length;
               hasDocuments = true;
             }
          }
        }
      } catch {
        // Local backend not reachable, silent
      }
    }
  }

  // 3. Add AI Knowledge Hub data (User-selected context)
  try {
    const activeKnowledgeContext = await localKnowledgeService.fetchBatchContent(activeChatContextIds);
    if (activeKnowledgeContext && usedChars + activeKnowledgeContext.length <= maxChars) {
      contextParts.push(activeKnowledgeContext);
      usedChars += activeKnowledgeContext.length;
    } else if (!activeKnowledgeContext && activeChatContextIds.length === 0) {
      const knowledgeSummary = await fetchKnowledgeContext();
      if (knowledgeSummary && usedChars + knowledgeSummary.length <= maxChars) {
        contextParts.push("\n=== AVAILABLE (BUT NOT SELECTED) KNOWLEDGE HUB DATA ===\n" + knowledgeSummary.slice(0, 1000));
      }
    }
  } catch (error) {
    console.warn('Failed to add knowledge base to context:', error);
  }

  return {
    context: contextParts.join(''),
    hasDocuments,
    clauseCount: parsedClauses.length,
    chunkCount
  };
}
