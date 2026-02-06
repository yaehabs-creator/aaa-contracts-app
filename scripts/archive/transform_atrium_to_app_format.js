import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('=== TRANSFORM ATRIUM GC TO APP FORMAT ===\n');

// Read the parsed Atrium JSON
const atriumPath = join(rootDir, '1. ATRIUM GC_parsed.json');
const atriumData = JSON.parse(fs.readFileSync(atriumPath, 'utf-8'));

console.log(`Loaded ${atriumData.clauses.length} clauses from Atrium GC\n`);

// Transform each clause to match Hassan Allam's structure
const transformedClauses = atriumData.clauses.map(clause => ({
    clause_number: clause.clause_number,
    clause_title: clause.clause_title,
    clause_text: clause.clause_text,
    condition_type: "General", // All Atrium GC clauses are General Conditions
    has_time_frame: false, // We'll set this to false by default
    comparison: [
        {
            color: "green",
            comment: "General Condition from Atrium contract.",
            excerpt_general: clause.clause_text.substring(0, 200) + (clause.clause_text.length > 200 ? '...' : ''),
            excerpt_particular: "",
            type: "NO_CHANGE"
        }
    ],
    general_condition: clause.clause_text,
    particular_condition: "",
    time_frames: []
}));

// Create the final structure matching Hassan Allam's format
const outputData = {
    id: "atrium_gc_001",
    name: "Atrium General Conditions",
    timestamp: Date.now(),
    clauses: transformedClauses
};

// Write the transformed data
const outputPath = join(rootDir, 'Atrium_GC_Contract.json');
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');

console.log(`✓ Transformed ${transformedClauses.length} clauses`);
console.log(`✓ Saved to: Atrium_GC_Contract.json\n`);
console.log('=== TRANSFORMATION COMPLETE ===');
