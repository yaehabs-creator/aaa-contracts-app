-- Migration 024: AI Knowledge Files
-- Implements the global AI knowledge base for storing and searching JSON documents.

CREATE TABLE IF NOT EXISTS ai_knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                          -- User-friendly label
  description TEXT,                            -- Optional description
  original_filename TEXT NOT NULL,             -- Original .json filename
  file_path TEXT NOT NULL,                     -- Storage path: ai-knowledge/{filename}
  file_size INTEGER,                           -- Bytes
  content JSONB NOT NULL,                      -- Parsed JSON stored for fast AI access
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: authenticated users only
ALTER TABLE ai_knowledge_files ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to make it idempotent
DROP POLICY IF EXISTS "Authenticated users can manage knowledge files" ON ai_knowledge_files;

CREATE POLICY "Authenticated users can manage knowledge files"
  ON ai_knowledge_files FOR ALL TO authenticated USING (true);

-- Update storage bucket to allow JSON files if it's restricted
-- Standardizing bucket to 'contract-documents' from migration 021
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'application/json')
WHERE id = 'contract-documents' 
  AND NOT ('application/json' = ANY(allowed_mime_types));

UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'text/plain')
WHERE id = 'contract-documents' 
  AND NOT ('text/plain' = ANY(allowed_mime_types));
