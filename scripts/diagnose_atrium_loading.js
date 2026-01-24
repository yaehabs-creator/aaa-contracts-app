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

async function checkAtriumContractStructure() {
    console.log('=== CHECKING ATRIUM CONTRACT STRUCTURE ===\n');

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
    console.log('📋 Contract Details:');
    console.log(`   ID: ${atriumContract.id}`);
    console.log(`   Name: ${atriumContract.name}`);
    console.log(`   Uses Subcollections: ${atriumContract.uses_subcollections}`);
    console.log(`   Has Clauses Field: ${atriumContract.clauses ? 'YES' : 'NO'}`);
    console.log(`   Has Sections Field: ${atriumContract.sections ? 'YES' : 'NO'}`);
    console.log('');

    // 2. Check contract_sections table
    const { data: sections, error: sectionsError } = await supabase
        .from('contract_sections')
        .select('*')
        .eq('contract_id', atriumContract.id);

    if (sectionsError) {
        console.error('❌ Error fetching sections:', sectionsError);
    } else {
        console.log(`📁 Contract Sections: ${sections?.length || 0}`);
        sections?.forEach(section => {
            console.log(`   - ${section.section_type}: ${section.title}`);
        });
        console.log('');
    }

    // 3. Check contract_items table
    const { data: items, error: itemsError } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', atriumContract.id)
        .order('order_index')
        .limit(5);

    if (itemsError) {
        console.error('❌ Error fetching items:', itemsError);
    } else {
        console.log(`📄 Contract Items (first 5 of total):`);
        items?.forEach((item, index) => {
            console.log(`\n   Item ${index + 1}:`);
            console.log(`      Section Type: ${item.section_type}`);
            console.log(`      Order Index: ${item.order_index}`);
            console.log(`      Item Data Keys: ${Object.keys(item.item_data || {}).join(', ')}`);
            if (item.item_data) {
                console.log(`      Clause Number: ${item.item_data.clause_number || 'N/A'}`);
                console.log(`      Clause Title: ${item.item_data.clause_title || 'N/A'}`);
                console.log(`      Item Type: ${item.item_data.itemType || 'N/A'}`);
            }
        });
        console.log('');
    }

    // 4. Summary
    console.log('\n=== DIAGNOSIS ===');
    if (!atriumContract.uses_subcollections) {
        console.log('⚠️  Contract does NOT use subcollections!');
        console.log('   The app will try to load from contract.clauses field instead of contract_items table.');
        console.log('   This is why clauses are not showing!');
        console.log('\n💡 SOLUTION: Set uses_subcollections = true for this contract');
    } else {
        console.log('✅ Contract uses subcollections correctly');
        console.log('   Clauses should load from contract_items table');
    }
}

checkAtriumContractStructure().catch(console.error);
