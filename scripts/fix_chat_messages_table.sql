-- ============================================================
-- FIX: chat_messages table schema
-- Run this in Supabase Dashboard > SQL Editor > New query
-- 
-- Why: The chat passes both contract IDs and session IDs.
-- Changing contract_id from UUID -> TEXT eliminates the 400 Bad Request
-- and Foreign Key violation when saving chat messages.
-- ============================================================

-- 1. Drop foreign key constraint if present
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_contract_id_fkey;

-- 2. Change contract_id column type to TEXT
ALTER TABLE public.chat_messages ALTER COLUMN contract_id TYPE TEXT;

-- 3. Ensure user_id can be NULL for anonymous users
ALTER TABLE public.chat_messages ALTER COLUMN user_id DROP NOT NULL;

-- 4. Enable public read/write access
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access chat_messages" ON public.chat_messages;
CREATE POLICY "Allow public access chat_messages"
  ON public.chat_messages FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'chat_messages table fixed successfully!' AS status;
