/**
 * Script to add hyperlinks to the Atrium contract clauses
 * 
 * This script:
 * 1. Reads all Atrium contract clauses from Supabase
 * 2. Processes each clause to add hyperlinks for clause references
 * 3. Updates the clauses back to Supabase
 * 
 * Run in Supabase SQL Editor or use the generated SQL file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Atrium contract JSON
const contractPath = path.join(__dirname, '..', 'Atrium_GC_Contract.json');
const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

// Normalize clause ID (must match the app's normalizeClauseId function)
function normalizeClauseId(clauseNumber) {
    if (!clauseNumber) return '';
    return clauseNumber
        .trim()
        .replace(/\s+/g, '')      // Remove all spaces
        .replace(/[()]/g, '')     // Remove parentheses
        .replace(/[[\]]/g, '')    // Remove brackets
        .toLowerCase()
        .replace(/^clause-?/i, '')
        .toUpperCase();
}

// Build a set of all available clause IDs including variants
const availableClauseIds = new Set();
contractData.clauses.forEach(clause => {
    const normalizedId = normalizeClauseId(clause.clause_number);
    availableClauseIds.add(normalizedId);
    // Also add lowercase/uppercase variants
    availableClauseIds.add(normalizedId.toLowerCase());
    availableClauseIds.add(normalizedId.toUpperCase());
    
    // Add the original clause number without normalization for exact matches
    availableClauseIds.add(clause.clause_number.replace(/\s+/g, ''));
});

console.log(`Found ${contractData.clauses.length} clauses`);
console.log(`Available clause IDs: ${availableClauseIds.size}`);

// Function to add hyperlinks to text
function linkifyText(text) {
    if (!text) return text;
    
    // Pattern for clause references - includes alphanumeric like 6A, 2A.5, 22A.1
    const pattern = /(?:Clause|Sub-[Cc]lause)\s+([0-9]+[A-Za-z]?(?:\.[0-9]+[A-Za-z]?)*(?:\s*\([a-z0-9]+\))?)/g;
    
    return text.replace(pattern, (match, number) => {
        const cleanId = normalizeClauseId(number);
        
        // Check if clause exists (try multiple formats)
        const variants = [
            cleanId,
            cleanId.toLowerCase(),
            cleanId.toUpperCase(),
            number.replace(/\s+/g, ''),  // Original without spaces
            number.replace(/\s+/g, '').toUpperCase(),
        ];
        
        const found = variants.some(v => availableClauseIds.has(v));
        
        if (found) {
            return `<a href="#clause-${cleanId}" class="clause-link" data-clause-id="${cleanId}">${match}</a>`;
        }
        
        // Clause doesn't exist, return original
        console.log(`  Clause not found: ${number} (normalized: ${cleanId})`);
        return match;
    });
}

// Process each clause and generate SQL updates
let sqlStatements = [];
let linksAdded = 0;

contractData.clauses.forEach(clause => {
    const originalText = clause.clause_text || '';
    const originalGC = clause.general_condition || '';
    const originalPC = clause.particular_condition || '';
    
    const linkedText = linkifyText(originalText);
    const linkedGC = linkifyText(originalGC);
    const linkedPC = linkifyText(originalPC);
    
    // Check if any links were added
    const textChanged = linkedText !== originalText;
    const gcChanged = linkedGC !== originalGC;
    const pcChanged = linkedPC !== originalPC;
    
    if (textChanged || gcChanged || pcChanged) {
        linksAdded++;
        
        // Escape single quotes for SQL
        const escapedText = linkedText.replace(/'/g, "''");
        const escapedGC = linkedGC.replace(/'/g, "''");
        const escapedPC = linkedPC.replace(/'/g, "''");
        const clauseNum = clause.clause_number.replace(/'/g, "''");
        
        // Generate SQL UPDATE statement
        sqlStatements.push(`
-- Clause ${clause.clause_number}
UPDATE contract_items 
SET item_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            item_data, 
            '{clause_text}', 
            '${JSON.stringify(escapedText).slice(1, -1)}'::jsonb
        ),
        '{general_condition}',
        '${JSON.stringify(escapedGC).slice(1, -1)}'::jsonb
    ),
    '{particular_condition}',
    '${JSON.stringify(escapedPC).slice(1, -1)}'::jsonb
)
WHERE item_data->>'clause_number' = '${clauseNum}'
AND section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
);`);
    }
});

console.log(`\nClauses with hyperlinks added: ${linksAdded}`);

// Write SQL file
const sqlContent = `-- Add hyperlinks to Atrium contract clauses
-- Generated: ${new Date().toISOString()}
-- This script updates clause text fields to include clickable hyperlinks
-- for clause references (e.g., "Clause 7.1" becomes a link to clause 7.1)

BEGIN;

${sqlStatements.join('\n')}

COMMIT;

-- Verify the updates
SELECT 
    item_data->>'clause_number' as clause_number,
    CASE 
        WHEN item_data->>'clause_text' LIKE '%class="clause-link"%' THEN 'YES'
        ELSE 'NO'
    END as has_links
FROM contract_items
WHERE section_id IN (
    SELECT id FROM contract_sections 
    WHERE contract_id IN (
        SELECT id FROM contracts WHERE name ILIKE '%Atrium%'
    )
)
ORDER BY item_data->>'clause_number'
LIMIT 20;
`;

const outputPath = path.join(__dirname, 'add_atrium_hyperlinks.sql');
fs.writeFileSync(outputPath, sqlContent);
console.log(`\nSQL file written to: ${outputPath}`);

// Also output a summary of which clauses reference which
console.log('\n--- Sample clause references found ---');
let sampleCount = 0;
contractData.clauses.slice(0, 10).forEach(clause => {
    const matches = clause.clause_text?.match(/Clause\s+[0-9A-Za-z.]+/g) || [];
    if (matches.length > 0) {
        console.log(`Clause ${clause.clause_number}: references ${matches.join(', ')}`);
        sampleCount++;
    }
});
if (sampleCount === 0) {
    console.log('No clause references found in first 10 clauses');
}
