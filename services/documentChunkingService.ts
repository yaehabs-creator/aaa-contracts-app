/**
 * Document Chunking Service
 * Smart chunking for PDFs (clause detection), Excel (table extraction), and annexes
 * Handles clause-level splitting while preserving document structure
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DocumentChunk,
  ChunkContentType,
  ContractDocument,
  DocumentGroup
} from '../types';

// Token estimation (rough: 1 token ≈ 4 characters)
const CHARS_PER_TOKEN = 4;

// Chunking configuration
const CHUNK_CONFIG = {
  maxTokens: 2000,
  overlapTokens: 100,
  minChunkTokens: 50
};

// Regex patterns for clause detection
const CLAUSE_PATTERNS = {
  // Main clause pattern: Clause 1.1, Sub-Clause 2.3, Article 5
  mainClause: /^(?:Clause|Sub-Clause|Article|Section)\s*(\d+[A-Za-z]?(?:\.\d+)*)/gmi,
  // FIDIC-style: 1.1, 2.3.4, 22A.1
  numberedClause: /^(\d+[A-Za-z]?(?:\.\d+)*)\s+([A-Z][A-Za-z\s]+)/gm,
  // Alphanumeric clauses: 2A.1, 6B.3
  alphanumericClause: /^(\d+[A-Z]\.\d+)/gm,
  // Sub-clause references: (a), (b), (i), (ii)
  subClause: /^\s*\(([a-z]|[ivx]+)\)/gm,
  // Appendix/Annex: Appendix A, Annex 1
  appendix: /^(?:Appendix|Annex|Schedule)\s*([A-Z0-9]+)/gmi
};

export interface ChunkingOptions {
  preserveSubClauses?: boolean;
  detectTables?: boolean;
  detectHeadings?: boolean;
  maxTokens?: number;
  overlapTokens?: number;
}

export interface ParsedClause {
  clauseNumber: string;
  clauseTitle?: string;
  content: string;
  startIndex: number;
  endIndex: number;
  subClauses?: ParsedClause[];
}

export interface TableData {
  headers: string[];
  rows: string[][];
  sheetName?: string;
  rowRange?: { start: number; end: number };
  metadata?: Record<string, any>;
}

export interface ChunkingResult {
  chunks: DocumentChunk[];
  metadata: {
    totalChunks: number;
    totalTokens: number;
    clauseCount: number;
    tableCount: number;
    processingTime: number;
  };
}

export class DocumentChunkingService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL and key are required');
    }

    this.supabase = createClient(url, key);
  }

  /**
   * Estimate token count from text
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Generate content hash for deduplication
   */
  generateContentHash(content: string): string {
    // Simple hash function for deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Detect and parse clauses from text
   */
  parseClausesFromText(text: string): ParsedClause[] {
    const clauses: ParsedClause[] = [];
    const lines = text.split('\n');
    let currentClause: ParsedClause | null = null;
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for clause boundary
      const clauseMatch = this.detectClauseBoundary(trimmedLine);

      if (clauseMatch) {
        // Save previous clause
        if (currentClause) {
          currentClause.content = currentContent.join('\n').trim();
          currentClause.endIndex = i - 1;
          if (currentClause.content) {
            clauses.push(currentClause);
          }
        }

        // Start new clause
        currentClause = {
          clauseNumber: clauseMatch.number,
          clauseTitle: clauseMatch.title,
          content: '',
          startIndex: i,
          endIndex: i
        };
        currentContent = [trimmedLine];
      } else if (currentClause) {
        currentContent.push(line);
      } else {
        // Content before first clause - treat as preamble
        if (trimmedLine && clauses.length === 0) {
          clauses.push({
            clauseNumber: '0',
            clauseTitle: 'Preamble',
            content: trimmedLine,
            startIndex: i,
            endIndex: i
          });
        }
      }
    }

    // Save last clause
    if (currentClause) {
      currentClause.content = currentContent.join('\n').trim();
      currentClause.endIndex = lines.length - 1;
      if (currentClause.content) {
        clauses.push(currentClause);
      }
    }

    return clauses;
  }

  /**
   * Detect clause boundary from a line
   */
  private detectClauseBoundary(line: string): { number: string; title?: string } | null {
    // Try main clause pattern first
    const mainMatch = line.match(/^(?:Clause|Sub-Clause|Article|Section)\s*(\d+[A-Za-z]?(?:\.\d+)*)\s*[:\-–]?\s*(.*)?$/i);
    if (mainMatch) {
      return {
        number: mainMatch[1],
        title: mainMatch[2]?.trim() || undefined
      };
    }

    // Try numbered clause pattern (e.g., "1.1 Definitions")
    const numberedMatch = line.match(/^(\d+[A-Za-z]?(?:\.\d+)*)\s+([A-Z][A-Za-z\s,]+)$/);
    if (numberedMatch) {
      return {
        number: numberedMatch[1],
        title: numberedMatch[2].trim()
      };
    }

    // Try alphanumeric pattern (e.g., "2A.1 ...")
    const alphaMatch = line.match(/^(\d+[A-Z]\.\d+(?:\.\d+)*)\s+(.*)?$/);
    if (alphaMatch) {
      return {
        number: alphaMatch[1],
        title: alphaMatch[2]?.trim() || undefined
      };
    }

    return null;
  }

  /**
   * Split large clause into smaller chunks with overlap
   */
  splitLargeClause(clause: ParsedClause, maxTokens: number, overlapTokens: number): ParsedClause[] {
    const tokens = this.estimateTokens(clause.content);
    
    if (tokens <= maxTokens) {
      return [clause];
    }

    const chunks: ParsedClause[] = [];
    const sentences = clause.content.split(/(?<=[.!?])\s+/);
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);

      if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          clauseNumber: `${clause.clauseNumber}.chunk${chunkIndex + 1}`,
          clauseTitle: clause.clauseTitle,
          content: currentChunk.join(' '),
          startIndex: clause.startIndex,
          endIndex: clause.endIndex
        });

        // Start new chunk with overlap
        const overlapSentences = this.getOverlapSentences(currentChunk, overlapTokens);
        currentChunk = [...overlapSentences, sentence];
        currentTokens = this.estimateTokens(currentChunk.join(' '));
        chunkIndex++;
      } else {
        currentChunk.push(sentence);
        currentTokens += sentenceTokens;
      }
    }

    // Save last chunk
    if (currentChunk.length > 0) {
      chunks.push({
        clauseNumber: `${clause.clauseNumber}.chunk${chunkIndex + 1}`,
        clauseTitle: clause.clauseTitle,
        content: currentChunk.join(' '),
        startIndex: clause.startIndex,
        endIndex: clause.endIndex
      });
    }

    return chunks;
  }

  /**
   * Get overlap sentences from end of chunk
   */
  private getOverlapSentences(sentences: string[], overlapTokens: number): string[] {
    const result: string[] = [];
    let tokens = 0;

    for (let i = sentences.length - 1; i >= 0 && tokens < overlapTokens; i--) {
      result.unshift(sentences[i]);
      tokens += this.estimateTokens(sentences[i]);
    }

    return result;
  }

  /**
   * Parse Excel data into table chunks
   */
  parseExcelToChunks(
    data: any[][],
    sheetName: string,
    maxRowsPerChunk: number = 50
  ): TableData[] {
    const tables: TableData[] = [];

    if (!data || data.length === 0) {
      return tables;
    }

    // First row is typically headers
    const headers = data[0].map(cell => String(cell || ''));
    const dataRows = data.slice(1);

    // Split into chunks by row count
    for (let i = 0; i < dataRows.length; i += maxRowsPerChunk) {
      const chunkRows = dataRows.slice(i, Math.min(i + maxRowsPerChunk, dataRows.length));
      
      tables.push({
        headers,
        rows: chunkRows.map(row => row.map(cell => String(cell || ''))),
        sheetName,
        rowRange: {
          start: i + 2, // +2 because Excel is 1-indexed and we skip header
          end: Math.min(i + maxRowsPerChunk, dataRows.length) + 1
        }
      });
    }

    return tables;
  }

  /**
   * Convert table data to searchable text
   */
  tableToText(table: TableData): string {
    const lines: string[] = [];
    
    lines.push(`Table: ${table.sheetName || 'Unknown'}`);
    if (table.rowRange) {
      lines.push(`Rows ${table.rowRange.start} - ${table.rowRange.end}`);
    }
    lines.push(`Columns: ${table.headers.join(', ')}`);
    lines.push('');

    for (const row of table.rows) {
      const rowText = table.headers
        .map((header, i) => `${header}: ${row[i] || ''}`)
        .join(' | ');
      lines.push(rowText);
    }

    return lines.join('\n');
  }

  /**
   * Chunk a text document (PDF content)
   */
  async chunkTextDocument(
    documentId: string,
    contractId: string,
    text: string,
    documentGroup: DocumentGroup,
    options: ChunkingOptions = {}
  ): Promise<ChunkingResult> {
    const startTime = Date.now();
    const {
      preserveSubClauses = true,
      maxTokens = CHUNK_CONFIG.maxTokens,
      overlapTokens = CHUNK_CONFIG.overlapTokens
    } = options;

    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;
    let clauseCount = 0;

    // Parse clauses from text
    const parsedClauses = this.parseClausesFromText(text);
    clauseCount = parsedClauses.length;

    for (const clause of parsedClauses) {
      // Split large clauses if needed
      const clauseChunks = this.splitLargeClause(clause, maxTokens, overlapTokens);

      for (const chunk of clauseChunks) {
        const tokenCount = this.estimateTokens(chunk.content);

        // Skip very small chunks
        if (tokenCount < CHUNK_CONFIG.minChunkTokens && chunks.length > 0) {
          // Append to previous chunk if possible
          const prevChunk = chunks[chunks.length - 1];
          const combinedTokens = (prevChunk.token_count || 0) + tokenCount;
          if (combinedTokens <= maxTokens) {
            prevChunk.content += '\n\n' + chunk.content;
            prevChunk.token_count = combinedTokens;
            continue;
          }
        }

        chunks.push({
          id: '', // Will be set by database
          document_id: documentId,
          contract_id: contractId,
          chunk_index: chunkIndex++,
          content: chunk.content,
          content_hash: this.generateContentHash(chunk.content),
          content_type: 'text' as ChunkContentType,
          clause_number: clause.clauseNumber,
          clause_title: clause.clauseTitle,
          token_count: tokenCount,
          metadata: {
            document_group: documentGroup,
            is_split_chunk: clauseChunks.length > 1
          }
        });
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      chunks,
      metadata: {
        totalChunks: chunks.length,
        totalTokens: chunks.reduce((sum, c) => sum + (c.token_count || 0), 0),
        clauseCount,
        tableCount: 0,
        processingTime
      }
    };
  }

  /**
   * Chunk an Excel document (BOQ, schedules)
   */
  async chunkExcelDocument(
    documentId: string,
    contractId: string,
    sheets: Map<string, any[][]>,
    documentGroup: DocumentGroup,
    options: ChunkingOptions = {}
  ): Promise<ChunkingResult> {
    const startTime = Date.now();
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;
    let tableCount = 0;

    for (const [sheetName, data] of sheets) {
      const tables = this.parseExcelToChunks(data, sheetName);
      tableCount += tables.length;

      for (const table of tables) {
        const content = this.tableToText(table);
        const tokenCount = this.estimateTokens(content);

        chunks.push({
          id: '',
          document_id: documentId,
          contract_id: contractId,
          chunk_index: chunkIndex++,
          content,
          content_hash: this.generateContentHash(content),
          content_type: 'table' as ChunkContentType,
          token_count: tokenCount,
          metadata: {
            document_group: documentGroup,
            sheet_name: sheetName,
            headers: table.headers,
            row_range: table.rowRange,
            row_count: table.rows.length
          }
        });
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      chunks,
      metadata: {
        totalChunks: chunks.length,
        totalTokens: chunks.reduce((sum, c) => sum + (c.token_count || 0), 0),
        clauseCount: 0,
        tableCount,
        processingTime
      }
    };
  }

  /**
   * Chunk a form/annex document
   */
  async chunkAnnexDocument(
    documentId: string,
    contractId: string,
    text: string,
    documentGroup: DocumentGroup,
    appendixRef?: string,
    options: ChunkingOptions = {}
  ): Promise<ChunkingResult> {
    const startTime = Date.now();
    const { maxTokens = CHUNK_CONFIG.maxTokens } = options;
    const chunks: DocumentChunk[] = [];

    const totalTokens = this.estimateTokens(text);

    // If small enough, keep as single chunk
    if (totalTokens <= maxTokens) {
      chunks.push({
        id: '',
        document_id: documentId,
        contract_id: contractId,
        chunk_index: 0,
        content: text,
        content_hash: this.generateContentHash(text),
        content_type: 'form' as ChunkContentType,
        token_count: totalTokens,
        metadata: {
          document_group: documentGroup,
          appendix_ref: appendixRef,
          is_complete_document: true
        }
      });
    } else {
      // Split by section headers or paragraphs
      const sections = text.split(/\n(?=[A-Z][A-Z\s]+:|\d+\.\s+[A-Z])/);
      let chunkIndex = 0;

      for (const section of sections) {
        if (section.trim()) {
          const tokenCount = this.estimateTokens(section);
          chunks.push({
            id: '',
            document_id: documentId,
            contract_id: contractId,
            chunk_index: chunkIndex++,
            content: section.trim(),
            content_hash: this.generateContentHash(section),
            content_type: 'form' as ChunkContentType,
            token_count: tokenCount,
            metadata: {
              document_group: documentGroup,
              appendix_ref: appendixRef
            }
          });
        }
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      chunks,
      metadata: {
        totalChunks: chunks.length,
        totalTokens: chunks.reduce((sum, c) => sum + (c.token_count || 0), 0),
        clauseCount: 0,
        tableCount: 0,
        processingTime
      }
    };
  }

  /**
   * Save chunks to database
   */
  async saveChunks(chunks: DocumentChunk[]): Promise<{ saved: number; errors: string[] }> {
    const errors: string[] = [];
    let saved = 0;

    // Check for duplicates by content hash
    const uniqueChunks = this.deduplicateChunks(chunks);

    // Batch insert
    const batchSize = 50;
    for (let i = 0; i < uniqueChunks.length; i += batchSize) {
      const batch = uniqueChunks.slice(i, i + batchSize);
      
      const { data, error } = await this.supabase
        .from('contract_document_chunks')
        .insert(batch.map(c => ({
          document_id: c.document_id,
          contract_id: c.contract_id,
          chunk_index: c.chunk_index,
          content: c.content,
          content_hash: c.content_hash,
          content_type: c.content_type,
          clause_number: c.clause_number,
          clause_title: c.clause_title,
          page_number: c.page_number,
          token_count: c.token_count,
          metadata: c.metadata
        })))
        .select('id');

      if (error) {
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        saved += data?.length || 0;
      }
    }

    return { saved, errors };
  }

  /**
   * Remove duplicate chunks based on content hash
   */
  private deduplicateChunks(chunks: DocumentChunk[]): DocumentChunk[] {
    const seen = new Set<string>();
    return chunks.filter(chunk => {
      const key = `${chunk.document_id}-${chunk.content_hash}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Get chunks for a document
   */
  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    const { data, error } = await this.supabase
      .from('contract_document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index');

    if (error) {
      console.error('Error fetching chunks:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get all chunks for a contract
   */
  async getContractChunks(contractId: string): Promise<DocumentChunk[]> {
    const { data, error } = await this.supabase
      .from('contract_document_chunks')
      .select('*')
      .eq('contract_id', contractId)
      .order('document_id')
      .order('chunk_index');

    if (error) {
      console.error('Error fetching contract chunks:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Delete chunks for a document
   */
  async deleteDocumentChunks(documentId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('contract_document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (error) {
      console.error('Error deleting chunks:', error);
      return false;
    }

    return true;
  }
}

// Singleton instance
let chunkingService: DocumentChunkingService | null = null;

export function getDocumentChunkingService(): DocumentChunkingService {
  if (!chunkingService) {
    chunkingService = new DocumentChunkingService();
  }
  return chunkingService;
}

export default DocumentChunkingService;
