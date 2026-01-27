/**
 * Document Processing Service
 * Extracts text from uploaded documents and saves as JSON chunks for AI access
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DocumentGroup, ContractDocument, DocumentChunk } from '../types';

const STORAGE_BUCKET = 'contract-docs';

export interface ProcessingResult {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  textLength: number;
  error?: string;
}

export interface ChunkData {
  chunk_index: number;
  content: string;
  clause_number: string | null;
  clause_title: string | null;
  content_type: string;
  token_count: number;
  page_number?: number;
}

export class DocumentProcessingService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '';
    const key = supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (!url || !key) {
      throw new Error('Supabase URL and key are required');
    }

    this.supabase = createClient(url, key);
  }

  /**
   * Extract text from PDF using pdf.js (browser-compatible)
   * This is a simplified version - for production, use pdf.js library
   */
  async extractTextFromPDF(pdfUrl: string): Promise<string> {
    try {
      // Try to use pdf.js if available
      // @ts-ignore
      if (typeof window !== 'undefined' && window.pdfjsLib) {
        // @ts-ignore
        const pdf = await window.pdfjsLib.getDocument(pdfUrl).promise;
        const textParts: string[] = [];
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          textParts.push(pageText);
        }
        
        return textParts.join('\n\n');
      }
      
      // Fallback: fetch and try basic extraction
      const response = await fetch(pdfUrl);
      const buffer = await response.arrayBuffer();
      return this.basicPDFExtraction(new Uint8Array(buffer));
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Basic PDF text extraction (fallback method)
   */
  private basicPDFExtraction(data: Uint8Array): string {
    const decoder = new TextDecoder('latin1');
    const content = decoder.decode(data);
    const textParts: string[] = [];
    
    // Find text between BT and ET markers
    const regex = /BT\s*([\s\S]*?)\s*ET/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const block = match[1];
      
      // Extract Tj strings
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        textParts.push(this.decodePDFText(tjMatch[1]));
      }
    }
    
    let text = textParts.join(' ');
    text = text.replace(/\s+/g, ' ').trim();
    
    return text || '';
  }

  /**
   * Decode PDF text encoding
   */
  private decodePDFText(text: string): string {
    return text
      .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')');
  }

  /**
   * Parse text into chunks with clause detection
   */
  parseTextToChunks(text: string, documentGroup: DocumentGroup): ChunkData[] {
    const chunks: ChunkData[] = [];
    
    // Pattern to detect clause numbers
    const clausePattern = /(?:^|\n)\s*(?:Clause\s+)?(\d+(?:\.\d+)*(?:[A-Za-z])?)\s*[:\.\-–—]?\s*([A-Z][^\n.]*)?/gm;
    
    const matches: Array<{
      index: number;
      clauseNumber: string;
      clauseTitle: string | null;
    }> = [];
    
    let match;
    while ((match = clausePattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        clauseNumber: match[1],
        clauseTitle: match[2]?.trim() || null
      });
    }
    
    // Create chunks from matches
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      
      const startIndex = current.index;
      const endIndex = next ? next.index : text.length;
      const content = text.substring(startIndex, endIndex).trim();
      
      if (content.length > 20) {
        chunks.push({
          chunk_index: chunks.length,
          content: content,
          clause_number: current.clauseNumber,
          clause_title: current.clauseTitle,
          content_type: 'text',
          token_count: Math.ceil(content.length / 4)
        });
      }
    }
    
    // If no clauses detected, split by paragraphs or create single chunk
    if (chunks.length === 0 && text.length > 0) {
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
      
      if (paragraphs.length > 1) {
        paragraphs.forEach((para, i) => {
          chunks.push({
            chunk_index: i,
            content: para.trim(),
            clause_number: null,
            clause_title: null,
            content_type: 'text',
            token_count: Math.ceil(para.length / 4)
          });
        });
      } else {
        // Single chunk for entire document
        chunks.push({
          chunk_index: 0,
          content: text,
          clause_number: null,
          clause_title: null,
          content_type: 'text',
          token_count: Math.ceil(text.length / 4)
        });
      }
    }
    
    return chunks;
  }

  /**
   * Process a single document - extract text and save chunks
   */
  async processDocument(documentId: string): Promise<ProcessingResult> {
    // Get document info
    const { data: doc, error: docError } = await this.supabase
      .from('contract_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      return {
        success: false,
        documentId,
        chunksCreated: 0,
        textLength: 0,
        error: 'Document not found'
      };
    }

    try {
      // Update status to processing
      await this.supabase
        .from('contract_documents')
        .update({ status: 'processing' })
        .eq('id', documentId);

      // Get signed URL
      const { data: urlData, error: urlError } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(doc.file_path, 3600);

      if (urlError || !urlData) {
        throw new Error('Failed to get document URL');
      }

      // Extract text based on file type
      let extractedText = '';
      
      if (doc.file_type === 'pdf') {
        extractedText = await this.extractTextFromPDF(urlData.signedUrl);
      } else {
        // For other files, try to fetch as text
        const response = await fetch(urlData.signedUrl);
        extractedText = await response.text();
      }

      if (!extractedText || extractedText.length < 10) {
        throw new Error('No text could be extracted from document');
      }

      // Parse into chunks
      const chunks = this.parseTextToChunks(extractedText, doc.document_group as DocumentGroup);

      // Delete existing chunks
      await this.supabase
        .from('contract_document_chunks')
        .delete()
        .eq('document_id', documentId);

      // Insert new chunks
      const chunksToInsert = chunks.map(chunk => ({
        document_id: documentId,
        contract_id: doc.contract_id,
        ...chunk
      }));

      if (chunksToInsert.length > 0) {
        const { error: insertError } = await this.supabase
          .from('contract_document_chunks')
          .insert(chunksToInsert);

        if (insertError) {
          throw new Error(`Failed to save chunks: ${insertError.message}`);
        }
      }

      // Update document status
      await this.supabase
        .from('contract_documents')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          processing_metadata: {
            chunks_created: chunks.length,
            text_length: extractedText.length,
            processed_at: new Date().toISOString()
          }
        })
        .eq('id', documentId);

      return {
        success: true,
        documentId,
        chunksCreated: chunks.length,
        textLength: extractedText.length
      };

    } catch (error: any) {
      // Update status to error
      await this.supabase
        .from('contract_documents')
        .update({
          status: 'error',
          processing_error: error.message
        })
        .eq('id', documentId);

      return {
        success: false,
        documentId,
        chunksCreated: 0,
        textLength: 0,
        error: error.message
      };
    }
  }

  /**
   * Process all pending documents for a contract
   */
  async processAllDocuments(contractId: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: ProcessingResult[];
  }> {
    // Get all pending documents
    const { data: documents, error } = await this.supabase
      .from('contract_documents')
      .select('id')
      .eq('contract_id', contractId)
      .in('status', ['pending', 'error']);

    if (error || !documents) {
      return { total: 0, successful: 0, failed: 0, results: [] };
    }

    const results: ProcessingResult[] = [];
    
    for (const doc of documents) {
      const result = await this.processDocument(doc.id);
      results.push(result);
    }

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Export all document data as JSON
   */
  async exportAsJSON(contractId: string): Promise<object> {
    // Get documents
    const { data: documents } = await this.supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', contractId)
      .order('document_group')
      .order('sequence_number');

    // Get chunks
    const { data: chunks } = await this.supabase
      .from('contract_document_chunks')
      .select('*')
      .eq('contract_id', contractId)
      .order('chunk_index');

    const groupLabels: Record<string, string> = {
      A: 'Form of Agreement & Annexes',
      B: 'Signed Letter of Acceptance',
      C: 'Conditions of Contract',
      D: 'Addendums',
      I: 'Priced BOQ',
      N: 'Schedules & Appendices'
    };

    return {
      exportDate: new Date().toISOString(),
      contractId,
      summary: {
        totalDocuments: documents?.length || 0,
        totalChunks: chunks?.length || 0
      },
      documents: (documents || []).map(doc => {
        const docChunks = (chunks || []).filter(c => c.document_id === doc.id);
        return {
          id: doc.id,
          name: doc.name,
          group: doc.document_group,
          groupLabel: groupLabels[doc.document_group] || doc.document_group,
          fileType: doc.file_type,
          status: doc.status,
          clauses: docChunks.map(c => ({
            clauseNumber: c.clause_number,
            clauseTitle: c.clause_title,
            content: c.content
          }))
        };
      })
    };
  }

  /**
   * Save extracted text directly (for manual text input)
   */
  async saveExtractedText(
    documentId: string,
    text: string,
    documentGroup: DocumentGroup
  ): Promise<ProcessingResult> {
    const { data: doc } = await this.supabase
      .from('contract_documents')
      .select('contract_id')
      .eq('id', documentId)
      .single();

    if (!doc) {
      return {
        success: false,
        documentId,
        chunksCreated: 0,
        textLength: 0,
        error: 'Document not found'
      };
    }

    // Parse text into chunks
    const chunks = this.parseTextToChunks(text, documentGroup);

    // Delete existing chunks
    await this.supabase
      .from('contract_document_chunks')
      .delete()
      .eq('document_id', documentId);

    // Insert new chunks
    const chunksToInsert = chunks.map(chunk => ({
      document_id: documentId,
      contract_id: doc.contract_id,
      ...chunk
    }));

    if (chunksToInsert.length > 0) {
      const { error: insertError } = await this.supabase
        .from('contract_document_chunks')
        .insert(chunksToInsert);

      if (insertError) {
        return {
          success: false,
          documentId,
          chunksCreated: 0,
          textLength: 0,
          error: insertError.message
        };
      }
    }

    // Update document status
    await this.supabase
      .from('contract_documents')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', documentId);

    return {
      success: true,
      documentId,
      chunksCreated: chunks.length,
      textLength: text.length
    };
  }
}

// Singleton instance
let processingService: DocumentProcessingService | null = null;

export function getDocumentProcessingService(): DocumentProcessingService {
  if (!processingService) {
    processingService = new DocumentProcessingService();
  }
  return processingService;
}

export default DocumentProcessingService;
