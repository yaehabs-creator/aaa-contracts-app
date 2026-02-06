import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(rootDir, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reimportAtriumClauses() {
    console.log('=== RE-IMPORTING ATRIUM CLAUSES ===\n');

    // 1. Find Atrium contract
    const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .ilike('name', '%Atrium%');

    if (contractError || !contracts || contracts.length === 0) {
        console.error('❌ No Atrium contract found!');
        return;
    }

    console.log(`Found ${contracts.length} Atrium contract(s):`);
    contracts.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name} (ID: ${c.id})`);
    });
    console.log('');

    const atriumContract = contracts[0];
    console.log(`Using: ${atriumContract.name}`);
    console.log(`ID: ${atriumContract.id}\n`);

    // 2. Load transformed JSON
    const jsonPath = join(rootDir, 'Atrium_GC_Contract.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('❌ Atrium_GC_Contract.json not found!');
        return;
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`Loaded ${jsonData.clauses.length} clauses from JSON\n`);

    // 3. Delete existing items for this contract
    const { error: deleteError } = await supabase
        .from('contract_items')
        .delete()
        .eq('contract_id', atriumContract.id);

    if (deleteError) {
        console.error('❌ Error deleting existing items:', deleteError);
        return;
    }
    console.log('✅ Cleared existing items\n');

    // 4. Insert all clauses as new items
    console.log('Inserting clauses...');
    let insertedCount = 0;

    for (let i = 0; i < jsonData.clauses.length; i++) {
        const clause = jsonData.clauses[i];

        const itemData = {
            itemType: 'CLAUSE',
            clause_number: clause.clause_number,
            clause_title: clause.clause_title,
            clause_text: clause.clause_text,
            condition_type: clause.condition_type,
            has_time_frame: clause.has_time_frame,
            comparison: clause.comparison,
            general_condition: clause.general_condition,
            particular_condition: clause.particular_condition,
            time_frames: clause.time_frames,
            orderIndex: i
        };

        const { error: insertError } = await supabase
            .from('contract_items')
            .insert({
                contract_id: atriumContract.id,
                section_type: 'GENERAL',
                order_index: i,
                item_data: itemData
            });

        if (insertError) {
            console.error(`❌ Error inserting clause ${clause.clause_number}:`, insertError.message);
        } else {
            insertedCount++;
            if (insertedCount % 20 === 0) {
                console.log(`   Inserted ${insertedCount}/${jsonData.clauses.length}...`);
            }
        }
    }

    console.log(`\n✅ Successfully inserted ${insertedCount} clauses!`);
    console.log('\n=== IMPORT COMPLETE ===');
    console.log('Refresh your browser to see all clauses!');
}

reimportAtriumClauses().catch(console.error);
