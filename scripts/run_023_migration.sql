-- ============================================================
-- IDEMPOTENT version — safe to run multiple times
-- Run in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Table (already exists, this is a no-op)
CREATE TABLE IF NOT EXISTS json_data_sources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID REFERENCES contracts(id) ON DELETE CASCADE,
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

-- Indexes (no-ops if already exist)
CREATE INDEX IF NOT EXISTS idx_json_sources_contract
    ON json_data_sources(contract_id, is_active);

CREATE INDEX IF NOT EXISTS idx_json_sources_user
    ON json_data_sources(user_id, is_active);

-- RLS (no-op if already enabled)
ALTER TABLE json_data_sources ENABLE ROW LEVEL SECURITY;

-- Policies — drop first to avoid duplicate errors, then recreate
DROP POLICY IF EXISTS "Users can view their own json data sources" ON json_data_sources;
DROP POLICY IF EXISTS "Users can insert their own json data sources" ON json_data_sources;
DROP POLICY IF EXISTS "Users can update their own json data sources" ON json_data_sources;
DROP POLICY IF EXISTS "Users can delete their own json data sources" ON json_data_sources;

CREATE POLICY "Users can view their own json data sources"
    ON json_data_sources FOR SELECT
    USING (
        auth.uid() = user_id
        OR contract_id IN (
            SELECT id FROM contracts WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own json data sources"
    ON json_data_sources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own json data sources"
    ON json_data_sources FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own json data sources"
    ON json_data_sources FOR DELETE
    USING (auth.uid() = user_id);

SELECT 'json_data_sources setup complete!' AS status;
