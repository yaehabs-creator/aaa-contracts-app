-- ============================================================
-- STEP 2: Create Contract Documents & Chunks Tables
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. contract_documents: One row per document (LOA, GC, PC, etc.)
CREATE TABLE IF NOT EXISTS public.contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  document_group TEXT NOT NULL DEFAULT 'C',   -- C = Conditions, L = LoA, etc.
  name TEXT NOT NULL,
  original_filename TEXT,
  file_path TEXT,
  file_type TEXT DEFAULT 'json',
  page_count INTEGER,
  sequence_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'completed',
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  processing_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, document_group, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_cdocs_contract ON public.contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_cdocs_group ON public.contract_documents(contract_id, document_group);

ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage contract_documents" ON public.contract_documents;
CREATE POLICY "Authenticated users manage contract_documents"
  ON public.contract_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. contract_document_chunks: The actual searchable text, one chunk per clause/page
CREATE TABLE IF NOT EXISTS public.contract_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.contract_documents(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT,
  content_type TEXT DEFAULT 'text',
  clause_number TEXT,
  clause_title TEXT,
  page_number INTEGER,
  token_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_contract ON public.contract_document_chunks(contract_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON public.contract_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_clause ON public.contract_document_chunks(contract_id, clause_number);

ALTER TABLE public.contract_document_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage contract_document_chunks" ON public.contract_document_chunks;
CREATE POLICY "Authenticated users manage contract_document_chunks"
  ON public.contract_document_chunks FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT 'Tables created successfully!' AS status;
