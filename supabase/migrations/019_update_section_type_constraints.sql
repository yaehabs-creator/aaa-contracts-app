-- Migration: 019_update_section_type_constraints.sql
-- Updates the check constraints on contract_sections and contract_items 
-- to allow all section types defined in the application.

-- 1. Drop and recreate the check constraint for contract_sections
ALTER TABLE contract_sections 
  DROP CONSTRAINT IF EXISTS contract_sections_section_type_check;

ALTER TABLE contract_sections 
  ADD CONSTRAINT contract_sections_section_type_check 
  CHECK (section_type IN (
    'AGREEMENT', 
    'LOA', 
    'TENDER', 
    'GENERAL', 
    'PARTICULAR', 
    'REQUIREMENTS', 
    'PROPOSAL', 
    'DRAWINGS', 
    'SPECIFICATION', 
    'ADDENDUM', 
    'BOQ', 
    'SCHEDULE', 
    'ANNEX', 
    'AUTOMATION', 
    'INSTRUCTION', 
    'EXTRAS'
  ));

-- 2. Drop and recreate the check constraint for contract_items
ALTER TABLE contract_items 
  DROP CONSTRAINT IF EXISTS contract_items_section_type_check;

ALTER TABLE contract_items 
  ADD CONSTRAINT contract_items_section_type_check 
  CHECK (section_type IN (
    'AGREEMENT', 
    'LOA', 
    'TENDER', 
    'GENERAL', 
    'PARTICULAR', 
    'REQUIREMENTS', 
    'PROPOSAL', 
    'DRAWINGS', 
    'SPECIFICATION', 
    'ADDENDUM', 
    'BOQ', 
    'SCHEDULE', 
    'ANNEX', 
    'AUTOMATION', 
    'INSTRUCTION', 
    'EXTRAS'
  ));

-- 3. Cleanup: If there are any stray rows with old/incorrect types, they can be migrated or deleted here.
-- No ANNEX1/ANNEX2 migration needed as they were already handled in migration 004,
-- but we ensure the constraint matches the full enum now.