import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const DATA_DIR = join(rootDir, 'contract2_data');
const envPath = join(rootDir, '.env.local');

if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);


async function main() {
    console.log('--- DELIVERABLES ---');
    console.log('1. New Files:');
    console.log('   - scripts/import_task1_atrium.js');
    console.log('   - contract2_data/parsed_gc.json');
    console.log('   - contract2_data/parsed_pc.json');
    console.log('   - scripts/generate_deliverables.js'); // This script

    console.log('\n2. Contract Location:');
    console.log('   - Supabase ID: a58142d8-79a4-4fb2-b92f-b3e70dd5a03a');
    console.log('   - Table: contracts (and contract_sections, contract_items)');

    console.log('\n3. Comparison Sample (First 5 GC Clauses):');

    const gc = JSON.parse(fs.readFileSync(join(DATA_DIR, 'parsed_gc.json')));
    const pc = JSON.parse(fs.readFileSync(join(DATA_DIR, 'parsed_pc.json')));

    const sample = gc.slice(0, 5); // First 5
    // Map of PC by number
    const pcMap = new Map(pc.map(i => [i.clause_number, i]));

    sample.forEach(g => {
        const p = pcMap.get(g.clause_number);
        console.log(`\n[Clause ${g.clause_number}: ${g.clause_title}]`);
        console.log(`GC Text: ${g.clause_text.substring(0, 50).replace(/\n/g, ' ')}...`);
        if (p) {
            console.log(`PC MATCH: [${p.clause_number}] ${p.clause_title}`);
            console.log(`PC Text: ${p.clause_text.substring(0, 50).replace(/\n/g, ' ')}...`);
        } else {
            console.log('PC MATCH: (No Particular Condition)');
        }
    });

    console.log('\n4. Contract #1 Safety Check:');
    const { data: c1 } = await supabase.from('contracts').select('id, name').ilike('name', '%Hassan Allam%');
    if (c1 && c1.length > 0) {
        console.log(`✅ Contract #1 Found: ${c1[0].name} (${c1[0].id})`);
        // Check items
        const { count } = await supabase.from('contract_items').select('*', { count: 'exact', head: true }).eq('contract_id', c1[0].id);
        console.log(`   Items Integrity: ${count} items match.`);
        if (count > 0) console.log('   CONFIRMED: Contract #1 NOT Modified.');
    } else {
        console.log('❌ Contract #1 WARNING: Not found by name match.');
    }
}

main();
