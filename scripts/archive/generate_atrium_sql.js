/**
 * Generate SQL to rebuild Atrium contract
 */

import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./Atrium_GC_Contract.json', 'utf8'));

const contractId = crypto.randomUUID();
const now = new Date().toISOString();

const timestamp = Date.now();

let sql = `-- Rebuild Atrium Contract with General Conditions
-- Run this in Supabase SQL Editor
-- Generated: ${now}
-- Contract ID: ${contractId}
-- Total clauses: ${data.clauses.length}

-- Step 1: Delete existing Atrium contracts
DELETE FROM contract_items WHERE contract_id IN (SELECT id FROM contracts WHERE name ILIKE '%atrium%');
DELETE FROM contract_sections WHERE contract_id IN (SELECT id FROM contracts WHERE name ILIKE '%atrium%');
DELETE FROM contracts WHERE name ILIKE '%atrium%';

-- Step 2: Create new Atrium contract
INSERT INTO contracts (id, name, timestamp, metadata, uses_subcollections, created_at, updated_at) VALUES
  ('${contractId}', 'Atrium General Conditions', ${timestamp}, '{"source": "rebuild_script", "version": "1.0"}'::jsonb, true, '${now}', '${now}');

-- Step 3: Create sections
INSERT INTO contract_sections (contract_id, section_type, title) VALUES
  ('${contractId}', 'GENERAL', 'General Conditions'),
  ('${contractId}', 'PARTICULAR', 'Particular Conditions');

-- Step 4: Insert all ${data.clauses.length} General Condition clauses
INSERT INTO contract_items (contract_id, section_type, order_index, item_data) VALUES
`;

const clauseValues = data.clauses.map((clause, i) => {
  const itemData = {
    itemType: 'CLAUSE',
    clause_number: clause.clause_number,
    clause_title: clause.clause_title,
    clause_text: clause.clause_text || clause.general_condition || '',
    general_condition: clause.general_condition || clause.clause_text || '',
    particular_condition: '',
    condition_type: 'General',
    has_time_frame: clause.has_time_frame || false,
    time_frames: clause.time_frames || [],
    comparison: clause.comparison || [],
    orderIndex: i
  };
  
  // Escape single quotes in JSON by doubling them
  const jsonStr = JSON.stringify(itemData).replace(/'/g, "''");
  
  return `  ('${contractId}', 'GENERAL', ${i}, '${jsonStr}'::jsonb)`;
});

sql += clauseValues.join(',\n') + ';\n\n';

sql += `-- Step 5: Verification query (run after to verify)
SELECT COUNT(*) as clause_count FROM contract_items WHERE contract_id = '${contractId}';
SELECT item_data->>'clause_number' as num, item_data->>'clause_title' as title 
FROM contract_items 
WHERE contract_id = '${contractId}' 
ORDER BY order_index 
LIMIT 10;
`;

fs.writeFileSync('./scripts/rebuild_atrium_gc.sql', sql);
console.log('SQL file created: scripts/rebuild_atrium_gc.sql');
console.log('Contract ID:', contractId);
console.log('Total clauses:', data.clauses.length);
