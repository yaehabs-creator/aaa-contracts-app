-- ============================================================
-- AAA Contract Department - Complete Database Setup
-- Run this in Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. USERS TABLE (Required by SupabaseUserRepository & Domain Model)
CREATE TABLE IF NOT EXISTS public.users (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  created_by UUID REFERENCES public.users(uid),
  last_login BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read users" ON public.users;
CREATE POLICY "Allow authenticated read users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated update users" ON public.users;
CREATE POLICY "Allow authenticated update users"
  ON public.users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated insert users" ON public.users;
CREATE POLICY "Allow authenticated insert users"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete users" ON public.users;
CREATE POLICY "Allow authenticated delete users"
  ON public.users FOR DELETE
  TO authenticated
  USING (true);

-- Trigger to automatically create user record when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (uid, email, display_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    (extract(epoch from now()) * 1000)::bigint
  )
  ON CONFLICT (uid) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill profile for Abdelrhman Ehab
INSERT INTO public.users (uid, email, display_name, role, created_at)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'display_name', 'Abdelrhman Ehab'), 
  'admin',
  (extract(epoch from now()) * 1000)::bigint
FROM auth.users
WHERE email = 'yaehabs@gmail.com'
ON CONFLICT (uid) DO UPDATE SET role = 'admin', display_name = 'Abdelrhman Ehab';

-- Profiles compatibility view (so any legacy profiles queries also succeed)
CREATE OR REPLACE VIEW public.profiles AS
SELECT 
  uid AS id,
  email,
  display_name,
  role,
  to_timestamp(created_at / 1000) AS created_at,
  CASE WHEN last_login IS NOT NULL THEN to_timestamp(last_login / 1000) ELSE NULL END AS last_login
FROM public.users;

-- 2. CONTRACTS TABLE
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  metadata JSONB NOT NULL,
  clauses JSONB,
  sections JSONB,
  uses_subcollections BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_timestamp ON public.contracts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_name ON public.contracts(name);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read contracts" ON public.contracts;
CREATE POLICY "Authenticated users can read contracts" ON public.contracts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can create contracts" ON public.contracts;
CREATE POLICY "Authenticated users can create contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON public.contracts;
CREATE POLICY "Authenticated users can update contracts" ON public.contracts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON public.contracts;
CREATE POLICY "Authenticated users can delete contracts" ON public.contracts FOR DELETE TO authenticated USING (true);

-- 3. CONTRACT SECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.contract_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  title TEXT NOT NULL,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, section_type)
);

ALTER TABLE public.contract_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage contract sections" ON public.contract_sections;
CREATE POLICY "Authenticated users manage contract sections" ON public.contract_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. CONTRACT ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.contract_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  item_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, section_type, order_index)
);

ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage contract items" ON public.contract_items;
CREATE POLICY "Authenticated users manage contract items" ON public.contract_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated users manage activity logs" ON public.activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. JSON DATA SOURCES TABLE
CREATE TABLE IF NOT EXISTS public.json_data_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  source_type     TEXT NOT NULL DEFAULT 'json',
  storage_path    TEXT NOT NULL,
  public_url      TEXT,
  parsed_content  JSONB,
  content_summary TEXT,
  row_count       INT,
  key_fields      TEXT[],
  size_bytes      INT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.json_data_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage json data sources" ON public.json_data_sources;
CREATE POLICY "Authenticated users manage json data sources" ON public.json_data_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);
