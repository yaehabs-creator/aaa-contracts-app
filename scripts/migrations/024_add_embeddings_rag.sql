-- ============================================================
-- Migration 024: Add pgvector embeddings + RAG infrastructure
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding columns to contract_document_chunks
ALTER TABLE contract_document_chunks
  ADD COLUMN IF NOT EXISTS embedding       vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small',
  ADD COLUMN IF NOT EXISTS embedded_at     TIMESTAMPTZ;

-- 3. IVFFlat index for fast cosine similarity search
--    Rebuild with higher `lists` value once you have > 1000 rows
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON contract_document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for querying chunks by contract
CREATE INDEX IF NOT EXISTS idx_chunks_contract_id
  ON contract_document_chunks (contract_id);

-- 4. Semantic search RPC function
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding      vector(1536),
  match_contract_id    UUID,
  similarity_threshold FLOAT DEFAULT 0.65,
  match_count          INT   DEFAULT 15
)
RETURNS TABLE (
  chunk_id       UUID,
  document_id    UUID,
  contract_id    UUID,
  content        TEXT,
  clause_number  TEXT,
  clause_title   TEXT,
  page_number    INT,
  content_type   TEXT,
  document_group TEXT,
  similarity     FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    id                                  AS chunk_id,
    document_id,
    contract_id,
    content,
    clause_number,
    clause_title,
    page_number,
    content_type,
    metadata->>'document_group'         AS document_group,
    1 - (embedding <=> query_embedding) AS similarity
  FROM contract_document_chunks
  WHERE
    contract_id = match_contract_id
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > similarity_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 5. ingestion_jobs table for tracking background pipeline jobs
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID REFERENCES contracts(id) ON DELETE CASCADE,
  document_id     UUID,
  job_type        TEXT NOT NULL CHECK (job_type IN ('ocr','chunking','embedding','full_ingestion')),
  status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','processing','completed','failed')),
  progress        INT  DEFAULT 0,
  total_chunks    INT  DEFAULT 0,
  embedded_chunks INT  DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_contract
  ON ingestion_jobs (contract_id, status);
