-- ============================================================
-- STEP 3: Enable Public Read Access & Add Schema Safety
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Ensure is_deleted column exists on contracts (prevents column not found errors)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 2. Allow public read on contracts (both anon and authenticated)
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read contracts" ON public.contracts;
CREATE POLICY "Allow public read contracts"
  ON public.contracts FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Allow public read on contract_documents
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read contract_documents" ON public.contract_documents;
DROP POLICY IF EXISTS "Authenticated users manage contract_documents" ON public.contract_documents;
CREATE POLICY "Allow public read contract_documents"
  ON public.contract_documents FOR SELECT
  TO anon, authenticated
  USING (true);
CREATE POLICY "Authenticated users manage contract_documents"
  ON public.contract_documents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Allow public read on contract_document_chunks
ALTER TABLE public.contract_document_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read contract_document_chunks" ON public.contract_document_chunks;
DROP POLICY IF EXISTS "Authenticated users manage contract_document_chunks" ON public.contract_document_chunks;
CREATE POLICY "Allow public read contract_document_chunks"
  ON public.contract_document_chunks FOR SELECT
  TO anon, authenticated
  USING (true);
CREATE POLICY "Authenticated users manage contract_document_chunks"
  ON public.contract_document_chunks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. If clauses table exists, allow public read
DO $$ 
BEGIN 
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clauses') THEN
    ALTER TABLE public.clauses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public read clauses" ON public.clauses;
    CREATE POLICY "Allow public read clauses"
      ON public.clauses FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

SELECT 'Public read policies enabled successfully for contracts, documents, and chunks!' AS result;
