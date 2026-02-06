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

    // Get all items
    const { data: items } = await supabase
        .from('contract_items')
        .select('item_data')
        .eq('contract_id', contract.id)
        .eq('section_type', 'GENERAL')
        .order('order_index');

    // Extract just the item_data
    const clauses = items.map(i => i.item_data);

    // Save to JSON
    const outputPath = join(rootDir, 'contract2_gc_clauses.json');
    fs.writeFileSync(outputPath, JSON.stringify(clauses, null, 2), 'utf-8');

    console.log(`Exported ${clauses.length} clauses to: contract2_gc_clauses.json`);

    // Also create a sample file with just 5 clauses for easy viewing
    const samplePath = join(rootDir, 'contract2_gc_sample.json');
    const sample = clauses.slice(0, 5);
    fs.writeFileSync(samplePath, JSON.stringify(sample, null, 2), 'utf-8');

    console.log(`Sample (5 clauses) saved to: contract2_gc_sample.json`);
}

main();
