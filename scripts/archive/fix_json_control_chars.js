import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const jsonPath = join(rootDir, 'contract2_gc_clauses.json');

console.log('Reading JSON file...');
const content = fs.readFileSync(jsonPath, 'utf8');

console.log('Fixing control characters...');
// Replace any unescaped control characters
const fixed = content
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\r/g, '\n');   // Normalize line endings

console.log('Writing fixed JSON...');
fs.writeFileSync(jsonPath, fixed, 'utf8');

console.log('Validating JSON...');
try {
    const data = JSON.parse(fixed);
    console.log(`✓ JSON is valid! Contains ${data.length} items`);
    console.log(`✓ First item clause_title: "${data[0].clause_title}"`);
} catch (e) {
    console.error('❌ JSON is still invalid:', e.message);
    process.exit(1);
}

console.log('\n✓ File fixed successfully!');
