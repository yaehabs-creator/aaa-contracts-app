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

async function checkEmptyClauses() {
    const { data: items } = await supabase
        .from('contract_items')
        .select('item_data')
        .eq('contract_id', ATRIUM_CONTRACT_ID);
    
    console.log('=== CLAUSES WITH EMPTY OR VERY SHORT PC CONTENT ===\n');
    
    const problematic = items.filter(d => {
        const pc = d.item_data.particular_condition;
        return pc !== undefined && pc !== null && pc.length === 0;
    });
    
    console.log(`Found ${problematic.length} clauses with empty PC content:\n`);
    
    for (const item of problematic) {
        const data = item.item_data;
        console.log(`${data.clause_number}: ${data.clause_title}`);
        console.log(`   PC length: ${data.particular_condition?.length || 0}`);
        console.log(`   GC length: ${data.general_condition?.length || 0}`);
        console.log(`   condition_type: ${data.condition_type}`);
        console.log('');
    }
}

checkEmptyClauses().catch(console.error);
