-- Migration 021: Fix Storage Setup for Contract Documents
-- This migration standardizes the bucket name to 'contract-documents' and applies correct RLS policies.

-- 1. Create the bucket if it doesn't exist
-- Note: We use ON CONFLICT to avoid errors if it exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-documents', 
  'contract-documents', 
  false, 
  52428800, -- 50MB
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Clean up any old policies for the misspelled bucket 'contract-docs' (if they exist)
DROP POLICY IF EXISTS "Authenticated users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract documents" ON storage.objects;

-- 3. Create fresh policies for 'contract-documents'

CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-documents');

CREATE POLICY "Allow authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-documents');

CREATE POLICY "Allow authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-documents');

CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-documents');

SELECT 'Storage standardized to contract-documents with corrected RLS' AS status;
