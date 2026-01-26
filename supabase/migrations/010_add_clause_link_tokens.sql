
-- Add columns for storing clause reference hyperlink tokens
ALTER TABLE contract_items
ADD COLUMN IF NOT EXISTS gc_link_tokens JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pc_link_tokens JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS links_updated_at TIMESTAMPTZ DEFAULT NULL;
