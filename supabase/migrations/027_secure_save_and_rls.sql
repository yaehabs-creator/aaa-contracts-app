-- Migration: 027_secure_save_and_rls.sql
-- Fixes unintended deletions in save_contract_v2 and tightens RLS for sections/items.

-- 1. Update save_contract_v2 with safety checks
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
  v_contractor_id UUID;
  v_contractor_name TEXT;
BEGIN
  -- 1. Extract contract ID
  v_contract_id := (p_contract_data->>'id')::UUID;
  IF v_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract ID is required';
  END IF;

  -- 2. Safely handle contractor_id/name
  BEGIN
    v_contractor_id := (p_contract_data->>'contractor_id')::UUID;
    v_contractor_name := p_contract_data->>'contractor_name';
  EXCEPTION WHEN OTHERS THEN
    v_contractor_id := NULL;
    v_contractor_name := p_contract_data->>'contractor_id';
  END;

  -- 3. Check current version
  SELECT version INTO v_current_version FROM contracts WHERE id = v_contract_id;

  IF v_current_version IS NOT NULL THEN
    IF p_expected_version IS NOT NULL AND v_current_version != p_expected_version THEN
      RETURN jsonb_build_object(
        'status', 'conflict',
        'message', 'Version mismatch. Client version: ' || p_expected_version || ', Server version: ' || v_current_version,
        'current_version', v_current_version
      );
    END IF;
    v_new_version := v_current_version + 1;
  ELSE
    v_new_version := 1;
  END IF;

  -- 4. Upsert main contract record
  INSERT INTO contracts (
    id, name, title, project_id, contractor_id, contractor_name, 
    contract_number, status, start_date, end_date, currency, value, 
    scope_text, timestamp, metadata, version, uses_subcollections, 
    updated_at, created_by
  ) VALUES (
    v_contract_id,
    p_contract_data->>'name',
    COALESCE(p_contract_data->>'title', p_contract_data->>'name'),
    (p_contract_data->>'project_id')::UUID,
    v_contractor_id,
    v_contractor_name,
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
    contractor_name = EXCLUDED.contractor_name,
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

  -- 5. Audit Log
  INSERT INTO activity_logs (action, contract_id, user_id, details)
  VALUES (
    CASE WHEN v_current_version IS NULL THEN 'CREATE_CONTRACT' ELSE 'UPDATE_CONTRACT' END,
    v_contract_id,
    auth.uid(),
    jsonb_build_object('version', v_new_version, 'title', p_contract_data->>'title')
  );

  -- 6. Handle Sections and Items ONLY if provided
  -- SAFEGUARD: If sections are missing or empty in p_contract_data, DO NOT delete existing sections.
  -- This prevents unintended wipes on partial saves.
  IF p_contract_data ? 'sections' AND jsonb_typeof(p_contract_data->'sections') = 'array' AND jsonb_array_length(p_contract_data->'sections') > 0 THEN
    DELETE FROM contract_sections WHERE contract_id = v_contract_id;
    -- contract_items will be deleted via CASCADE from contract_sections (or explicitly if needed)
    -- Actually, migration 015 didn't have CASCADE on contract_sections for items. 
    -- Let's be explicit to avoid "zombie" items.
    DELETE FROM contract_items WHERE contract_id = v_contract_id;

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

-- 2. Tighten RLS for contract_sections and contract_items
-- Ensure users can only modify sections/items if they have access to the parent contract

DROP POLICY IF EXISTS "Users can manage contract sections" ON contract_sections;
CREATE POLICY "Users can manage contract sections" ON contract_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_sections.contract_id 
      AND auth.uid() IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can manage contract items" ON contract_items;
CREATE POLICY "Users can manage contract items" ON contract_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_items.contract_id 
      AND auth.uid() IS NOT NULL
    )
  );
