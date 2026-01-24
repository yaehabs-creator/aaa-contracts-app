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

// Contract ID for Atrium
const ATRIUM_CONTRACT_ID = 'f8edad2c-e752-440a-bf84-0627eedb69fd';

async function verifyImport() {
    console.log('=== VERIFYING ATRIUM PC IMPORT ===\n');
    
    // Get all items for the contract
    const { data: items, error } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', ATRIUM_CONTRACT_ID)
        .order('order_index');
    
    if (error) {
        console.error('❌ Error fetching items:', error.message);
        return;
    }
    
    console.log(`📦 Total items in contract: ${items.length}\n`);
    
    // Count statistics
    let withPC = 0;
    let withGC = 0;
    let withBoth = 0;
    let pcOnly = 0;
    let gcOnly = 0;
    
    const clausesWithPC = [];
    const clausesWithBoth = [];
    const newPCClauses = [];
    
    for (const item of items) {
        const data = item.item_data;
        const hasPC = data.particular_condition && data.particular_condition.length > 0;
        const hasGC = data.general_condition && data.general_condition.length > 0;
        
        if (hasPC) withPC++;
        if (hasGC) withGC++;
        
        if (hasPC && hasGC) {
            withBoth++;
            clausesWithBoth.push(data.clause_number);
        } else if (hasPC && !hasGC) {
            pcOnly++;
            newPCClauses.push(data.clause_number);
        } else if (hasGC && !hasPC) {
            gcOnly++;
        }
        
        if (hasPC) {
            clausesWithPC.push({
                number: data.clause_number,
                title: data.clause_title,
                pcLength: data.particular_condition.length,
                gcLength: data.general_condition?.length || 0
            });
        }
    }
    
    console.log('📊 Statistics:');
    console.log(`   Total clauses: ${items.length}`);
    console.log(`   With Particular Conditions: ${withPC}`);
    console.log(`   With General Conditions: ${withGC}`);
    console.log(`   With Both (GC + PC): ${withBoth}`);
    console.log(`   PC Only (new clauses): ${pcOnly}`);
    console.log(`   GC Only: ${gcOnly}`);
    
    console.log('\n📋 Clauses with Both GC and PC:');
    for (const num of clausesWithBoth.slice(0, 10)) {
        console.log(`   ${num}`);
    }
    if (clausesWithBoth.length > 10) {
        console.log(`   ... and ${clausesWithBoth.length - 10} more`);
    }
    
    console.log('\n🆕 New PC-only clauses:');
    for (const num of newPCClauses) {
        console.log(`   ${num}`);
    }
    
    // Sample a few clauses to show their content
    console.log('\n📝 Sample clauses with PC content:\n');
    const samples = clausesWithPC.slice(0, 3);
    for (const sample of samples) {
        console.log(`--- ${sample.number}: ${sample.title} ---`);
        console.log(`   GC length: ${sample.gcLength} chars`);
        console.log(`   PC length: ${sample.pcLength} chars`);
    }
    
    console.log('\n✅ Verification complete!');
}

verifyImport().catch(console.error);
