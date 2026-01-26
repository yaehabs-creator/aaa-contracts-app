/**
 * Generate SQL to rebuild Atrium contract - SPLIT into multiple files
 */

import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./Atrium_GC_Contract.json', 'utf8'));

const contractId = 'cfb1883c-bf70-410d-afe2-8273467ea099'; // Fixed ID
const now = new Date().toISOString();
const timestamp = Date.now();

// Part 1: Contract and Sections
let sql1 = `-- PART 1: Create Atrium Contract and Sections
-- Run this FIRST in Supabase SQL Editor
-- Contract ID: ${contractId}

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

-- Verify contract created
SELECT id, name FROM contracts WHERE id = '${contractId}';
`;

fs.writeFileSync('./scripts/atrium_part1_contract.sql', sql1);
console.log('Part 1 created: scripts/atrium_part1_contract.sql');

// Part 2: First half of clauses (0-87)
const firstHalf = data.clauses.slice(0, 88);
let sql2 = `-- PART 2: Insert Atrium Clauses (1-88)
-- Run this AFTER Part 1
-- Contract ID: ${contractId}

INSERT INTO contract_items (contract_id, section_type, order_index, item_data) VALUES
`;

const clauseValues2 = firstHalf.map((clause, i) => {
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
  const jsonStr = JSON.stringify(itemData).replace(/'/g, "''");
  return `  ('${contractId}', 'GENERAL', ${i}, '${jsonStr}'::jsonb)`;
});

sql2 += clauseValues2.join(',\n') + ';\n\n';
sql2 += `-- Verify: Should show 88 clauses\nSELECT COUNT(*) FROM contract_items WHERE contract_id = '${contractId}';\n`;

fs.writeFileSync('./scripts/atrium_part2_clauses1.sql', sql2);
console.log('Part 2 created: scripts/atrium_part2_clauses1.sql (clauses 1-88)');

// Part 3: Second half of clauses (88-175)
const secondHalf = data.clauses.slice(88);
let sql3 = `-- PART 3: Insert Atrium Clauses (89-176)
-- Run this AFTER Part 2
-- Contract ID: ${contractId}

INSERT INTO contract_items (contract_id, section_type, order_index, item_data) VALUES
`;

const clauseValues3 = secondHalf.map((clause, i) => {
  const actualIndex = 88 + i;
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
    orderIndex: actualIndex
  };
  const jsonStr = JSON.stringify(itemData).replace(/'/g, "''");
  return `  ('${contractId}', 'GENERAL', ${actualIndex}, '${jsonStr}'::jsonb)`;
});

sql3 += clauseValues3.join(',\n') + ';\n\n';
sql3 += `-- Final verification: Should show 176 clauses\nSELECT COUNT(*) as total_clauses FROM contract_items WHERE contract_id = '${contractId}';\n`;
sql3 += `SELECT item_data->>'clause_number' as num, item_data->>'clause_title' as title FROM contract_items WHERE contract_id = '${contractId}' ORDER BY order_index LIMIT 10;\n`;

fs.writeFileSync('./scripts/atrium_part3_clauses2.sql', sql3);
console.log('Part 3 created: scripts/atrium_part3_clauses2.sql (clauses 89-176)');

console.log('\n=== Instructions ===');
console.log('Run these SQL files in Supabase SQL Editor in ORDER:');
console.log('1. atrium_part1_contract.sql (creates contract + sections)');
console.log('2. atrium_part2_clauses1.sql (inserts clauses 1-88)');
console.log('3. atrium_part3_clauses2.sql (inserts clauses 89-176)');
console.log('\nContract ID:', contractId);
console.log('Total clauses:', data.clauses.length);
