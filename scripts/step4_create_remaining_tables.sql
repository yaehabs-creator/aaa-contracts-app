-- ============================================================
-- STEP 4: Create Remaining Tables (Knowledge, Clauses, Extracted Data, Chat)
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- This fixes the 404 / PGRST205 errors for:
--   - knowledge_items
--   - clauses
--   - contract_extracted_data
--   - chat_messages
-- ============================================================

-- 1. KNOWLEDGE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.knowledge_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB,
  size BIGINT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access knowledge_items" ON public.knowledge_items;
CREATE POLICY "Allow public access knowledge_items"
  ON public.knowledge_items FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. CLAUSES TABLE
CREATE TABLE IF NOT EXISTS public.clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  clause_number TEXT,
  clause_title TEXT,
  condition_type TEXT DEFAULT 'General',
  clause_text TEXT DEFAULT '',
  general_condition TEXT,
  particular_condition TEXT,
  comparison JSONB DEFAULT '[]'::jsonb,
  has_time_frame BOOLEAN DEFAULT false,
  time_frames JSONB DEFAULT '[]'::jsonb,
  financial_assets JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  chapter TEXT,
  section TEXT,
  gc_link_tokens JSONB,
  pc_link_tokens JSONB,
  is_hidden BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clauses_contract ON public.clauses(contract_id);
CREATE INDEX IF NOT EXISTS idx_clauses_order ON public.clauses(contract_id, order_index);

ALTER TABLE public.clauses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access clauses" ON public.clauses;
CREATE POLICY "Allow public access clauses"
  ON public.clauses FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. CONTRACT EXTRACTED DATA TABLE
CREATE TABLE IF NOT EXISTS public.contract_extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  document_id UUID,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extracted_contract ON public.contract_extracted_data(contract_id);

ALTER TABLE public.contract_extracted_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access contract_extracted_data" ON public.contract_extracted_data;
CREATE POLICY "Allow public access contract_extracted_data"
  ON public.contract_extracted_data FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  suggestions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_contract ON public.chat_messages(contract_id);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access chat_messages" ON public.chat_messages;
CREATE POLICY "Allow public access chat_messages"
  ON public.chat_messages FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Notify schema cache reload
NOTIFY pgrst, 'reload schema';

SELECT 'All remaining tables created successfully with public access!' AS status;
