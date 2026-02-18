-- Migration: 020_add_doc_fields_to_extracted_data.sql
-- Adds support for PDF document URLs and names in the extracted data table.

-- 1. Add columns if they don't exist
ALTER TABLE contract_extracted_data ADD COLUMN IF NOT EXISTS doc_url TEXT;
ALTER TABLE contract_extracted_data ADD COLUMN IF NOT EXISTS doc_name TEXT;

-- 2. Notify PostgREST to refresh its schema cache (optional but helpful)
NOTIFY pgrst, 'reload schema';
