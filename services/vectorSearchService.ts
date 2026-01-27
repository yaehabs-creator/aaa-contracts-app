/**
 * Vector Search Service
 * Implements embedding generation and semantic search using OpenAI embeddings + pgvector
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DocumentChunk,
  ChunkSearchResult,
  EffectiveClause,
  DocumentGroup
} from '../types';

// OpenAI embedding model
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// Search configuration
const SEARCH_CONFIG = {
  defaultLimit: 10,
  defaultThreshold: 0.7,
  maxResults: 50,
  batchSize: 100  // For batch embedding
};

export interface EmbeddingResult {
  chunkId: string;
  success: boolean;
  error?: string;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  documentGroups?: DocumentGroup[];
  clauseNumbers?: string[];
  contentTypes?: string[];
  includeOverridden?: boolean;
}

export interface SearchResult {
  results: ChunkSearchResult[];
  totalFound: number;
  searchTime: number;
  query: string;
}

export class VectorSearchService {
  private supabase: SupabaseClient;
  private openaiApiKey: string | null = null;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL and key are required');
    }

    this.supabase = createClient(url, key);
    this.openaiApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || null;
  }

  /**
   * Set OpenAI API key (if not set via environment)
   */
  setOpenAIKey(key: string): void {
    this.openaiApiKey = key;
  }

  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.openaiApiKey) {
      console.error('OpenAI API key not configured');
      return null;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text,
          dimensions: EMBEDDING_DIMENSIONS
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Embedding generation failed');
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.openaiApiKey) {
      console.error('OpenAI API key not configured');
      return texts.map(() => null);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: texts,
          dimensions: EMBEDDING_DIMENSIONS
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Batch embedding generation failed');
      }

      const data = await response.json();
      
      // Sort by index to maintain order
      const sortedEmbeddings = data.data.sort((a: any, b: any) => a.index - b.index);
      return sortedEmbeddings.map((item: any) => item.embedding);
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      return texts.map(() => null);
    }
  }

  /**
   * Generate and store embedding for a single chunk
   */
  async embedChunk(chunkId: string): Promise<EmbeddingResult> {
    // Get chunk content
    const { data: chunk, error: fetchError } = await this.supabase
      .from('contract_document_chunks')
      .select('id, content')
      .eq('id', chunkId)
      .single();

    if (fetchError || !chunk) {
      return { chunkId, success: false, error: 'Chunk not found' };
    }

    // Generate embedding
    const embedding = await this.generateEmbedding(chunk.content);
    if (!embedding) {
      return { chunkId, success: false, error: 'Embedding generation failed' };
    }

    // Store embedding
    const { error: updateError } = await this.supabase
      .from('contract_document_chunks')
      .update({ embedding })
      .eq('id', chunkId);

    if (updateError) {
      return { chunkId, success: false, error: updateError.message };
    }

    return { chunkId, success: true };
  }

  /**
   * Generate and store embeddings for all chunks in a document
   */
  async embedDocument(documentId: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    // Get all chunks without embeddings
    const { data: chunks, error } = await this.supabase
      .from('contract_document_chunks')
      .select('id, content')
      .eq('document_id', documentId)
      .is('embedding', null);

    if (error || !chunks) {
      return { total: 0, successful: 0, failed: 0, errors: [error?.message || 'Failed to fetch chunks'] };
    }

    // Process in batches
    for (let i = 0; i < chunks.length; i += SEARCH_CONFIG.batchSize) {
      const batch = chunks.slice(i, i + SEARCH_CONFIG.batchSize);
      const texts = batch.map(c => c.content);

      const embeddings = await this.generateEmbeddingsBatch(texts);

      // Update chunks with embeddings
      for (let j = 0; j < batch.length; j++) {
        const embedding = embeddings[j];
        if (embedding) {
          const { error: updateError } = await this.supabase
            .from('contract_document_chunks')
            .update({ embedding })
            .eq('id', batch[j].id);

          if (updateError) {
            errors.push(`Chunk ${batch[j].id}: ${updateError.message}`);
            failed++;
          } else {
            successful++;
          }
        } else {
          errors.push(`Chunk ${batch[j].id}: Embedding generation returned null`);
          failed++;
        }
      }
    }

    return {
      total: chunks.length,
      successful,
      failed,
      errors
    };
  }

  /**
   * Generate and store embeddings for all chunks in a contract
   */
  async embedContract(contractId: string, onProgress?: (progress: number) => void): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    // Get all chunks without embeddings
    const { data: chunks, error } = await this.supabase
      .from('contract_document_chunks')
      .select('id, content')
      .eq('contract_id', contractId)
      .is('embedding', null);

    if (error || !chunks) {
      return { total: 0, successful: 0, failed: 0, errors: [error?.message || 'Failed to fetch chunks'] };
    }

    const total = chunks.length;

    // Process in batches
    for (let i = 0; i < chunks.length; i += SEARCH_CONFIG.batchSize) {
      const batch = chunks.slice(i, i + SEARCH_CONFIG.batchSize);
      const texts = batch.map(c => c.content);

      const embeddings = await this.generateEmbeddingsBatch(texts);

      // Update chunks with embeddings
      for (let j = 0; j < batch.length; j++) {
        const embedding = embeddings[j];
        if (embedding) {
          const { error: updateError } = await this.supabase
            .from('contract_document_chunks')
            .update({ embedding })
            .eq('id', batch[j].id);

          if (updateError) {
            errors.push(`Chunk ${batch[j].id}: ${updateError.message}`);
            failed++;
          } else {
            successful++;
          }
        } else {
          errors.push(`Chunk ${batch[j].id}: Embedding generation returned null`);
          failed++;
        }
      }

      // Report progress
      if (onProgress) {
        const progress = Math.round(((i + batch.length) / total) * 100);
        onProgress(progress);
      }
    }

    return { total, successful, failed, errors };
  }

  /**
   * Search contract chunks using semantic similarity
   */
  async searchContract(
    contractId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult> {
    const startTime = Date.now();
    const {
      limit = SEARCH_CONFIG.defaultLimit,
      threshold = SEARCH_CONFIG.defaultThreshold,
      documentGroups,
      clauseNumbers,
      contentTypes,
      includeOverridden = true
    } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding) {
      return {
        results: [],
        totalFound: 0,
        searchTime: Date.now() - startTime,
        query
      };
    }

    // Use Supabase RPC function for vector search
    const { data, error } = await this.supabase.rpc('search_contract_chunks', {
      p_contract_id: contractId,
      p_query_embedding: queryEmbedding,
      p_limit: Math.min(limit, SEARCH_CONFIG.maxResults),
      p_threshold: threshold
    });

    if (error) {
      console.error('Search error:', error);
      return {
        results: [],
        totalFound: 0,
        searchTime: Date.now() - startTime,
        query
      };
    }

    // Filter results based on options
    let results: ChunkSearchResult[] = (data || []).map((row: any) => ({
      chunk_id: row.chunk_id,
      document_id: row.document_id,
      document_name: row.document_name,
      document_group: row.document_group as DocumentGroup,
      clause_number: row.clause_number,
      content: row.content,
      similarity: row.similarity
    }));

    // Apply additional filters
    if (documentGroups && documentGroups.length > 0) {
      results = results.filter(r => documentGroups.includes(r.document_group));
    }

    if (clauseNumbers && clauseNumbers.length > 0) {
      results = results.filter(r => r.clause_number && clauseNumbers.includes(r.clause_number));
    }

    if (contentTypes && contentTypes.length > 0) {
      // Would need to add content_type to the RPC function return
    }

    return {
      results: results.slice(0, limit),
      totalFound: results.length,
      searchTime: Date.now() - startTime,
      query
    };
  }

  /**
   * Search with automatic context expansion
   */
  async searchWithContext(
    contractId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<{
    directResults: ChunkSearchResult[];
    relatedClauses: ChunkSearchResult[];
    searchTime: number;
  }> {
    const startTime = Date.now();

    // Get direct search results
    const directSearch = await this.searchContract(contractId, query, options);

    // Get related clauses based on cross-references
    const relatedClauseNumbers = new Set<string>();
    
    for (const result of directSearch.results) {
      if (result.clause_number) {
        // Get outgoing references
        const { data: refs } = await this.supabase
          .from('clause_references')
          .select('target_clause_number')
          .eq('contract_id', contractId)
          .eq('source_clause_number', result.clause_number);

        for (const ref of refs || []) {
          relatedClauseNumbers.add(ref.target_clause_number);
        }
      }
    }

    // Fetch related clause content
    const relatedClauses: ChunkSearchResult[] = [];
    
    if (relatedClauseNumbers.size > 0) {
      const { data: relatedChunks } = await this.supabase
        .from('contract_document_chunks')
        .select(`
          id,
          document_id,
          clause_number,
          content,
          document:contract_documents(name, document_group)
        `)
        .eq('contract_id', contractId)
        .in('clause_number', Array.from(relatedClauseNumbers));

      for (const chunk of relatedChunks || []) {
        relatedClauses.push({
          chunk_id: chunk.id,
          document_id: chunk.document_id,
          document_name: (chunk.document as any)?.name || 'Unknown',
          document_group: (chunk.document as any)?.document_group || DocumentGroup.C,
          clause_number: chunk.clause_number,
          content: chunk.content,
          similarity: 0  // Not from similarity search
        });
      }
    }

    return {
      directResults: directSearch.results,
      relatedClauses,
      searchTime: Date.now() - startTime
    };
  }

  /**
   * Find similar clauses across the contract
   */
  async findSimilarClauses(
    contractId: string,
    clauseNumber: string,
    limit: number = 5
  ): Promise<ChunkSearchResult[]> {
    // Get the source clause content
    const { data: sourceChunk, error } = await this.supabase
      .from('contract_document_chunks')
      .select('content, embedding')
      .eq('contract_id', contractId)
      .eq('clause_number', clauseNumber)
      .single();

    if (error || !sourceChunk) {
      return [];
    }

    // If no embedding, generate one
    let embedding = sourceChunk.embedding;
    if (!embedding) {
      embedding = await this.generateEmbedding(sourceChunk.content);
      if (!embedding) return [];
    }

    // Search for similar clauses
    const { data: results } = await this.supabase.rpc('search_contract_chunks', {
      p_contract_id: contractId,
      p_query_embedding: embedding,
      p_limit: limit + 1,  // +1 to account for the source clause itself
      p_threshold: 0.5
    });

    // Filter out the source clause
    return (results || [])
      .filter((r: any) => r.clause_number !== clauseNumber)
      .slice(0, limit)
      .map((row: any) => ({
        chunk_id: row.chunk_id,
        document_id: row.document_id,
        document_name: row.document_name,
        document_group: row.document_group as DocumentGroup,
        clause_number: row.clause_number,
        content: row.content,
        similarity: row.similarity
      }));
  }

  /**
   * Get embedding statistics for a contract
   */
  async getEmbeddingStats(contractId: string): Promise<{
    totalChunks: number;
    embeddedChunks: number;
    pendingChunks: number;
    embeddingCoverage: number;
  }> {
    const { data: total } = await this.supabase
      .from('contract_document_chunks')
      .select('id', { count: 'exact' })
      .eq('contract_id', contractId);

    const { data: embedded } = await this.supabase
      .from('contract_document_chunks')
      .select('id', { count: 'exact' })
      .eq('contract_id', contractId)
      .not('embedding', 'is', null);

    const totalChunks = total?.length || 0;
    const embeddedChunks = embedded?.length || 0;

    return {
      totalChunks,
      embeddedChunks,
      pendingChunks: totalChunks - embeddedChunks,
      embeddingCoverage: totalChunks > 0 ? (embeddedChunks / totalChunks) * 100 : 0
    };
  }

  /**
   * Re-embed all chunks (for model upgrade or re-indexing)
   */
  async reembedAllChunks(contractId: string, onProgress?: (progress: number) => void): Promise<{
    total: number;
    successful: number;
    failed: number;
  }> {
    // Clear existing embeddings
    await this.supabase
      .from('contract_document_chunks')
      .update({ embedding: null })
      .eq('contract_id', contractId);

    // Re-embed all
    return this.embedContract(contractId, onProgress);
  }
}

// Singleton instance
let searchService: VectorSearchService | null = null;

export function getVectorSearchService(): VectorSearchService {
  if (!searchService) {
    searchService = new VectorSearchService();
  }
  return searchService;
}

export default VectorSearchService;
