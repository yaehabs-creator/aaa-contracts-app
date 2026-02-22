-- ============================================================
-- Run in Supabase SQL Editor
-- Fixes existing PDF files that might have been uploaded with 
-- incorrect MIME types (application/octet-stream), which 
-- forces the browser to download instead of preview.
-- ============================================================

-- 1. Check how many files are affected
SELECT COUNT(*) as affected_files
FROM storage.objects
WHERE bucket_id = 'contract-docs' 
  AND name LIKE '%.pdf'
  AND metadata->>'mimetype' = 'application/octet-stream';

-- 2. Update metadata for all PDF files in the contract-docs bucket
-- This sets the mimetype correctly so browsers will display them in the viewer
UPDATE storage.objects
SET metadata = metadata || '{"mimetype": "application/pdf", "contentType": "application/pdf"}'
WHERE bucket_id = 'contract-docs'
  AND name LIKE '%.pdf';

-- 3. Also fix Excel files while we are at it
UPDATE storage.objects
SET metadata = metadata || '{"mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}'
WHERE bucket_id = 'contract-docs'
  AND (name LIKE '%.xlsx' OR name LIKE '%.xls');

SELECT 'Done — Existing file MIME types have been corrected in storage.objects' AS status;
