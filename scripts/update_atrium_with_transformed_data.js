import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
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

async function updateAtriumWithTransformedData() {
    console.log('=== UPDATE ATRIUM CONTRACT WITH TRANSFORMED DATA ===\n');

    // Read the transformed JSON file
    const jsonPath = join(rootDir, 'Atrium_GC_Contract.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('Error: Atrium_GC_Contract.json not found!');
        return;
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`Loaded ${jsonData.clauses.length} transformed clauses from JSON\n`);

    // Find Contract #2 (Atrium GC)
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

    // Get all existing items for this contract
    const { data: existingItems, error: itemsError } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', contract2.id)
        .order('order_index');

    if (itemsError) {
        console.error('Error fetching existing items:', itemsError);
        return;
    }

    console.log(`Found ${existingItems.length} existing items in database\n`);

    // Update each item with the transformed data
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < jsonData.clauses.length; i++) {
        const jsonClause = jsonData.clauses[i];
        const existingItem = existingItems.find(item =>
            item.item_data.clause_number === jsonClause.clause_number
        );

        if (!existingItem) {
            console.log(`⚠️  Clause ${jsonClause.clause_number} not found in database - skipping`);
            continue;
        }

        // Update the item_data with the transformed JSON data
        const updatedItemData = {
            ...existingItem.item_data,
            clause_number: jsonClause.clause_number,
            clause_title: jsonClause.clause_title,
            clause_text: jsonClause.clause_text,
            condition_type: jsonClause.condition_type,
            has_time_frame: jsonClause.has_time_frame,
            comparison: jsonClause.comparison,
            general_condition: jsonClause.general_condition,
            particular_condition: jsonClause.particular_condition,
            time_frames: jsonClause.time_frames
        };

        const { error: updateError } = await supabase
            .from('contract_items')
            .update({ item_data: updatedItemData })
            .eq('id', existingItem.id);

        if (updateError) {
            console.error(`❌ Error updating clause ${jsonClause.clause_number}:`, updateError.message);
            errorCount++;
        } else {
            updatedCount++;
            if (updatedCount % 20 === 0) {
                console.log(`✓ Updated ${updatedCount}/${jsonData.clauses.length} clauses...`);
            }
        }
    }

    console.log(`\n=== UPDATE COMPLETE ===`);
    console.log(`✓ Successfully updated: ${updatedCount} clauses`);
    if (errorCount > 0) {
        console.log(`❌ Errors: ${errorCount} clauses`);
    }
    console.log(`\nThe Atrium GC contract now has the same structure as Hassan Allam's contract!`);
    console.log(`Refresh your browser to see the changes!`);
}

updateAtriumWithTransformedData().catch(console.error);
