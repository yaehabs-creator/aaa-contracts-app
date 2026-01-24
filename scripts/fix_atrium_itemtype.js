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

async function fixAtriumItemTypes() {
    console.log('=== FIXING ATRIUM CONTRACT ITEM TYPES ===\n');

    // 1. Get the Atrium contract
    const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .ilike('name', '%Atrium%');

    if (contractError || !contracts || contracts.length === 0) {
        console.error('❌ Error: Atrium contract not found!');
        return;
    }

    const atriumContract = contracts[0];
    console.log(`📋 Found contract: ${atriumContract.name}`);
    console.log(`   ID: ${atriumContract.id}\n`);

    // 2. Get all items for this contract
    const { data: items, error: itemsError } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', atriumContract.id);

    if (itemsError) {
        console.error('❌ Error fetching items:', itemsError);
        return;
    }

    console.log(`📄 Found ${items?.length || 0} items\n`);

    if (!items || items.length === 0) {
        console.log('⚠️  No items to fix!');
        return;
    }

    // 3. Check how many items need fixing
    const itemsNeedingFix = items.filter(item => !item.item_data?.itemType);
    console.log(`🔧 Items needing itemType fix: ${itemsNeedingFix.length}\n`);

    if (itemsNeedingFix.length === 0) {
        console.log('✅ All items already have itemType set!');
        return;
    }

    // 4. Fix each item by adding itemType: 'CLAUSE'
    console.log('Updating items...');
    let successCount = 0;
    let errorCount = 0;

    for (const item of itemsNeedingFix) {
        const updatedItemData = {
            ...item.item_data,
            itemType: 'CLAUSE'
        };

        const { error: updateError } = await supabase
            .from('contract_items')
            .update({ item_data: updatedItemData })
            .eq('contract_id', item.contract_id)
            .eq('section_type', item.section_type)
            .eq('order_index', item.order_index);

        if (updateError) {
            console.error(`   ❌ Failed to update item at index ${item.order_index}:`, updateError.message);
            errorCount++;
        } else {
            successCount++;
        }
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`✅ Successfully updated: ${successCount} items`);
    if (errorCount > 0) {
        console.log(`❌ Failed to update: ${errorCount} items`);
    }
    console.log('\n🎉 Done! The Atrium contract clauses should now be visible.');
}

fixAtriumItemTypes().catch(console.error);
