-- ============================================================
-- 023_json_data_sources.sql
-- Persistent JSON data sources for the AI Bot context system.
-- Users can upload JSON files and chat with them across sessions.
-- ============================================================

-- Main table: stores metadata and parsed content per upload
CREATE TABLE IF NOT EXISTS json_data_sources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID REFERENCES contracts(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,                        -- User-facing label (e.g. "Programme Data Q1")
    description     TEXT,                                 -- Optional description/purpose
    source_type     TEXT NOT NULL DEFAULT 'json',         -- 'json' | 'csv_as_json' | 'excel_as_json'
    storage_path    TEXT NOT NULL,                        -- Path in 'contract-documents' bucket
    public_url      TEXT,                                 -- Public URL if bucket is public
    parsed_content  JSONB,                                -- Full parsed JSON (up to size limit)
    content_summary TEXT,                                 -- Key-value summary for quick context injection
    row_count       INT,                                  -- Rows (for tabular data)
    key_fields      TEXT[],                               -- Top-level keys found in the JSON
    size_bytes      INT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,        -- Toggle off without deleting
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by contract
CREATE INDEX IF NOT EXISTS idx_json_sources_contract
    ON json_data_sources(contract_id, is_active);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_json_sources_user
    ON json_data_sources(user_id, is_active);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE json_data_sources ENABLE ROW LEVEL SECURITY;

-- Users can see their own data sources or those linked to contracts they can access
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
