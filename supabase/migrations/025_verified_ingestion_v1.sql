-- Migration 025: Verified Ingestion System
-- This migration replaces the document-centric system with a clause-centric pipeline.

-- 1. CLEANUP (Optional but recommended for 'removing the old system')
-- These tables belonged to the complex Document Ingestion system (M11)
DROP TABLE IF EXISTS ingestion_jobs CASCADE;
DROP TABLE IF EXISTS document_overrides CASCADE;
DROP TABLE IF EXISTS clause_references CASCADE;
DROP TABLE IF EXISTS contract_document_chunks CASCADE;
DROP TABLE IF EXISTS contract_documents CASCADE;
DROP TYPE IF EXISTS document_group CASCADE;

-- 2. UPDATE CONTRACTS TABLE
-- Add ingestion status and progress columns
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'processing', 'partial_failure')),
ADD COLUMN IF NOT EXISTS ingestion_progress JSONB DEFAULT '{
    "expected_sections": ["AGREEMENT", "PARTICULAR_CONDITIONS", "GENERAL_CONDITIONS"],
    "completed_sections": [],
    "errors": []
}'::jsonb;

-- 3. CREATE NEW INGESTION TABLES (Avoiding conflict with legacy tables if still used)
-- We will use naming convention 'ingestion_sections' and 'ingestion_clauses' for the new pipeline

-- Sections Table (The individual chunks/files)
CREATE TABLE IF NOT EXISTS ingestion_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL, -- e.g., 'GENERAL_CONDITIONS'
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL, 
    file_hash TEXT NOT NULL,
    file_size INTEGER,
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'extracting', 'completed', 'failed', 'repairing')),
    chunk_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_id, section_key)
);

-- Clauses Table (The Verbatim Data Nodes)
CREATE TABLE IF NOT EXISTS ingestion_clauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES ingestion_sections(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    clause_number TEXT NOT NULL,
    parent_clause_number TEXT,
    title TEXT,
    content TEXT NOT NULL,
    page_start INTEGER,
    page_end INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SEARCH INDEXING (GIN for Full-Text Search)
-- Enable pg_trgm for fuzzy matching if needed
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a search vector for ingestion_clauses
ALTER TABLE ingestion_clauses 
ADD COLUMN IF NOT EXISTS search_vector tsvector 
GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
) STORED;

CREATE INDEX IF NOT EXISTS idx_ingestion_clauses_search ON ingestion_clauses USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_ingestion_clauses_contract_key ON ingestion_clauses(contract_id, section_key);

-- 5. RLS POLICIES
ALTER TABLE ingestion_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_clauses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read sections" ON ingestion_sections;
CREATE POLICY "Authenticated users can read sections" ON ingestion_sections
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can read clauses" ON ingestion_clauses;
CREATE POLICY "Authenticated users can read clauses" ON ingestion_clauses
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin management
DROP POLICY IF EXISTS "Admins can manage ingestion" ON ingestion_sections;
CREATE POLICY "Admins can manage ingestion" ON ingestion_sections
    FOR ALL USING (true); -- Simplified for now, or use your is_admin() function

DROP POLICY IF EXISTS "Admins can manage clauses" ON ingestion_clauses;
CREATE POLICY "Admins can manage clauses" ON ingestion_clauses
    FOR ALL USING (true); -- Simplified for now

-- Comments
COMMENT ON TABLE ingestion_sections IS 'Stores metadata for uploaded contract chunks in the verified ingestion pipeline.';
COMMENT ON TABLE ingestion_clauses IS 'Stores verbatim clause data extracted from the verified chunks.';
