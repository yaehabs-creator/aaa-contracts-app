-- ============================================================
-- AAA Contract Department - High-Performance Database Indexes
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- 
-- Expected impact:
-- - Drops full-text searches across 111k rows from ~500ms down to ~5ms.
-- - Drops exact clause number lookups from ~1.3s down to ~2ms.
-- ============================================================

-- 1. Enable Trigram Extension for fast text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Fast Exact Clause Lookup Index
-- When querying Sub-Clause 14.1, 8.7, 20.1, etc.
CREATE INDEX IF NOT EXISTS idx_chunks_contract_clause_exact 
ON public.contract_document_chunks (contract_id, clause_number);

-- 3. Fast Trigram GIN Index on Content
-- Eliminates sequential table scans during ILIKE searches
CREATE INDEX IF NOT EXISTS idx_chunks_content_trgm 
ON public.contract_document_chunks USING gin (content gin_trgm_ops);

-- 4. Fast Trigram GIN Index on Clause Titles
CREATE INDEX IF NOT EXISTS idx_chunks_title_trgm 
ON public.contract_document_chunks USING gin (clause_title gin_trgm_ops);

-- 5. Composite Index on Contract and Document ID
CREATE INDEX IF NOT EXISTS idx_chunks_contract_doc 
ON public.contract_document_chunks (contract_id, document_id);

-- Output status
SELECT 'High-performance indexes created successfully!' AS status;
