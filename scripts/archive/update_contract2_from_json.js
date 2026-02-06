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

async function updateContract2FromJSON() {
    console.log('=== UPDATE CONTRACT #2 FROM JSON ===\n');

    // Read the JSON file
    const jsonPath = join(rootDir, 'contract2_gc_clauses.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('Error: contract2_gc_clauses.json not found!');
        return;
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const clausesData = jsonData.clauses || jsonData; // Handle both nested and flat structures
    console.log(`Loaded ${clausesData.length} clauses from JSON\n`);

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

    // Update each item
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < clausesData.length; i++) {
        const jsonClause = clausesData[i];
        const existingItem = existingItems.find(item =>
            item.item_data.clause_number === jsonClause.clause_number
        );

        if (!existingItem) {
            console.log(`⚠️  Clause ${jsonClause.clause_number} not found in database - skipping`);
            continue;
        }

        // Update the item_data with the JSON data
        const updatedItemData = {
            ...existingItem.item_data,
            text: jsonClause.text,
            clause_text: jsonClause.clause_text,
            clause_title: jsonClause.clause_title,
            heading: jsonClause.heading,
            // Preserve other fields
            clause_number: jsonClause.clause_number,
            sectionNumber: jsonClause.sectionNumber,
            sectionTitle: jsonClause.sectionTitle,
            condition_type: jsonClause.condition_type,
            itemType: jsonClause.itemType,
            orderIndex: jsonClause.orderIndex
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
                console.log(`✓ Updated ${updatedCount}/${clausesData.length} clauses...`);
            }
        }
    }

    console.log(`\n=== UPDATE COMPLETE ===`);
    console.log(`✓ Successfully updated: ${updatedCount} clauses`);
    if (errorCount > 0) {
        console.log(`❌ Errors: ${errorCount} clauses`);
    }
    console.log(`\nRefresh your browser to see the changes!`);
}

updateContract2FromJSON();
