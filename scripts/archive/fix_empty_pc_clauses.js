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

// These are section headers that were incorrectly added as separate clauses
// They should be deleted because they have no content and are just headers
const SECTION_HEADERS_TO_DELETE = [
    '4',    // Contract Documents (header only)
    '6',    // Obligations of the Contractor (header only)
    '6A',   // Free Issue Items (header only)
    '7',    // Bonds (header only)
    '9',    // The Site (header only)
    '11',   // Plant, Workmanship (header only)
    '12',   // Title, Risk, Care (header only)
    '17',   // Commencement and Progress (header only)
    '18',   // Suspension of Works (header only)
    '19',   // Time for Completion (header only)
    '20',   // Taking Over (header only)
    '21',   // Defects (header only)
    '22',   // Variation (header only)
    '22A',  // Provisional Sum (header only)
    '23',   // Claims (header only)
    '25',   // Measurements (header only)
    '26',   // Interim and Final Certificates (header only)
    '22.6', // Variation Threshold - empty, content is in 22.3
];

async function fixEmptyPCClauses() {
    console.log('=== FIXING EMPTY PC CLAUSES ===\n');
    
    // Get all items
    const { data: items, error } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', ATRIUM_CONTRACT_ID);
    
    if (error) {
        console.error('Error fetching items:', error);
        return;
    }
    
    console.log(`Found ${items.length} total items\n`);
    
    // Find and delete empty section headers
    let deletedCount = 0;
    
    for (const clauseNum of SECTION_HEADERS_TO_DELETE) {
        const item = items.find(i => i.item_data?.clause_number === clauseNum);
        
        if (item) {
            // Only delete if it has no GC content (meaning it's a PC-only header)
            if (!item.item_data.general_condition || item.item_data.general_condition.length === 0) {
                const { error: deleteError } = await supabase
                    .from('contract_items')
                    .delete()
                    .eq('contract_id', item.contract_id)
                    .eq('section_type', item.section_type)
                    .eq('order_index', item.order_index);
                
                if (deleteError) {
                    console.error(`❌ Failed to delete ${clauseNum}:`, deleteError.message);
                } else {
                    console.log(`✅ Deleted empty section header: ${clauseNum}`);
                    deletedCount++;
                }
            } else {
                console.log(`⏭️  Skipped ${clauseNum} - has GC content`);
            }
        }
    }
    
    console.log(`\n📊 Deleted ${deletedCount} empty section headers`);
    
    // Now verify the remaining clauses
    const { data: remainingItems } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', ATRIUM_CONTRACT_ID);
    
    const withPC = remainingItems.filter(i => i.item_data.particular_condition && i.item_data.particular_condition.length > 0);
    const emptyPC = remainingItems.filter(i => i.item_data.particular_condition !== undefined && i.item_data.particular_condition.length === 0);
    
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Total clauses: ${remainingItems.length}`);
    console.log(`   With PC content: ${withPC.length}`);
    console.log(`   With empty PC (GC-only): ${emptyPC.length}`);
    
    console.log('\n✅ Fix complete!');
}

fixEmptyPCClauses().catch(console.error);
