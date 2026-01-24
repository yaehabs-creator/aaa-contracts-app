import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

dotenv.config({ path: join(rootDir, '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ATRIUM_CONTRACT_ID = 'f8edad2c-e752-440a-bf84-0627eedb69fd';

async function checkClauseData() {
    console.log('=== CHECKING ATRIUM CLAUSE DATA ===\n');
    
    // Get a few sample clauses
    const { data: items, error } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', ATRIUM_CONTRACT_ID)
        .limit(5);
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log(`Found ${items.length} items\n`);
    
    for (const item of items) {
        console.log('---');
        console.log(`Clause: ${item.item_data?.clause_number}`);
        console.log(`Title: ${item.item_data?.clause_title}`);
        console.log(`Has GC: ${item.item_data?.general_condition ? 'Yes (' + item.item_data.general_condition.length + ' chars)' : 'No'}`);
        console.log(`Has PC: ${item.item_data?.particular_condition ? 'Yes (' + item.item_data.particular_condition.length + ' chars)' : 'No'}`);
        console.log(`condition_type: ${item.item_data?.condition_type}`);
        console.log(`itemType: ${item.item_data?.itemType}`);
    }
    
    // Check specifically for clause 1.1 which should have PC
    const { data: clause11 } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', ATRIUM_CONTRACT_ID)
        .filter('item_data->>clause_number', 'eq', '1.1')
        .single();
    
    if (clause11) {
        console.log('\n=== CLAUSE 1.1 DETAILS ===');
        console.log('Full item_data:', JSON.stringify(clause11.item_data, null, 2).substring(0, 1000));
    }
}

checkClauseData().catch(console.error);
