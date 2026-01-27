-- Migration 011: Full Contract Document Ingestion System
-- Adds tables for contract documents, chunks, cross-references, and override tracking
-- Enables pgvector for semantic search capabilities

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Document Groups Enum
DO $$ BEGIN
    CREATE TYPE document_group AS ENUM ('A', 'B', 'C', 'D', 'I', 'N');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extended Section Types (add new values if they don't exist)
DO $$ BEGIN
    ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'ADDENDUM';
EXCEPTION
    WHEN undefined_object THEN 
        -- section_type doesn't exist as enum, skip
        null;
END $$;

DO $$ BEGIN
    ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'BOQ';
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'SCHEDULE';
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE section_type ADD VALUE IF NOT EXISTS 'ANNEX';
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- ============================================
-- Contract Documents Table
-- Stores metadata about uploaded contract documents
-- ============================================
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

-- Indexes for contract_documents
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract ON contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_group ON contract_documents(contract_id, document_group);
CREATE INDEX IF NOT EXISTS idx_contract_documents_status ON contract_documents(status);
CREATE INDEX IF NOT EXISTS idx_contract_documents_effective_date ON contract_documents(effective_date DESC NULLS LAST);

-- ============================================
-- Contract Document Chunks Table
-- Stores chunked content from documents for RAG/search
-- ============================================
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

-- Indexes for contract_document_chunks
CREATE INDEX IF NOT EXISTS idx_doc_chunks_document ON contract_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_contract ON contract_document_chunks(contract_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_clause ON contract_document_chunks(clause_number);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_content_type ON contract_document_chunks(content_type);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_hash ON contract_document_chunks(content_hash);

-- Vector similarity search index (IVFFlat for better performance)
-- Note: This requires data to be inserted first, so we create it conditionally
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_doc_chunks_embedding'
    ) THEN
        CREATE INDEX idx_doc_chunks_embedding ON contract_document_chunks 
        USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    END IF;
EXCEPTION
    WHEN others THEN
        -- If IVFFlat fails (e.g., not enough data), create a basic index
        CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding_basic ON contract_document_chunks 
        USING hnsw (embedding vector_cosine_ops);
END $$;

-- ============================================
-- Clause Cross-References Table
-- Tracks references between clauses across documents
-- ============================================
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
        'mentions',        -- Simple reference to another clause
        'overrides',       -- PC overrides GC, or Addendum overrides base
        'supplements',     -- Adds to existing clause
        'cross_reference', -- Mutual reference
        'defines',         -- Definition reference
        'amends'           -- Partial modification
    )),
    reference_text TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_id, source_clause_number, target_clause_number, source_document_id)
);

-- Indexes for clause_references
CREATE INDEX IF NOT EXISTS idx_clause_refs_contract ON clause_references(contract_id);
CREATE INDEX IF NOT EXISTS idx_clause_refs_source ON clause_references(source_clause_number);
CREATE INDEX IF NOT EXISTS idx_clause_refs_target ON clause_references(target_clause_number);
CREATE INDEX IF NOT EXISTS idx_clause_refs_type ON clause_references(reference_type);
CREATE INDEX IF NOT EXISTS idx_clause_refs_resolved ON clause_references(is_resolved);

-- ============================================
-- Document Overrides Table
-- Tracks which documents override which (for priority logic)
-- ============================================
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

