import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env.local');

if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // Find Contract #2
    const { data: contract } = await supabase
        .from('contracts')
        .select('id, name')
        .ilike('name', '%Atrium GC%')
        .single();

    if (!contract) {
        console.error('Contract #2 not found!');
        return;
    }

    console.log(`Contract: ${contract.name}`);
    console.log(`ID: ${contract.id}\n`);

    // Get clauses 23.6, 23.7, 23.8
    const { data: items } = await supabase
        .from('contract_items')
        .select('item_data')
        .eq('contract_id', contract.id)
        .eq('section_type', 'GENERAL');

    console.log(`Total items: ${items.length}\n`);

    const targetClauses = ['23.6', '23.7', '23.8'];

    targetClauses.forEach(clauseNum => {
        const item = items.find(i => i.item_data.clause_number === clauseNum);

        if (item) {
            const data = item.item_data;
            console.log(`\n=== CLAUSE ${clauseNum} ===`);
            console.log(`Clause Number: ${data.clause_number}`);
            console.log(`Clause Title: ${data.clause_title}`);
            console.log(`Text Length: ${data.clause_text?.length || 0} characters`);
            console.log(`\nFull Text:`);
            console.log(data.clause_text);
            console.log('\n--- JSON ---');
            console.log(JSON.stringify({
                clause_number: data.clause_number,
                clause_title: data.clause_title,
                text_preview: data.clause_text?.substring(0, 200) + '...'
            }, null, 2));
        } else {
            console.log(`\n=== CLAUSE ${clauseNum} === NOT FOUND`);
        }
    });

    // Show some stats
    console.log('\n\n=== TEXT LENGTH STATS ===');
    const textLengths = items.map(i => i.item_data.clause_text?.length || 0);
    const avg = textLengths.reduce((a, b) => a + b, 0) / textLengths.length;
    const min = Math.min(...textLengths);
    const max = Math.max(...textLengths);
    const empty = textLengths.filter(l => l === 0).length;

    console.log(`Average text length: ${avg.toFixed(0)} chars`);
    console.log(`Min: ${min}, Max: ${max}`);
    console.log(`Empty clauses: ${empty}`);
}

main();
