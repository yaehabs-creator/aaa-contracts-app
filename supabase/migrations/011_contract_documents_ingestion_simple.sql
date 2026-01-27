-- Migration 011: Full Contract Document Ingestion System (Simplified)
-- Run this in Supabase SQL Editor
-- This version is safe to run multiple times

-- 1. Enable pgvector extension (required for embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create document_group type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_group') THEN
        CREATE TYPE document_group AS ENUM ('A', 'B', 'C', 'D', 'I', 'N');
    END IF;
END $$;

-- 3. Contract Documents Table
CREATE TABLE IF NOT EXISTS contract_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    document_group document_group NOT NULL,
    name TEXT NOT NULL,
    original_filename TEXT,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT,
    page_count INTEGER,
    sequence_number INTEGER NOT NULL DEFAULT 1,
    effective_date DATE,
    supersedes_document_id UUID REFERENCES contract_documents(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    processing_error TEXT,
    processing_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    UNIQUE(contract_id, document_group, sequence_number)
);

-- 4. Contract Document Chunks Table
CREATE TABLE IF NOT EXISTS contract_document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'table', 'form', 'metadata', 'heading')),
    clause_number TEXT,
    clause_title TEXT,
    page_number INTEGER,
    page_range_start INTEGER,
    page_range_end INTEGER,
    token_count INTEGER,
    confidence_score DECIMAL(3,2),
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);

-- 5. Clause References Table
CREATE TABLE IF NOT EXISTS clause_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    source_clause_number TEXT NOT NULL,
    source_document_id UUID REFERENCES contract_documents(id) ON DELETE CASCADE,
    source_chunk_id UUID REFERENCES contract_document_chunks(id) ON DELETE CASCADE,
    target_clause_number TEXT NOT NULL,
    target_document_id UUID REFERENCES contract_documents(id) ON DELETE SET NULL,
    target_chunk_id UUID REFERENCES contract_document_chunks(id) ON DELETE SET NULL,
    reference_type TEXT DEFAULT 'mentions' CHECK (reference_type IN (
        'mentions', 'overrides', 'supplements', 'cross_reference', 'defines', 'amends'
    )),
    reference_text TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_id, source_clause_number, target_clause_number, source_document_id)
);

-- 6. Document Overrides Table
CREATE TABLE IF NOT EXISTS document_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    overriding_document_id UUID NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
    overridden_document_id UUID NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
    override_scope TEXT NOT NULL,
    override_type TEXT DEFAULT 'full' CHECK (override_type IN ('full', 'partial', 'clause_specific')),
    affected_clauses TEXT[],
    reason TEXT,
    effective_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_id, overriding_document_id, overridden_document_id, override_scope)
);

-- 7. Ingestion Jobs Table
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    document_id UUID REFERENCES contract_documents(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('ocr', 'parsing', 'chunking', 'embedding', 'validation', 'full_ingestion')),
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create Indexes
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract ON contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_group ON contract_documents(contract_id, document_group);
CREATE INDEX IF NOT EXISTS idx_contract_documents_status ON contract_documents(status);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_document ON contract_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_contract ON contract_document_chunks(contract_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_clause ON contract_document_chunks(clause_number);
CREATE INDEX IF NOT EXISTS idx_clause_refs_contract ON clause_references(contract_id);
CREATE INDEX IF NOT EXISTS idx_clause_refs_source ON clause_references(source_clause_number);
CREATE INDEX IF NOT EXISTS idx_clause_refs_target ON clause_references(target_clause_number);
CREATE INDEX IF NOT EXISTS idx_doc_overrides_contract ON document_overrides(contract_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_contract ON ingestion_jobs(contract_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status);

-- 9. Enable RLS
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clause_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS Policies (using simple auth check instead of is_admin())
-- Read policies - all authenticated users can read
DROP POLICY IF EXISTS "Users can read contract documents" ON contract_documents;
CREATE POLICY "Users can read contract documents" ON contract_documents
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can read document chunks" ON contract_document_chunks;
CREATE POLICY "Users can read document chunks" ON contract_document_chunks
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can read clause references" ON clause_references;
CREATE POLICY "Users can read clause references" ON clause_references
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can read document overrides" ON document_overrides;
CREATE POLICY "Users can read document overrides" ON document_overrides
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can read ingestion jobs" ON ingestion_jobs;
CREATE POLICY "Users can read ingestion jobs" ON ingestion_jobs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write policies - authenticated users can insert/update/delete
DROP POLICY IF EXISTS "Users can manage contract documents" ON contract_documents;
CREATE POLICY "Users can manage contract documents" ON contract_documents
    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage document chunks" ON contract_document_chunks;
CREATE POLICY "Users can manage document chunks" ON contract_document_chunks
    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage clause references" ON clause_references;
CREATE POLICY "Users can manage clause references" ON clause_references
    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage document overrides" ON document_overrides;
CREATE POLICY "Users can manage document overrides" ON document_overrides
    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage ingestion jobs" ON ingestion_jobs;
CREATE POLICY "Users can manage ingestion jobs" ON ingestion_jobs
    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 11. Helper Functions
CREATE OR REPLACE FUNCTION get_document_priority(doc_group document_group)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE doc_group
        WHEN 'A' THEN 100
        WHEN 'B' THEN 90
        WHEN 'D' THEN 80
        WHEN 'C' THEN 70
        WHEN 'I' THEN 60
        WHEN 'N' THEN 50
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 12. Vector Search Function
CREATE OR REPLACE FUNCTION search_contract_chunks(
    p_contract_id UUID,
    p_query_embedding vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    document_name TEXT,
    document_group document_group,
    clause_number TEXT,
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS chunk_id,
        c.document_id,
        d.name AS document_name,
        d.document_group,
        c.clause_number,
        c.content,
        1 - (c.embedding <=> p_query_embedding) AS similarity
    FROM contract_document_chunks c
    JOIN contract_documents d ON c.document_id = d.id
    WHERE c.contract_id = p_contract_id
      AND c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> p_query_embedding) >= p_threshold
    ORDER BY c.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Done!
SELECT 'Migration 011 completed successfully!' AS status;
