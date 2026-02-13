-- Migration: 016_contract_organizer_tables.sql
-- Infrastructure for the Contract Organizer tab: templates, subfolders, and schema-based data extraction.

-- 1. Contract Templates
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Subfolders within Top-Level Folders (A-P)
CREATE TABLE IF NOT EXISTS contract_subfolders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES contract_templates(id) ON DELETE CASCADE,
  folder_code TEXT NOT NULL CHECK (folder_code IN ('A', 'B', 'C', 'D', 'I', 'N', 'P')),
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, folder_code, name)
);

-- 3. Required Data Fields (Schema Builder) per Subfolder
CREATE TABLE IF NOT EXISTS contract_folder_schema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subfolder_id UUID REFERENCES contract_subfolders(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'date', 'number', 'currency', 'select', 'boolean', 'list', 'object')),
  required BOOLEAN DEFAULT FALSE,
  allowed_values JSONB, -- For 'select' or 'list'
  help_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subfolder_id, key)
);

-- 4. Extracted Contract Data
CREATE TABLE IF NOT EXISTS contract_extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  doc_id UUID, -- Link to document in storage/documents table if exists
  subfolder_id UUID REFERENCES contract_subfolders(id) ON DELETE SET NULL,
  field_key TEXT NOT NULL,
  value JSONB,
  confidence FLOAT DEFAULT 0.0,
  evidence JSONB, -- { "page": 1, "snippet": "..." }
  status TEXT CHECK (status IN ('extracted', 'missing', 'uncertain')),
  is_modified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, subfolder_id, field_key)
);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subfolders_template ON contract_subfolders(template_id);
CREATE INDEX IF NOT EXISTS idx_subfolders_code ON contract_subfolders(folder_code);
CREATE INDEX IF NOT EXISTS idx_schema_subfolder ON contract_folder_schema(subfolder_id);
CREATE INDEX IF NOT EXISTS idx_extracted_contract ON contract_extracted_data(contract_id);
CREATE INDEX IF NOT EXISTS idx_extracted_subfolder ON contract_extracted_data(subfolder_id);

-- 6. Insert Default FIDIC Template
INSERT INTO contract_templates (id, name, description, is_default)
VALUES ('7f23c9a0-1234-4567-890a-bcdef1234567', 'Standard FIDIC Template', 'Base folder structure for FIDIC contracts A-P', TRUE)
ON CONFLICT (id) DO NOTHING;
