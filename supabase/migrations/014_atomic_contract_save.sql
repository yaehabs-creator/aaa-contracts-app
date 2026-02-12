-- Migration: Atomic Contract Save RPC
-- This function ensures that a contract and all its sections/items are saved in a single transaction.
-- This prevents partial data loss if a network error occurs during a multi-step save.

CREATE OR REPLACE FUNCTION save_full_contract(
  p_contract_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER -- Use caller's permissions (Admins only via RLS)
AS $$
DECLARE
  v_contract_id UUID;
  v_section_record RECORD;
  v_item_record RECORD;
BEGIN
  -- 1. Extract contract ID and validate
  v_contract_id := (p_contract_data->>'id')::UUID;
  IF v_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract ID is required';
  END IF;

  -- 2. Upsert main contract record (Metadata only)
  INSERT INTO contracts (
    id, 
    name, 
    timestamp, 
    metadata, 
    uses_subcollections, 
    updated_at
  ) VALUES (
    v_contract_id,
    p_contract_data->>'name',
    (p_contract_data->>'timestamp')::BIGINT,
    COALESCE(p_contract_data->'metadata', '{}'::JSONB),
    TRUE, -- Always use subcollections for contracts saved via this RPC
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    timestamp = EXCLUDED.timestamp,
    metadata = EXCLUDED.metadata,
    uses_subcollections = TRUE,
    updated_at = NOW();

  -- 3. Handle Sections and Items
  -- We delete everything first to ensure we don't have stray data from re-ordering or deletion
  -- Because of ON DELETE CASCADE on contract_sections -> contract_items, we only need to delete sections
  DELETE FROM contract_sections WHERE contract_id = v_contract_id;

  -- 4. Bulk insert sections if provided
  IF p_contract_data ? 'sections' AND jsonb_typeof(p_contract_data->'sections') = 'array' THEN
    -- Insert sections and shred items
    FOR v_section_record IN 
      SELECT 
        (value->>'sectionType') as s_type,
        (value->>'title') as s_title,
        (value->'items') as s_items
      FROM jsonb_array_elements(p_contract_data->'sections')
    LOOP
      -- Insert the section
      INSERT INTO contract_sections (
        contract_id, 
        section_type, 
        title, 
        item_count
      ) VALUES (
        v_contract_id,
        v_section_record.s_type,
        v_section_record.s_title,
        jsonb_array_length(v_section_record.s_items)
      );

      -- Shred and insert items for this section
      IF v_section_record.s_items IS NOT NULL AND jsonb_typeof(v_section_record.s_items) = 'array' THEN
        INSERT INTO contract_items (
          contract_id,
          section_type,
          order_index,
          item_data
        )
        SELECT 
          v_contract_id,
          v_section_record.s_type,
          (ordinality - 1)::INTEGER, -- 0-based index
          value
        FROM jsonb_array_elements(v_section_record.s_items) WITH ORDINALITY;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'id', v_contract_id, 
    'status', 'success',
    'timestamp', EXTRACT(EPOCH FROM NOW()) * 1000
  );
END;
$$;

-- Grant execute permission to authenticated users
-- RLS on the underlying tables will still be respected
GRANT EXECUTE ON FUNCTION save_full_contract(JSONB) TO authenticated;