-- Indexes for document_overrides
CREATE INDEX IF NOT EXISTS idx_doc_overrides_contract ON document_overrides(contract_id);
CREATE INDEX IF NOT EXISTS idx_doc_overrides_overriding ON document_overrides(overriding_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_overrides_overridden ON document_overrides(overridden_document_id);

-- ============================================
-- Ingestion Jobs Table
-- Tracks document processing jobs
-- ============================================
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

-- Indexes for ingestion_jobs
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_contract ON ingestion_jobs(contract_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_document ON ingestion_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status);

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clause_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- Contract Documents Policies
DROP POLICY IF EXISTS "Authenticated users can read contract documents" ON contract_documents;
CREATE POLICY "Authenticated users can read contract documents" ON contract_documents
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage contract documents" ON contract_documents;
CREATE POLICY "Admins can manage contract documents" ON contract_documents
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Contract Document Chunks Policies
DROP POLICY IF EXISTS "Authenticated users can read document chunks" ON contract_document_chunks;
CREATE POLICY "Authenticated users can read document chunks" ON contract_document_chunks
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage document chunks" ON contract_document_chunks;
CREATE POLICY "Admins can manage document chunks" ON contract_document_chunks
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Clause References Policies
DROP POLICY IF EXISTS "Authenticated users can read clause references" ON clause_references;
CREATE POLICY "Authenticated users can read clause references" ON clause_references
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage clause references" ON clause_references;
CREATE POLICY "Admins can manage clause references" ON clause_references
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Document Overrides Policies
DROP POLICY IF EXISTS "Authenticated users can read document overrides" ON document_overrides;
CREATE POLICY "Authenticated users can read document overrides" ON document_overrides
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage document overrides" ON document_overrides;
CREATE POLICY "Admins can manage document overrides" ON document_overrides
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Ingestion Jobs Policies
DROP POLICY IF EXISTS "Authenticated users can read ingestion jobs" ON ingestion_jobs;
CREATE POLICY "Authenticated users can read ingestion jobs" ON ingestion_jobs
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage ingestion jobs" ON ingestion_jobs;
CREATE POLICY "Admins can manage ingestion jobs" ON ingestion_jobs
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- Helper Functions
-- ============================================

-- Function to get document priority order
CREATE OR REPLACE FUNCTION get_document_priority(doc_group document_group)
RETURNS INTEGER AS $$
BEGIN
    -- Priority: A (Agreement) > B (LOA) > C (Conditions) > D (Addendums by date) > I (BOQ) > N (Schedules)
    -- Within same group, later effective_date has higher priority
    RETURN CASE doc_group
        WHEN 'A' THEN 100
        WHEN 'B' THEN 90
        WHEN 'D' THEN 80  -- Addendums have high priority (they override)
        WHEN 'C' THEN 70
        WHEN 'I' THEN 60
        WHEN 'N' THEN 50
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to search chunks by vector similarity
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

-- Function to get effective clause content (considering overrides)
CREATE OR REPLACE FUNCTION get_effective_clause(
    p_contract_id UUID,
    p_clause_number TEXT
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    document_name TEXT,
    document_group document_group,
    content TEXT,
    is_overridden BOOLEAN,
    overridden_by TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH clause_chunks AS (
        SELECT 
            c.id AS chunk_id,
            c.document_id,
            d.name AS document_name,
            d.document_group,
            c.content,
            d.effective_date,
            d.sequence_number,
            get_document_priority(d.document_group) AS priority
        FROM contract_document_chunks c
        JOIN contract_documents d ON c.document_id = d.id
        WHERE c.contract_id = p_contract_id
          AND c.clause_number = p_clause_number
    ),
    override_info AS (
        SELECT 
            cc.chunk_id,
            ARRAY_AGG(DISTINCT d2.name) AS overridden_by
        FROM clause_chunks cc
        JOIN document_overrides o ON o.overridden_document_id = cc.document_id
        JOIN contract_documents d2 ON o.overriding_document_id = d2.id
        WHERE o.contract_id = p_contract_id
          AND (o.affected_clauses IS NULL OR p_clause_number = ANY(o.affected_clauses))
        GROUP BY cc.chunk_id
    )
    SELECT 
        cc.chunk_id,
        cc.document_id,
        cc.document_name,
        cc.document_group,
        cc.content,
        oi.overridden_by IS NOT NULL AS is_overridden,
        COALESCE(oi.overridden_by, ARRAY[]::TEXT[]) AS overridden_by
    FROM clause_chunks cc
    LEFT JOIN override_info oi ON cc.chunk_id = oi.chunk_id
    ORDER BY 
        cc.priority DESC,
        cc.effective_date DESC NULLS LAST,
        cc.sequence_number DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to validate clause references
CREATE OR REPLACE FUNCTION validate_clause_references(p_contract_id UUID)
RETURNS TABLE (
    reference_id UUID,
    source_clause TEXT,
    target_clause TEXT,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id AS reference_id,
        cr.source_clause_number AS source_clause,
        cr.target_clause_number AS target_clause,
        EXISTS (
            SELECT 1 FROM contract_document_chunks c
            WHERE c.contract_id = p_contract_id
              AND c.clause_number = cr.target_clause_number
        ) AS is_valid,
        CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM contract_document_chunks c
                WHERE c.contract_id = p_contract_id
                  AND c.clause_number = cr.target_clause_number
            ) THEN 'Target clause ' || cr.target_clause_number || ' not found in contract'
            ELSE NULL
        END AS error_message
    FROM clause_references cr
    WHERE cr.contract_id = p_contract_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to update document updated_at
CREATE OR REPLACE FUNCTION update_contract_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contract_documents_updated_at ON contract_documents;
CREATE TRIGGER trigger_update_contract_documents_updated_at
    BEFORE UPDATE ON contract_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_documents_updated_at();

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE contract_documents IS 'Stores metadata about uploaded contract documents organized by document group (A-N)';
COMMENT ON TABLE contract_document_chunks IS 'Stores chunked content from documents with optional vector embeddings for semantic search';
COMMENT ON TABLE clause_references IS 'Tracks cross-references between clauses across different documents';
COMMENT ON TABLE document_overrides IS 'Tracks which documents override others for contract priority logic';
COMMENT ON TABLE ingestion_jobs IS 'Tracks document processing jobs for status monitoring';

COMMENT ON COLUMN contract_documents.document_group IS 'Document category: A=Agreement, B=LOA, C=Conditions, D=Addendums, I=BOQ, N=Schedules';
COMMENT ON COLUMN contract_document_chunks.embedding IS 'Vector embedding (1536 dimensions) for semantic search using OpenAI text-embedding-3-small';
COMMENT ON COLUMN clause_references.reference_type IS 'Type of reference: mentions, overrides, supplements, cross_reference, defines, amends';
