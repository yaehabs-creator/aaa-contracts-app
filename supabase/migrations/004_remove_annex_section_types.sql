-- Remove ANNEX1 and ANNEX2 from section_type check constraints
-- This migration updates the check constraints to remove ANNEX section types
-- that are no longer supported in the application

-- Drop and recreate the check constraint for contract_sections
ALTER TABLE contract_sections 
  DROP CONSTRAINT IF EXISTS contract_sections_section_type_check;

ALTER TABLE contract_sections 
  ADD CONSTRAINT contract_sections_section_type_check 
  CHECK (section_type IN ('AGREEMENT', 'LOA', 'GENERAL', 'PARTICULAR'));

-- Drop and recreate the check constraint for contract_items
ALTER TABLE contract_items 
  DROP CONSTRAINT IF EXISTS contract_items_section_type_check;

ALTER TABLE contract_items 
  ADD CONSTRAINT contract_items_section_type_check 
  CHECK (section_type IN ('AGREEMENT', 'LOA', 'GENERAL', 'PARTICULAR'));

-- Optional: Delete any existing ANNEX1 or ANNEX2 sections and items
-- Uncomment the following lines if you want to clean up existing data:
-- DELETE FROM contract_items WHERE section_type IN ('ANNEX1', 'ANNEX2');
-- DELETE FROM contract_sections WHERE section_type IN ('ANNEX1', 'ANNEX2');
