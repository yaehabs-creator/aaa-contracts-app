/**
 * Document Reader Service
 * Provides functionality to read document content from Supabase storage
 * and make it available to the AI bot for contract analysis
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ContractDocument, DocumentGroup, DocumentChunk } from '../../types';

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

    // Document list
    contextParts.push('Available Documents:');
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
