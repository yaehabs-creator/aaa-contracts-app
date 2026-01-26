-- PART 1: Create Atrium Contract and Sections
-- Run this FIRST in Supabase SQL Editor
-- Contract ID: cfb1883c-bf70-410d-afe2-8273467ea099

-- Step 1: Delete existing Atrium contracts
DELETE FROM contract_items WHERE contract_id IN (SELECT id FROM contracts WHERE name ILIKE '%atrium%');
DELETE FROM contract_sections WHERE contract_id IN (SELECT id FROM contracts WHERE name ILIKE '%atrium%');
DELETE FROM contracts WHERE name ILIKE '%atrium%';

-- Step 2: Create new Atrium contract
INSERT INTO contracts (id, name, timestamp, metadata, uses_subcollections, created_at, updated_at) VALUES
  ('cfb1883c-bf70-410d-afe2-8273467ea099', 'Atrium General Conditions', 1769433774179, '{"source": "rebuild_script", "version": "1.0"}'::jsonb, true, '2026-01-26T13:22:54.177Z', '2026-01-26T13:22:54.177Z');

-- Step 3: Create sections
INSERT INTO contract_sections (contract_id, section_type, title) VALUES
  ('cfb1883c-bf70-410d-afe2-8273467ea099', 'GENERAL', 'General Conditions'),
  ('cfb1883c-bf70-410d-afe2-8273467ea099', 'PARTICULAR', 'Particular Conditions');

-- Verify contract created
SELECT id, name FROM contracts WHERE id = 'cfb1883c-bf70-410d-afe2-8273467ea099';
