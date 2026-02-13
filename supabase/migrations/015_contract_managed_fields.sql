-- Migration: 015_contract_managed_fields.sql
-- Adds robust fields for contract management and updates the save RPC with version checking.

-- 1. Add new columns to contracts table if they don't exist
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD COLUMN IF NOT EXISTS contractor_id UUID,
ADD COLUMN IF NOT EXISTS contract_number TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS currency TEXT,
ADD COLUMN IF NOT EXISTS value NUMERIC,
ADD COLUMN IF NOT EXISTS scope_text TEXT,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Update existing rows to have a title if null (fallback to name)
UPDATE contracts SET title = name WHERE title IS NULL;

-- 3. Create a wrapper function or update save_full_contract
-- We'll create a NEW version of the RPC that supports version checking
CREATE OR REPLACE FUNCTION save_contract_v2(
  p_contract_data JSONB,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_contract_id UUID;
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_section_record RECORD;
BEGIN
  -- 1. Extract contract ID
  v_contract_id := (p_contract_data->>'id')::UUID;
  IF v_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract ID is required';
  END IF;

  -- 2. Check current version for optimistic concurrency
  SELECT version INTO v_current_version FROM contracts WHERE id = v_contract_id;

  IF v_current_version IS NOT NULL THEN
    -- Update flow
    IF p_expected_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object(
        'status', 'conflict',
        'message', 'Version mismatch. Client version: ' || p_expected_version || ', Server version: ' || v_current_version,
        'current_version', v_current_version
      );
    END IF;
    v_new_version := v_current_version + 1;
  ELSE
    -- Create flow
    v_new_version := 1;
  END IF;

  -- 3. Upsert main contract record
  INSERT INTO contracts (
    id, 
    name, 
    title,
    project_id,
    contractor_id,
    contract_number,
    status,
    start_date,
    end_date,
    currency,
    value,
    scope_text,
    timestamp, 
    metadata, 
    version,
    uses_subcollections, 
    updated_at,
    created_by
  ) VALUES (
    v_contract_id,
    p_contract_data->>'name',
    COALESCE(p_contract_data->>'title', p_contract_data->>'name'),
    (p_contract_data->>'project_id')::UUID,
    (p_contract_data->>'contractor_id')::UUID,
    p_contract_data->>'contract_number',
    COALESCE(p_contract_data->>'status', 'draft'),
    (p_contract_data->>'start_date')::DATE,
    (p_contract_data->>'end_date')::DATE,
    p_contract_data->>'currency',
    (p_contract_data->>'value')::NUMERIC,
    p_contract_data->>'scope_text',
    (p_contract_data->>'timestamp')::BIGINT,
    COALESCE(p_contract_data->'metadata', '{}'::JSONB),
    v_new_version,
    TRUE,
    NOW(),
    auth.uid()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    title = EXCLUDED.title,
    project_id = EXCLUDED.project_id,
    contractor_id = EXCLUDED.contractor_id,
    contract_number = EXCLUDED.contract_number,
    status = EXCLUDED.status,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    currency = EXCLUDED.currency,
    value = EXCLUDED.value,
    scope_text = EXCLUDED.scope_text,
    timestamp = EXCLUDED.timestamp,
    metadata = EXCLUDED.metadata,
    version = v_new_version,
    updated_at = NOW();

  -- 4. Audit Log
  INSERT INTO activity_logs (action, contract_id, user_id, details)
  VALUES (
    CASE WHEN v_current_version IS NULL THEN 'CREATE_CONTRACT' ELSE 'UPDATE_CONTRACT' END,
    v_contract_id,
    auth.uid(),
    jsonb_build_object('version', v_new_version, 'title', p_contract_data->>'title')
  );

  -- 5. Handle Sections and Items (same logic as v1)
  DELETE FROM contract_sections WHERE contract_id = v_contract_id;

  IF p_contract_data ? 'sections' AND jsonb_typeof(p_contract_data->'sections') = 'array' THEN
    FOR v_section_record IN 
      SELECT 
        (value->>'sectionType') as s_type,
        (value->>'title') as s_title,
        (value->'items') as s_items
      FROM jsonb_array_elements(p_contract_data->'sections')
    LOOP
      INSERT INTO contract_sections (contract_id, section_type, title, item_count)
      VALUES (v_contract_id, v_section_record.s_type, v_section_record.s_title, jsonb_array_length(v_section_record.s_items));

      IF v_section_record.s_items IS NOT NULL AND jsonb_typeof(v_section_record.s_items) = 'array' THEN
        INSERT INTO contract_items (contract_id, section_type, order_index, item_data)
        SELECT v_contract_id, v_section_record.s_type, (ordinality - 1)::INTEGER, value
        FROM jsonb_array_elements(v_section_record.s_items) WITH ORDINALITY;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'id', v_contract_id, 
    'status', 'success',
    'version', v_new_version,
    'timestamp', EXTRACT(EPOCH FROM NOW()) * 1000
  );
END;
$$;

GRANT EXECUTE ON FUNCTION save_contract_v2(JSONB, INTEGER) TO authenticated;
