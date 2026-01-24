-- Migration: Create contract_categories table for ordered category management
-- This enables the Admin Contract Editor to manage categories with proper ordering

-- Create contract_categories table
CREATE TABLE IF NOT EXISTS contract_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(uid),
  UNIQUE(contract_id, name)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_contract_categories_contract ON contract_categories(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_categories_order ON contract_categories(contract_id, order_index);

-- Add category_id to contract_items (nullable, references new table)
-- This allows clauses to be assigned to categories
ALTER TABLE contract_items ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES contract_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contract_items_category ON contract_items(category_id);

-- Enable Row Level Security
ALTER TABLE contract_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can read categories" ON contract_categories;
DROP POLICY IF EXISTS "Only admins can manage categories" ON contract_categories;
DROP POLICY IF EXISTS "Only admins can insert categories" ON contract_categories;
DROP POLICY IF EXISTS "Only admins can update categories" ON contract_categories;
DROP POLICY IF EXISTS "Only admins can delete categories" ON contract_categories;

-- RLS Policies for contract_categories
-- All authenticated users can read categories
CREATE POLICY "Authenticated users can read categories" ON contract_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can insert new categories
CREATE POLICY "Only admins can insert categories" ON contract_categories
  FOR INSERT WITH CHECK (is_admin());

-- Only admins can update categories
CREATE POLICY "Only admins can update categories" ON contract_categories
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Only admins can delete categories
CREATE POLICY "Only admins can delete categories" ON contract_categories
  FOR DELETE USING (is_admin());

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_contract_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_contract_categories_updated_at ON contract_categories;
CREATE TRIGGER trigger_update_contract_categories_updated_at
  BEFORE UPDATE ON contract_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_categories_updated_at();
