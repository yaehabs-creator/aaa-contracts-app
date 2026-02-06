-- ATRIUM CONTRACT FULL BACKUP EXPORT
-- Run this in Supabase SQL Editor and copy the JSON result
-- Then save it as a .json file for local backup

-- Step 1: Get contract summary
SELECT 
    'ATRIUM CONTRACT SUMMARY' as info,
    c.id as contract_id,
    c.name as contract_name,
    c.created_at,
    c.updated_at,
    (SELECT COUNT(*) FROM contract_items WHERE contract_id = c.id) as total_clauses,
    (SELECT COUNT(*) FROM contract_items WHERE contract_id = c.id AND LENGTH(item_data->>'general_condition') > 0) as clauses_with_gc,
    (SELECT COUNT(*) FROM contract_items WHERE contract_id = c.id AND LENGTH(item_data->>'particular_condition') > 0) as clauses_with_pc
FROM contracts c
WHERE c.name ILIKE '%atrium%';

-- Step 2: Export full contract as JSON (run this separately)
SELECT jsonb_build_object(
    'exportDate', NOW(),
    'exportType', 'FULL_BACKUP',
    'contract', (
        SELECT row_to_json(c.*)
        FROM contracts c
        WHERE c.name ILIKE '%atrium%'
        LIMIT 1
    ),
    'sections', (
        SELECT jsonb_agg(row_to_json(s.*))
        FROM contract_sections s
        WHERE s.contract_id IN (SELECT id FROM contracts WHERE name ILIKE '%atrium%')
    ),
    'items', (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', ci.id,
                'contract_id', ci.contract_id,
                'section_type', ci.section_type,
                'order_index', ci.order_index,
                'item_data', ci.item_data,
                'created_at', ci.created_at
            )
            ORDER BY ci.order_index
        )
        FROM contract_items ci
        WHERE ci.contract_id IN (SELECT id FROM contracts WHERE name ILIKE '%atrium%')
    ),
    'stats', jsonb_build_object(
        'totalClauses', (SELECT COUNT(*) FROM contract_items WHERE contract_id IN (SELECT id FROM contracts WHERE name ILIKE '%atrium%')),
        'withGC', (SELECT COUNT(*) FROM contract_items WHERE contract_id IN (SELECT id FROM contracts WHERE name ILIKE '%atrium%') AND LENGTH(item_data->>'general_condition') > 0),
        'withPC', (SELECT COUNT(*) FROM contract_items WHERE contract_id IN (SELECT id FROM contracts WHERE name ILIKE '%atrium%') AND LENGTH(item_data->>'particular_condition') > 0),
        'withBoth', (SELECT COUNT(*) FROM contract_items WHERE contract_id IN (SELECT id FROM contracts WHERE name ILIKE '%atrium%') AND LENGTH(item_data->>'general_condition') > 0 AND LENGTH(item_data->>'particular_condition') > 0)
    )
) as full_backup;

-- Step 3: List all clauses with their content lengths (for verification)
SELECT 
    item_data->>'clause_number' as clause_num,
    item_data->>'clause_title' as clause_title,
    LENGTH(item_data->>'general_condition') as gc_chars,
    LENGTH(item_data->>'particular_condition') as pc_chars,
    item_data->>'condition_type' as type
FROM contract_items 
WHERE contract_id IN (SELECT id FROM contracts WHERE name ILIKE '%atrium%')
ORDER BY order_index;
