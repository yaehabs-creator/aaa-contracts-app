/**
 * Document Reader Service
 * Provides functionality to read document content from Supabase storage
 * and make it available to the AI bot for contract analysis
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ContractDocument, DocumentGroup, DocumentChunk } from '../../types';
import { extractTextFromPdf, isScannedPdf } from '../utils/pdfUtils';
import { getEmbeddingService } from '../services/embeddingService';
import { PaddleOcrService } from './paddleOcrService';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const STORAGE_BUCKET = 'contract-docs';

export interface DocumentContent {
  documentId: string;
  documentName: string;
  documentGroup: DocumentGroup;
  fileType: string;
  content: string;
  chunks: DocumentChunkContent[];
  metadata: {
    pageCount?: number;
    fileSize?: number;
    extractedAt?: string;
  };
}

export interface DocumentChunkContent {
  chunkId: string;
  chunkIndex: number;
  content: string;
  clauseNumber?: string;
  clauseTitle?: string;
  pageNumber?: number;
  contentType: string;
}

export interface ContractDocumentSummary {
  contractId: string;
  documents: Array<{
    id: string;
    name: string;
    group: DocumentGroup;
    fileType: string;
    status: string;
    chunkCount: number;
  }>;
  totalChunks: number;
  totalDocuments: number;
}

export class DocumentReaderService {
  private supabase: SupabaseClient;

  constructor() {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key are required');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get all documents for a contract
   */
  async getContractDocuments(contractId: string): Promise<ContractDocument[]> {
    const { data, error } = await this.supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', contractId)
      .order('document_group')
      .order('sequence_number');

    if (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get document chunks (the extracted/processed content)
   */
  async getDocumentChunks(documentId: string): Promise<DocumentChunkContent[]> {
    const { data, error } = await this.supabase
      .from('contract_document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index');

    if (error) {
      console.error('Error fetching chunks:', error);
      throw error;
    }

    return (data || []).map(chunk => ({
      chunkId: chunk.id,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
      clauseNumber: chunk.clause_number,
      clauseTitle: chunk.clause_title,
      pageNumber: chunk.page_number,
      contentType: chunk.content_type || 'text'
    }));
  }

  /**
   * Get all chunks for a contract
   */
  async getContractChunks(contractId: string): Promise<DocumentChunkContent[]> {
    const { data, error } = await this.supabase
      .from('contract_document_chunks')
      .select(`
        *,
        document:contract_documents(name, document_group)
      `)
      .eq('contract_id', contractId)
      .order('created_at');

    if (error) {
      console.error('Error fetching contract chunks:', error);
      throw error;
    }

    return (data || []).map(chunk => ({
      chunkId: chunk.id,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
      clauseNumber: chunk.clause_number,
      clauseTitle: chunk.clause_title,
      pageNumber: chunk.page_number,
      contentType: chunk.content_type || 'text'
    }));
  }

  /**
   * Get all extracted data from the organizer for a contract
   */
  async getContractExtractedData(contractId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('contract_extracted_data')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at');

    if (error) {
      console.error('Error fetching extracted data:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get full document content (all chunks combined)
   */
  async getDocumentContent(documentId: string): Promise<DocumentContent | null> {
    // Get document metadata
    const { data: doc, error: docError } = await this.supabase
      .from('contract_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      console.error('Error fetching document:', docError);
      return null;
    }

    // Get chunks
    const chunks = await this.getDocumentChunks(documentId);

    // Combine chunk content
    const fullContent = chunks.map(c => c.content).join('\n\n');

    return {
      documentId: doc.id,
      documentName: doc.name,
      documentGroup: doc.document_group,
      fileType: doc.file_type,
      content: fullContent,
      chunks,
      metadata: {
        pageCount: doc.page_count,
        fileSize: doc.file_size_bytes,
        extractedAt: doc.processed_at
      }
    };
  }

  /**
   * Get contract document summary for AI context
   */
  async getContractSummary(contractId: string): Promise<ContractDocumentSummary> {
    // Get documents with chunk counts
    const { data: documents, error: docError } = await this.supabase
      .from('contract_documents')
      .select(`
        id,
        name,
        document_group,
        file_type,
        status
      `)
      .eq('contract_id', contractId)
      .order('document_group')
      .order('sequence_number');

    if (docError) {
      console.error('Error fetching documents:', docError);
      throw docError;
    }

    // Get chunk counts per document
    const { data: chunkCounts, error: chunkError } = await this.supabase
      .from('contract_document_chunks')
      .select('document_id')
      .eq('contract_id', contractId);

    if (chunkError) {
      console.error('Error fetching chunk counts:', chunkError);
    }

    // Count chunks per document
    const chunkCountMap = new Map<string, number>();
    for (const chunk of chunkCounts || []) {
      const count = chunkCountMap.get(chunk.document_id) || 0;
      chunkCountMap.set(chunk.document_id, count + 1);
    }

    const docsWithCounts = (documents || []).map(doc => ({
      id: doc.id,
      name: doc.name,
      group: doc.document_group as DocumentGroup,
      fileType: doc.file_type,
      status: doc.status,
      chunkCount: chunkCountMap.get(doc.id) || 0
    }));

    return {
      contractId,
      documents: docsWithCounts,
      totalDocuments: docsWithCounts.length,
      totalChunks: Array.from(chunkCountMap.values()).reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Search document content by query (simple text search)
   */
  async searchDocuments(
    contractId: string,
    query: string,
    options: { limit?: number; documentGroups?: DocumentGroup[] } = {}
  ): Promise<DocumentChunkContent[]> {
    const { limit = 20, documentGroups } = options;

    let queryBuilder = this.supabase
      .from('contract_document_chunks')
      .select(`
        *,
        document:contract_documents(name, document_group)
      `)
      .eq('contract_id', contractId)
      .ilike('content', `%${query}%`)
      .limit(limit);

    if (documentGroups && documentGroups.length > 0) {
      // Filter by document group through the join
      const { data: docIds } = await this.supabase
        .from('contract_documents')
        .select('id')
        .eq('contract_id', contractId)
        .in('document_group', documentGroups);

      if (docIds && docIds.length > 0) {
        queryBuilder = queryBuilder.in('document_id', docIds.map(d => d.id));
      }
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error searching documents:', error);
      throw error;
    }

    return (data || []).map(chunk => ({
      chunkId: chunk.id,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
      clauseNumber: chunk.clause_number,
      clauseTitle: chunk.clause_title,
      pageNumber: chunk.page_number,
      contentType: chunk.content_type || 'text'
    }));
  }

  /**
   * Get document content by clause number
   */
  async getClauseContent(contractId: string, clauseNumber: string): Promise<DocumentChunkContent[]> {
    const { data, error } = await this.supabase
      .from('contract_document_chunks')
      .select(`
        *,
        document:contract_documents(name, document_group)
      `)
      .eq('contract_id', contractId)
      .eq('clause_number', clauseNumber);

    if (error) {
      console.error('Error fetching clause:', error);
      throw error;
    }

    return (data || []).map(chunk => ({
      chunkId: chunk.id,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
      clauseNumber: chunk.clause_number,
      clauseTitle: chunk.clause_title,
      pageNumber: chunk.page_number,
      contentType: chunk.content_type || 'text'
    }));
  }

  /**
   * Get signed URL for direct document access
   */
  async getDocumentUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error getting document URL:', error);
      return null;
    }

    return data.signedUrl;
  }

  /**
   * Format document content for AI context
   * Creates a structured text representation of documents
   */
  async formatForAIContext(
    contractId: string,
    options: {
      maxTokens?: number;
      includeGroups?: DocumentGroup[];
      focusClause?: string;
    } = {}
  ): Promise<string> {
    const { maxTokens = 50000, includeGroups, focusClause } = options;

    let contextParts: string[] = [];
    let estimatedTokens = 0;

    // Get contract summary
    const summary = await this.getContractSummary(contractId);

    // Header
    contextParts.push(`=== CONTRACT DOCUMENTS CONTEXT ===`);
    contextParts.push(`Total Documents: ${summary.totalDocuments}`);
    contextParts.push(`Total Extracted Chunks: ${summary.totalChunks}`);
    contextParts.push('');

    // 1. Organizer Extracted Data (Highest priority for specific project info)
    const extractedData = await this.getContractExtractedData(contractId);
    if (extractedData.length > 0) {
      contextParts.push(`=== CONTRACT ORGANIZER: KEY PROJECT INFORMATION ===`);
      contextParts.push(`The following specific fields were extracted or manually set in the project organizer:`);

      for (const data of extractedData) {
        const value = data.value ? (typeof data.value === 'string' ? data.value : JSON.stringify(data.value)) : 'Not set';
        if (value && value !== 'Not set') {
          contextParts.push(`- ${data.field_key}: ${value}`);
          if (data.doc_name) {
            contextParts.push(`  (Source: ${data.doc_name})`);
          }
        }
      }
      contextParts.push('');
    }

    // 2. Document list
    contextParts.push('Available Uploaded Documents:');
    for (const doc of summary.documents) {
      const groupLabel = {
        A: 'Agreement',
        B: 'LOA',
        C: 'Conditions',
        D: 'Addendum',
        I: 'BOQ',
        N: 'Schedule'
      }[doc.group] || doc.group;

      contextParts.push(`- [${groupLabel}] ${doc.name} (${doc.chunkCount} chunks, ${doc.status})`);
    }
    contextParts.push('');

    // If focusing on a specific clause, prioritize it
    if (focusClause) {
      const clauseChunks = await this.getClauseContent(contractId, focusClause);
      if (clauseChunks.length > 0) {
        contextParts.push(`=== FOCUSED CLAUSE: ${focusClause} ===`);
        for (const chunk of clauseChunks) {
          contextParts.push(`[${chunk.clauseTitle || 'Clause ' + chunk.clauseNumber}]`);
          contextParts.push(chunk.content);
          contextParts.push('');
        }
      }
    }

    // Get chunks for included groups
    const docsToInclude = summary.documents.filter(d =>
      !includeGroups || includeGroups.includes(d.group)
    );

    // Estimate tokens per character (rough: 1 token ≈ 4 chars)
    const currentText = contextParts.join('\n');
    estimatedTokens = Math.ceil(currentText.length / 4);

    // Add document content up to token limit
    for (const doc of docsToInclude) {
      if (estimatedTokens >= maxTokens) break;

      const content = await this.getDocumentContent(doc.id);
      if (!content || !content.chunks.length) continue;

      const docHeader = `\n=== ${doc.name.toUpperCase()} (${doc.group}) ===\n`;
      const docContent = content.chunks
        .map(c => {
          if (c.clauseNumber) {
            return `[Clause ${c.clauseNumber}${c.clauseTitle ? ': ' + c.clauseTitle : ''}]\n${c.content}`;
          }
          return c.content;
        })
        .join('\n\n');

      const newTokens = Math.ceil((docHeader + docContent).length / 4);

      if (estimatedTokens + newTokens <= maxTokens) {
        contextParts.push(docHeader);
        contextParts.push(docContent);
        estimatedTokens += newTokens;
      }
    }

    return contextParts.join('\n');
  }

  /**
   * Merge document chunks with parsed clauses
   * Enhances parsed clauses with additional content from uploaded documents
   */
  async mergeWithParsedClauses(
    contractId: string,
    parsedClauses: Array<{
      clause_number: string;
      clause_title: string;
      clause_text: string;
      condition_type?: string;
      particular_condition?: string;
      general_condition?: string;
    }>
  ): Promise<Array<{
    clauseNumber: string;
    clauseTitle: string;
    parsedContent: string;
    documentContent: string | null;
    hasDocumentVersion: boolean;
    conditionType: string;
    sources: string[];
  }>> {
    const result: Array<{
      clauseNumber: string;
      clauseTitle: string;
      parsedContent: string;
      documentContent: string | null;
      hasDocumentVersion: boolean;
      conditionType: string;
      sources: string[];
    }> = [];

    // Get all document chunks for this contract
    const allChunks = await this.getContractChunks(contractId);

    // Create a map of chunks by clause number
    const chunksByClause = new Map<string, DocumentChunkContent[]>();
    for (const chunk of allChunks) {
      if (chunk.clauseNumber) {
        const existing = chunksByClause.get(chunk.clauseNumber) || [];
        existing.push(chunk);
        chunksByClause.set(chunk.clauseNumber, existing);
      }
    }

    // Merge with parsed clauses
    for (const clause of parsedClauses) {
      const documentChunks = chunksByClause.get(clause.clause_number) || [];

      // Combine document chunk content
      const documentContent = documentChunks.length > 0
        ? documentChunks.map(c => c.content).join('\n\n')
        : null;

      // Track sources
      const sources: string[] = ['parsed'];
      if (documentChunks.length > 0) {
        sources.push('documents');
      }

      result.push({
        clauseNumber: clause.clause_number,
        clauseTitle: clause.clause_title,
        parsedContent: clause.clause_text,
        documentContent,
        hasDocumentVersion: documentChunks.length > 0,
        conditionType: clause.condition_type || 'General',
        sources
      });
    }

    // Add any document-only clauses (not in parsed data)
    const parsedClauseNumbers = new Set(parsedClauses.map(c => c.clause_number));
    for (const [clauseNumber, chunks] of chunksByClause) {
      if (!parsedClauseNumbers.has(clauseNumber)) {
        const firstChunk = chunks[0];
        result.push({
          clauseNumber,
          clauseTitle: firstChunk.clauseTitle || `Clause ${clauseNumber}`,
          parsedContent: '',
          documentContent: chunks.map(c => c.content).join('\n\n'),
          hasDocumentVersion: true,
          conditionType: 'Document',
          sources: ['documents']
        });
      }
    }

    // Sort by clause number
    result.sort((a, b) =>
      a.clauseNumber.localeCompare(b.clauseNumber, undefined, { numeric: true })
    );

    return result;
  }

  /**
   * Get complete contract content with both parsed and document data
   * Returns a comprehensive view combining all sources
   */
  async getCompleteContractContent(
    contractId: string,
    parsedClauses: Array<{
      clause_number: string;
      clause_title: string;
      clause_text: string;
      condition_type?: string;
      particular_condition?: string;
      general_condition?: string;
    }>
  ): Promise<{
    summary: {
      parsedClauseCount: number;
      documentChunkCount: number;
      documentCount: number;
      hasDocuments: boolean;
    };
    content: string;
  }> {
    const contractSummary = await this.getContractSummary(contractId);
    const mergedClauses = await this.mergeWithParsedClauses(contractId, parsedClauses);

    let content = `=== COMPLETE CONTRACT CONTENT ===\n\n`;
    content += `Parsed Clauses: ${parsedClauses.length}\n`;
    content += `Documents: ${contractSummary.totalDocuments}\n`;
    content += `Document Sections: ${contractSummary.totalChunks}\n\n`;

    // Add merged clause content
    for (const clause of mergedClauses) {
      content += `--- Clause ${clause.clauseNumber}: ${clause.clauseTitle} ---\n`;
      content += `[Type: ${clause.conditionType}] [Sources: ${clause.sources.join(', ')}]\n\n`;

      if (clause.parsedContent) {
        content += clause.parsedContent + '\n\n';
      }

      if (clause.documentContent && clause.documentContent !== clause.parsedContent) {
        content += `[From uploaded documents]:\n${clause.documentContent}\n\n`;
      }
    }

    return {
      summary: {
        parsedClauseCount: parsedClauses.length,
        documentChunkCount: contractSummary.totalChunks,
        documentCount: contractSummary.totalDocuments,
        hasDocuments: contractSummary.totalDocuments > 0
      },
      content
    };
  }
  /**
   * Process all pending or failed documents for a contract
   */
  async batchProcessAll(
    contractId: string,
    options: { forceOcr?: boolean; reprocessAll?: boolean } = {}
  ): Promise<{ processed: number; failed: number }> {
    const documents = await this.getContractDocuments(contractId);

    // Determine which documents to target
    const targetStatus = options.reprocessAll
      ? ['pending', 'processing', 'completed', 'error']
      : ['pending', 'error'];

    const pendingDocs = documents.filter(d => targetStatus.includes(d.status));

    if (pendingDocs.length === 0) {
      this.emitProgress('No pending documents to process');
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;
    const embeddingService = getEmbeddingService();

    for (const doc of pendingDocs) {
      this.emitProgress(`Processing ${processed + 1}/${pendingDocs.length}: ${doc.name}`);

      try {
        // 1. Get signed URL
        const { data: urlData, error: urlError } = await this.supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(doc.file_path, 3600);

        if (urlError || !urlData) throw new Error('Failed to get document URL');

        // 2. Update status to processing
        await this.supabase
          .from('contract_documents')
          .update({ status: 'processing' })
          .eq('id', doc.id);

        let extractedText = '';

        // 3. Extract text
        if (doc.file_type === 'pdf') {
          let useOcr = options.forceOcr;

          if (!useOcr) {
            this.emitProgress(`Analyzing PDF type: ${doc.name}`);
            useOcr = await isScannedPdf(urlData.signedUrl);
          }

          if (useOcr) {
            this.emitProgress(`${options.forceOcr ? 'Forcing Full OCR' : 'Scanned PDF detected'}. Starting OCR for ${doc.name}...`);
            const response = await fetch(urlData.signedUrl);
            const arrayBuffer = await response.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            const ocrPages = await PaddleOcrService.processBase64Pdf(base64, doc.original_filename || doc.name);
            extractedText = ocrPages.join('\n\n');
          } else {
            this.emitProgress(`Searchable PDF detected. Extracting text: ${doc.name}`);
            extractedText = await extractTextFromPdf(urlData.signedUrl);
          }
        } else {
          // For other files, try to read as text (simplified)
          const response = await fetch(urlData.signedUrl);
          extractedText = await response.text();
        }

        if (!extractedText || extractedText.length < 50) {
          throw new Error('Extraction produced insufficient text.');
        }

        // 4. Parse into chunks
        const chunks = this.parseTextToChunks(extractedText, doc.document_group as DocumentGroup);

        // 5. Generate embeddings
        let embeddings: number[][] = [];
        this.emitProgress(`Generating AI embeddings for ${doc.name}...`);

        const inputs = chunks.map(c =>
          `Document: ${doc.name}\nTitle: ${c.clauseTitle || 'N/A'}\nContent: ${c.content}`
        );

        // Process in batches of 10
        const BATCH_SIZE = 10;
        for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
          const batch = inputs.slice(i, i + BATCH_SIZE);
          const batchEmbeddings = await embeddingService.generateEmbeddings(batch);
          embeddings.push(...batchEmbeddings);
        }

        // 6. Save chunks
        await this.supabase
          .from('contract_document_chunks')
          .delete()
          .eq('document_id', doc.id);

        if (chunks.length > 0) {
          const { error: insertError } = await this.supabase
            .from('contract_document_chunks')
            .insert(chunks.map((chunk, idx) => ({
              document_id: doc.id,
              contract_id: contractId,
              chunk_index: idx,
              content: chunk.content,
              clause_number: chunk.clauseNumber,
              clause_title: chunk.clauseTitle,
              content_type: 'text',
              token_count: Math.ceil(chunk.content.length / 4),
              embedding: embeddings[idx] || null
            })));

          if (insertError) throw insertError;
        }

        // 7. Success
        await this.supabase
          .from('contract_documents')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            processing_metadata: {
              chunks_created: chunks.length,
              text_length: extractedText.length,
              has_embeddings: embeddings.length > 0
            }
          })
          .eq('id', doc.id);

        processed++;
      } catch (err: any) {
        console.error(`Error processing ${doc.name}:`, err);
        failed++;
        await this.supabase
          .from('contract_documents')
          .update({
            status: 'error',
            processing_error: err.message
          })
          .eq('id', doc.id);
      }
    }

    this.emitProgress(`✅ Sync Complete: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  }

  /**
   * Helper to parse text into chunks
   */
  private parseTextToChunks(text: string, documentGroup: DocumentGroup): Array<{
    content: string;
    clauseNumber: string | null;
    clauseTitle: string | null;
  }> {
    const chunks: Array<{ content: string; clauseNumber: string | null; clauseTitle: string | null }> = [];
    const clausePattern = /(?:^|\n)\s*(?:Clause\s+)?(\d+(?:\.\d+)*(?:[A-Za-z])?)\s*[:\.\-–—]?\s*([A-Z][^\n.]*)?/gm;

    const matches: Array<{ index: number; clauseNumber: string; clauseTitle: string | null }> = [];
    let match;

    while ((match = clausePattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        clauseNumber: match[1],
        clauseTitle: match[2]?.trim() || null
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const content = text.substring(current.index, next ? next.index : text.length).trim();

      if (content.length > 20) {
        chunks.push({
          content,
          clauseNumber: current.clauseNumber,
          clauseTitle: current.clauseTitle
        });
      }
    }

    if (chunks.length === 0 && text.length > 0) {
      chunks.push({ content: text, clauseNumber: null, clauseTitle: null });
    }

    return chunks;
  }

  /**
   * Search documents using vector similarity
   */
  async searchSimilarChunks(
    contractId: string,
    queryEmbedding: number[],
    options: { limit?: number; threshold?: number } = {}
  ): Promise<DocumentChunkContent[]> {
    const { limit = 10, threshold = 0.5 } = options;

    const { data, error } = await this.supabase
      .rpc('search_contract_chunks', {
        p_contract_id: contractId,
        p_query_embedding: queryEmbedding,
        p_limit: limit,
        p_threshold: threshold
      });

    if (error) {
      console.error('Error in vector search:', error);
      throw error;
    }

    return (data || []).map((chunk: any) => ({
      chunkId: chunk.chunk_id,
      chunkIndex: 0,
      content: chunk.content,
      clauseNumber: chunk.clause_number,
      clauseTitle: chunk.document_name,
      pageNumber: 0,
      contentType: 'text',
      score: chunk.similarity
    }));
  }

  /**
   * Listen for processing progress updates
   */
  private progressListeners: Array<(status: string) => void> = [];

  onProgress(listener: (status: string) => void) {
    this.progressListeners.push(listener);
    return () => {
      this.progressListeners = this.progressListeners.filter(l => l !== listener);
    };
  }

  private emitProgress(status: string) {
    this.progressListeners.forEach(l => l(status));
  }
}

// Singleton instance
let readerService: DocumentReaderService | null = null;

export function getDocumentReaderService(): DocumentReaderService {
  if (!readerService) {
    readerService = new DocumentReaderService();
  }
  return readerService;
}

export default DocumentReaderService;
