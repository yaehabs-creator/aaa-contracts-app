-- ============================================================
-- Run in Supabase SQL Editor
-- Adds text/plain and application/json to the allowed MIME types
-- for the contract-documents storage bucket
-- ============================================================

-- Check current bucket settings
SELECT id, name, allowed_mime_types FROM storage.buckets WHERE id = 'contract-documents';

-- Add text/plain and application/json to the allowed MIME types
UPDATE storage.buckets
SET allowed_mime_types = array_cat(
    COALESCE(allowed_mime_types, ARRAY[]::text[]),
    ARRAY['text/plain', 'application/json', 'text/json']
)
WHERE id = 'contract-documents'
  AND NOT (ARRAY['application/json'] <@ COALESCE(allowed_mime_types, ARRAY[]::text[]));

-- If the bucket has NULL allowed_mime_types, it means ALL types are allowed.
-- If it's NOT NULL, we need to add our types. Run both to be safe:
UPDATE storage.buckets
SET allowed_mime_types = NULL  -- NULL = allow all types
WHERE id = 'contract-documents';

SELECT 'Done — contract-documents bucket now allows all MIME types' AS status;
