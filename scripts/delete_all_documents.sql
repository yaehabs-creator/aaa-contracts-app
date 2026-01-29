-- ============================================
-- Delete ALL Documents from Database
-- Run this in Supabase SQL Editor
-- ============================================

-- WARNING: This will delete ALL documents from ALL contracts!
-- The CASCADE constraints will automatically delete:
-- - contract_document_chunks
-- - clause_references
-- - document_overrides
-- - ingestion_jobs (for the documents)

-- Step 1: Delete all ingestion jobs
DELETE FROM ingestion_jobs;

-- Step 2: Delete all document overrides
DELETE FROM document_overrides;

-- Step 3: Delete all clause references
DELETE FROM clause_references;

-- Step 4: Delete all document chunks (includes embeddings)
DELETE FROM contract_document_chunks;

-- Step 5: Delete all contract documents (main records)
DELETE FROM contract_documents;

-- Step 6: Verify deletion
SELECT 'contract_documents' as table_name, COUNT(*) as remaining FROM contract_documents
UNION ALL
SELECT 'contract_document_chunks', COUNT(*) FROM contract_document_chunks
UNION ALL
SELECT 'clause_references', COUNT(*) FROM clause_references
UNION ALL
SELECT 'document_overrides', COUNT(*) FROM document_overrides
UNION ALL
SELECT 'ingestion_jobs', COUNT(*) FROM ingestion_jobs;

-- Note: You also need to clear the storage bucket manually in Supabase Dashboard
-- Go to Storage > contract-documents > Select all > Delete
