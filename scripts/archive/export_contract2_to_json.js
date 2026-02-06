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

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function exportContract2ToJSON() {
    console.log('=== EXPORT CONTRACT #2 TO JSON ===\n');

    // Find Contract #2
    const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .ilike('name', '%Atrium GC%');

    if (contractError || !contracts || contracts.length === 0) {
        console.error('Error: Contract #2 (Atrium GC) not found in database!');
        return;
    }

    const contract2 = contracts[0];
    console.log(`Found Contract #2: ${contract2.name}`);
    console.log(`Contract ID: ${contract2.id}\n`);

    // Get all items for this contract
    const { data: items, error: itemsError } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', contract2.id)
        .order('order_index');

    if (itemsError) {
        console.error('Error fetching items:', itemsError);
        return;
    }

    console.log(`Found ${items.length} items in database\n`);

    // Extract clauses data
    const clauses = items.map(item => ({
        clause_number: item.item_data.clause_number,
        clause_title: item.item_data.clause_title,
        clause_text: item.item_data.clause_text || item.item_data.text,
        heading: item.item_data.heading,
        sectionTitle: item.item_data.sectionTitle,
        sectionNumber: item.item_data.sectionNumber,
        condition_type: item.item_data.condition_type,
        itemType: item.item_data.itemType,
        orderIndex: item.order_index,
        number: item.item_data.number,
        text: item.item_data.text
    }));

    // Create JSON structure
    const jsonData = {
        source: "Database export",
        exportDate: new Date().toISOString(),
        contract: {
            id: contract2.id,
            name: contract2.name
        },
        clauses: clauses
    };

    // Write to file
    const outputPath = join(rootDir, 'contract2_gc_clauses.json');
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');

    console.log(`✓ Exported ${clauses.length} clauses to contract2_gc_clauses.json\n`);
    console.log('=== EXPORT COMPLETE ===');
}

exportContract2ToJSON();
