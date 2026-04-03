/**
 * RAG Retrieval Service
 *
 * Semantic retrieval pipeline:
 *   user query → OpenAI embedding → Supabase pgvector search → top-K relevant chunks
 *
 * These chunks are injected as context into Claude's prompt so it can answer
 * questions about a specific contract without loading the entire document.
 */

import { supabase } from '@/lib/supabase';
import { getEmbeddingService } from './embeddingService';

export interface RAGChunk {
  chunk_id: string;
  document_id: string;
  content: string;
  clause_number?: string;
  clause_title?: string;
  page_number?: number;
  content_type: string;
  document_group?: string;
  similarity: number;
}

export interface RAGResult {
  chunks: RAGChunk[];
  /** Pre-formatted context string ready to inject into a system/user prompt */
  context: string;
  totalFound: number;
}

/**
 * Retrieve the most semantically relevant contract chunks for a given query.
 *
 * Requires:
 * - VITE_OPENAI_API_KEY in .env for embedding generation
 * - Migration 024_add_embeddings_rag.sql applied in Supabase
 * - Chunks already stored with embeddings (via docling_backend.py ingestion)
 */
export async function retrieveRelevantChunks(
  contractId: string,
  query: string,
  options: { limit?: number; threshold?: number } = {}
): Promise<RAGResult> {
  const limit = options.limit ?? 15;
  const threshold = options.threshold ?? 0.65;

  // 1. Generate query embedding using existing EmbeddingService
  const embeddingService = getEmbeddingService();
  let queryEmbedding: number[];
  try {
    const embeddings = await embeddingService.generateEmbeddings(query);
    queryEmbedding = embeddings[0];
  } catch (e) {
    console.warn('RAG: embedding generation failed:', e);
    return { chunks: [], context: '', totalFound: 0 };
  }

  if (!queryEmbedding?.length) {
    return { chunks: [], context: '', totalFound: 0 };
  }

  // 2. Semantic search via Supabase RPC (match_document_chunks)
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_contract_id: contractId,
    similarity_threshold: threshold,
    match_count: limit
  });

  if (error) {
    console.error('RAG: Supabase search error:', error.message);
    return { chunks: [], context: '', totalFound: 0 };
  }

  const chunks: RAGChunk[] = (data || []).map((row: any) => ({
    chunk_id: row.chunk_id,
    document_id: row.document_id,
    content: row.content,
    clause_number: row.clause_number,
    clause_title: row.clause_title,
    page_number: row.page_number,
    content_type: row.content_type,
    document_group: row.document_group,
    similarity: row.similarity
  }));

  // 3. Format context string for LLM injection
  const context = chunks
    .map((c, i) => {
      const clauseRef = c.clause_number ? `Clause ${c.clause_number}` : `Section ${i + 1}`;
      const matchPct = Math.round(c.similarity * 100);
      return `[${clauseRef} | ${matchPct}% match]\n${c.content}`;
    })
    .join('\n\n---\n\n');

  return { chunks, context, totalFound: chunks.length };
}
