-- Initial schema for Supabase migration from Firestore
-- Creates all necessary tables with proper indexes and constraints

-- Users table
CREATE TABLE IF NOT EXISTS users (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at BIGINT NOT NULL,
  created_by UUID REFERENCES users(uid),
  last_login BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  metadata JSONB NOT NULL,
  clauses JSONB, -- Legacy format, nullable
  sections JSONB, -- New format, nullable (for small contracts)
  uses_subcollections BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_timestamp ON contracts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_name ON contracts(name);
CREATE INDEX IF NOT EXISTS idx_contracts_uses_subcollections ON contracts(uses_subcollections);

-- Contract sections table (for subcollections/large contracts)
CREATE TABLE IF NOT EXISTS contract_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN ('AGREEMENT', 'LOA', 'GENERAL', 'PARTICULAR')),
  title TEXT NOT NULL,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, section_type)
);

CREATE INDEX IF NOT EXISTS idx_contract_sections_contract ON contract_sections(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_sections_type ON contract_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_contract_sections_contract_type ON contract_sections(contract_id, section_type);

-- Contract items table (for subcollections/large contracts)
CREATE TABLE IF NOT EXISTS contract_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN ('AGREEMENT', 'LOA', 'GENERAL', 'PARTICULAR')),
  order_index INTEGER NOT NULL,
  item_data JSONB NOT NULL, -- Stores entire SectionItem object
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, section_type, order_index)
);

CREATE INDEX IF NOT EXISTS idx_contract_items_contract ON contract_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_items_section ON contract_items(contract_id, section_type);
CREATE INDEX IF NOT EXISTS idx_contract_items_order ON contract_items(contract_id, section_type, order_index);

-- Activity logs table (optional audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(uid) ON DELETE SET NULL,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_contract ON activity_logs(contract_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
