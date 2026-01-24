-- Migration: Add RPC functions for creating clauses and update RLS policies
-- This enables the Admin Contract Editor to create new clauses with proper ordering

-- ============================================================================
-- PART 1: Update RLS Policies for contract_items
-- Restrict INSERT/UPDATE/DELETE to admin users only
-- ============================================================================

-- Drop existing permissive policy that allows all authenticated users to manage items
DROP POLICY IF EXISTS "Users can manage contract items" ON contract_items;

-- Keep the existing SELECT policy (or recreate if needed)
DROP POLICY IF EXISTS "Users can read contract items" ON contract_items;
CREATE POLICY "Users can read contract items" ON contract_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can insert new contract items
DROP POLICY IF EXISTS "Only admins can insert contract items" ON contract_items;
CREATE POLICY "Only admins can insert contract items" ON contract_items
  FOR INSERT WITH CHECK (is_admin());

-- Only admins can update contract items
DROP POLICY IF EXISTS "Only admins can update contract items" ON contract_items;
CREATE POLICY "Only admins can update contract items" ON contract_items
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Only admins can delete contract items
DROP POLICY IF EXISTS "Only admins can delete contract items" ON contract_items;
CREATE POLICY "Only admins can delete contract items" ON contract_items
  FOR DELETE USING (is_admin());

-- ============================================================================
-- PART 2: RPC Function to add a clause at the end of a contract/section
-- ============================================================================

CREATE OR REPLACE FUNCTION add_contract_item_end(
  p_contract_id UUID,
  p_section_type TEXT,
  p_category_id UUID DEFAULT NULL,
  p_item_data JSONB DEFAULT '{}'::JSONB
)
RETURNS contract_items
LANGUAGE plpgsql
SECURITY INVOKER  -- Uses caller's permissions (RLS will be checked)
AS $$
DECLARE
  v_max_order INTEGER;
  v_new_item contract_items;
  v_category_name TEXT;
BEGIN
  -- Validate section_type
  IF p_section_type NOT IN ('AGREEMENT', 'LOA', 'GENERAL', 'PARTICULAR') THEN
    RAISE EXCEPTION 'Invalid section_type: %. Must be one of: AGREEMENT, LOA, GENERAL, PARTICULAR', p_section_type;
  END IF;

  -- Get the maximum order_index for this contract and section_type
  SELECT COALESCE(MAX(order_index), -1) INTO v_max_order
  FROM contract_items
  WHERE contract_id = p_contract_id
    AND section_type = p_section_type;

  -- Get category name if category_id is provided
  IF p_category_id IS NOT NULL THEN
    SELECT name INTO v_category_name
    FROM contract_categories
    WHERE id = p_category_id;
    
    -- Add category name to item_data
    p_item_data := p_item_data || jsonb_build_object('category', v_category_name);
  END IF;

  -- Insert the new item with order_index = max + 1
  INSERT INTO contract_items (
    contract_id,
    section_type,
    order_index,
    category_id,
    item_data
  ) VALUES (
    p_contract_id,
    p_section_type,
    v_max_order + 1,
    p_category_id,
    p_item_data
  )
  RETURNING * INTO v_new_item;

  RETURN v_new_item;
END;
$$;

-- Grant execute permission to authenticated users
-- (RLS will still enforce admin-only for the actual INSERT)
GRANT EXECUTE ON FUNCTION add_contract_item_end(UUID, TEXT, UUID, JSONB) TO authenticated;

-- ============================================================================
-- PART 3: RPC Function to add a clause at a specific position (optional)
-- This shifts existing items to make room for the new one
-- ============================================================================

CREATE OR REPLACE FUNCTION add_contract_item_at_position(
  p_contract_id UUID,
  p_section_type TEXT,
  p_position INTEGER,  -- 0-based position where to insert
  p_category_id UUID DEFAULT NULL,
  p_item_data JSONB DEFAULT '{}'::JSONB
)
RETURNS contract_items
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_item contract_items;
  v_category_name TEXT;
  v_max_order INTEGER;
BEGIN
  -- Validate section_type
  IF p_section_type NOT IN ('AGREEMENT', 'LOA', 'GENERAL', 'PARTICULAR') THEN
    RAISE EXCEPTION 'Invalid section_type: %. Must be one of: AGREEMENT, LOA, GENERAL, PARTICULAR', p_section_type;
  END IF;

  -- Get max order to validate position
  SELECT COALESCE(MAX(order_index), -1) INTO v_max_order
  FROM contract_items
  WHERE contract_id = p_contract_id
    AND section_type = p_section_type;

  -- If position is beyond max, just append at end
  IF p_position > v_max_order + 1 THEN
    p_position := v_max_order + 1;
  END IF;

  -- Get category name if category_id is provided
  IF p_category_id IS NOT NULL THEN
    SELECT name INTO v_category_name
    FROM contract_categories
    WHERE id = p_category_id;
    
    p_item_data := p_item_data || jsonb_build_object('category', v_category_name);
  END IF;

  -- Shift existing items at and after the position
  UPDATE contract_items
  SET order_index = order_index + 1
  WHERE contract_id = p_contract_id
    AND section_type = p_section_type
    AND order_index >= p_position;

  -- Insert the new item at the specified position
  INSERT INTO contract_items (
    contract_id,
    section_type,
    order_index,
    category_id,
    item_data
  ) VALUES (
    p_contract_id,
    p_section_type,
    p_position,
    p_category_id,
    p_item_data
  )
  RETURNING * INTO v_new_item;

  RETURN v_new_item;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_contract_item_at_position(UUID, TEXT, INTEGER, UUID, JSONB) TO authenticated;

-- ============================================================================
-- PART 4: Helper function to get next order_index (useful for client-side)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_order_index(
  p_contract_id UUID,
  p_section_type TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_max_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_max_order
  FROM contract_items
  WHERE contract_id = p_contract_id
    AND section_type = p_section_type;

  RETURN v_max_order;
END;
$$;

GRANT EXECUTE ON FUNCTION get_next_order_index(UUID, TEXT) TO authenticated;
