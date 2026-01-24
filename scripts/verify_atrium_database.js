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

async function verifyAtriumDatabase() {
    console.log('=== VERIFYING ATRIUM CONTRACT IN DATABASE ===\n');

    // 1. Check if Contract #2 exists
    const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .ilike('name', '%Atrium%');

    if (contractError) {
        console.error('❌ Error fetching contracts:', contractError);
        return;
    }

    console.log(`Found ${contracts.length} Atrium contract(s):\n`);
    contracts.forEach(contract => {
        console.log(`  - ID: ${contract.id}`);
        console.log(`    Name: ${contract.name}`);
        console.log(`    Created: ${contract.created_at}`);
        console.log('');
    });

    if (contracts.length === 0) {
        console.error('❌ No Atrium contracts found in database!');
        return;
    }

    const atriumContract = contracts[0];

    // 2. Check contract items count
    const { data: items, error: itemsError, count } = await supabase
        .from('contract_items')
        .select('*', { count: 'exact' })
        .eq('contract_id', atriumContract.id)
        .order('order_index');

    if (itemsError) {
        console.error('❌ Error fetching contract items:', itemsError);
        return;
    }

    console.log(`\n📊 Contract Items Statistics:`);
    console.log(`   Total items: ${count}`);
    console.log(`   Contract ID: ${atriumContract.id}\n`);

    if (!items || items.length === 0) {
        console.error('❌ No contract items found for Atrium contract!');
        return;
    }

    // 3. Check structure of first few items
    console.log('🔍 Checking structure of first 3 items:\n');

    for (let i = 0; i < Math.min(3, items.length); i++) {
        const item = items[i];
        const data = item.item_data;

        console.log(`Item ${i + 1}:`);
        console.log(`  Clause Number: ${data.clause_number || 'MISSING'}`);
        console.log(`  Clause Title: ${data.clause_title || 'MISSING'}`);
        console.log(`  Has clause_text: ${data.clause_text ? 'YES' : 'NO'}`);
        console.log(`  Has condition_type: ${data.condition_type ? 'YES (' + data.condition_type + ')' : 'NO'}`);
        console.log(`  Has has_time_frame: ${data.has_time_frame !== undefined ? 'YES (' + data.has_time_frame + ')' : 'NO'}`);
        console.log(`  Has comparison: ${data.comparison ? 'YES (array length: ' + data.comparison.length + ')' : 'NO'}`);
        console.log(`  Has general_condition: ${data.general_condition ? 'YES' : 'NO'}`);
        console.log(`  Has particular_condition: ${data.particular_condition !== undefined ? 'YES' : 'NO'}`);
        console.log(`  Has time_frames: ${data.time_frames ? 'YES (array length: ' + data.time_frames.length + ')' : 'NO'}`);
        console.log('');
    }

    // 4. Check for items missing required fields
    console.log('🔍 Checking for items with missing required fields:\n');

    let missingFields = {
        clause_number: 0,
        clause_text: 0,
        condition_type: 0,
        has_time_frame: 0,
        comparison: 0,
        general_condition: 0,
        particular_condition: 0,
        time_frames: 0
    };

    items.forEach(item => {
        const data = item.item_data;
        if (!data.clause_number) missingFields.clause_number++;
        if (!data.clause_text) missingFields.clause_text++;
        if (!data.condition_type) missingFields.condition_type++;
        if (data.has_time_frame === undefined) missingFields.has_time_frame++;
        if (!data.comparison) missingFields.comparison++;
        if (!data.general_condition) missingFields.general_condition++;
        if (data.particular_condition === undefined) missingFields.particular_condition++;
        if (!data.time_frames) missingFields.time_frames++;
    });

    console.log('Missing fields count:');
    Object.entries(missingFields).forEach(([field, count]) => {
        const status = count === 0 ? '✅' : '❌';
        console.log(`  ${status} ${field}: ${count} items missing`);
    });

    // 5. Summary
    console.log('\n=== VERIFICATION SUMMARY ===');
    const allFieldsPresent = Object.values(missingFields).every(count => count === 0);

    if (allFieldsPresent) {
        console.log('✅ All contract items have the required fields!');
        console.log('✅ Database structure is correct!');
    } else {
        console.log('❌ Some items are missing required fields!');
        console.log('⚠️  Database needs to be updated!');
    }

    console.log(`\nTotal clauses in database: ${items.length}`);
}

verifyAtriumDatabase().catch(console.error);
