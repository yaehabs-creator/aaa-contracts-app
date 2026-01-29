/**
 * Generate SQL Script for Atrium Document Ingestion
 * Simple version without overlap to avoid memory issues
 */

import { readFileSync, writeFileSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const OUTPUT_FILE = join(PROJECT_ROOT, 'scripts', 'atrium-documents-data.sql');

const ATRIUM_CONTRACT_ID = 'f8edad2c-e752-440a-bf84-0627eedb69fd';

// Escape SQL
function esc(str) {
  if (!str) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
}

// Hash
function hash(s) {
  let h = 0;
  for (let i = 0; i < Math.min(s.length, 200); i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h).toString(16).padStart(8, '0');
}

console.log('Generating SQL for Atrium Documents\n');

// Read GC text
const gcText = readFileSync(join(PROJECT_ROOT, 'contract_import_debug/cleanText_GC.txt'), 'utf-8');
console.log('GC text:', gcText.length, 'chars');

// Read PC text
const pcText = readFileSync(join(PROJECT_ROOT, 'contract_import_debug/cleanText_PC.txt'), 'utf-8');
console.log('PC text:', pcText.length, 'chars');

// Simple chunking - no overlap
function chunk(text, size = 5000) {
  const result = [];
  for (let i = 0; i < text.length; i += size) {
    const c = text.substring(i, i + size).trim();
    if (c.length > 50) result.push(c);
  }
  return result;
}

const gcChunks = chunk(gcText);
const pcChunks = chunk(pcText);
console.log('GC chunks:', gcChunks.length);
console.log('PC chunks:', pcChunks.length);

// Build SQL
const timestamp = Date.now();
let sql = `-- Atrium Document Ingestion SQL
-- Generated: ${new Date().toISOString()}
-- Contract: ${ATRIUM_CONTRACT_ID}

-- First, ensure the contract exists in the contracts table
INSERT INTO contracts (id, name, timestamp, metadata, created_at, updated_at)
VALUES (
    '${ATRIUM_CONTRACT_ID}',
    'Atrium GC (General Conditions)',
    ${timestamp},
    '{"type": "FIDIC", "project": "Atrium"}'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = NOW();

-- General Conditions
INSERT INTO contract_documents (contract_id, document_group, name, original_filename, file_path, file_type, page_count, sequence_number, status)
VALUES ('${ATRIUM_CONTRACT_ID}', 'C', 'General Conditions', 'C001_General_Conditions.pdf', 'contracts/${ATRIUM_CONTRACT_ID}/C/C001_General_Conditions.pdf', 'pdf', 39, 1, 'completed')
ON CONFLICT (contract_id, document_group, sequence_number) DO UPDATE SET name = EXCLUDED.name, status = 'completed', updated_at = NOW();

-- Particular Conditions  
INSERT INTO contract_documents (contract_id, document_group, name, original_filename, file_path, file_type, page_count, sequence_number, status)
VALUES ('${ATRIUM_CONTRACT_ID}', 'C', 'Particular Conditions', 'C002_Particular_Conditions.pdf', 'contracts/${ATRIUM_CONTRACT_ID}/C/C002_Particular_Conditions.pdf', 'pdf', 15, 2, 'completed')
ON CONFLICT (contract_id, document_group, sequence_number) DO UPDATE SET name = EXCLUDED.name, status = 'completed', updated_at = NOW();

-- Delete old chunks
DELETE FROM contract_document_chunks WHERE contract_id = '${ATRIUM_CONTRACT_ID}';

-- GC Chunks
`;

for (let i = 0; i < gcChunks.length; i++) {
  const c = gcChunks[i];
  const clauseMatch = c.match(/^(?:Clause|Sub-Clause)?\s*(\d+(?:\.\d+)*)/i);
  sql += `INSERT INTO contract_document_chunks (document_id, contract_id, chunk_index, content, content_hash, content_type, clause_number, token_count, metadata)
VALUES ((SELECT id FROM contract_documents WHERE contract_id='${ATRIUM_CONTRACT_ID}' AND document_group='C' AND sequence_number=1),
'${ATRIUM_CONTRACT_ID}', ${i}, ${esc(c)}, '${hash(c)}', 'text', ${esc(clauseMatch?clauseMatch[1]:null)}, ${Math.ceil(c.length/4)}, '{"group":"C"}'::jsonb);
`;
}

sql += '\n-- PC Chunks\n';

for (let i = 0; i < pcChunks.length; i++) {
  const c = pcChunks[i];
  const clauseMatch = c.match(/^(?:Clause|Sub-Clause)?\s*(\d+(?:\.\d+)*)/i);
  sql += `INSERT INTO contract_document_chunks (document_id, contract_id, chunk_index, content, content_hash, content_type, clause_number, token_count, metadata)
VALUES ((SELECT id FROM contract_documents WHERE contract_id='${ATRIUM_CONTRACT_ID}' AND document_group='C' AND sequence_number=2),
'${ATRIUM_CONTRACT_ID}', ${i}, ${esc(c)}, '${hash(c)}', 'text', ${esc(clauseMatch?clauseMatch[1]:null)}, ${Math.ceil(c.length/4)}, '{"group":"C"}'::jsonb);
`;
}

sql += `
-- Verify
SELECT d.document_group, d.name, d.page_count, COUNT(c.id) as chunks
FROM contract_documents d
LEFT JOIN contract_document_chunks c ON c.document_id = d.id
WHERE d.contract_id = '${ATRIUM_CONTRACT_ID}'
GROUP BY d.id ORDER BY d.document_group, d.sequence_number;
`;

writeFileSync(OUTPUT_FILE, sql);
console.log('\nSQL written to:', OUTPUT_FILE);
console.log('Size:', Math.round(sql.length/1024), 'KB');
