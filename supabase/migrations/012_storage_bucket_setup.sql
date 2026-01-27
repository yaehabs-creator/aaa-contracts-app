-- Migration 012: Storage Bucket Setup for Contract Documents
-- Run this in Supabase SQL Editor after creating the 'contract-docs' bucket

-- Create storage bucket if it doesn't exist (run in Supabase Dashboard -> Storage first)
-- The bucket should be named: contract-docs

-- Storage policies for contract-docs bucket

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload contract documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contract-docs');

-- Allow authenticated users to read their files
CREATE POLICY "Authenticated users can read contract documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-docs');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update contract documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contract-docs');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete contract documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contract-docs');

-- Note: To create the bucket, go to Supabase Dashboard -> Storage -> New Bucket
-- Name: contract-docs
-- Public: No (unchecked)
-- File size limit: 100 MB

SELECT 'Storage policies created for contract-docs bucket' AS status;
