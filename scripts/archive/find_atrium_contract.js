/**
 * Find Atrium contracts in the database
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findAtriumContracts() {
    console.log('=== SEARCHING FOR ATRIUM CONTRACTS ===\n');
    
    // Search by name
    const { data: contracts, error } = await supabase
        .from('contracts')
        .select('id, name, created_at, updated_at')
        .ilike('name', '%atrium%');
    
    if (error) {
        console.error('Error searching:', error);
        return;
    }
    
    if (contracts.length === 0) {
        console.log('❌ No Atrium contracts found in database.');
        
        // List all contracts
        console.log('\nListing ALL contracts in database:');
        const { data: allContracts, error: allError } = await supabase
            .from('contracts')
            .select('id, name, created_at');
        
        if (allError) {
            console.error('Error:', allError);
        } else if (allContracts.length === 0) {
            console.log('   No contracts found at all.');
        } else {
            allContracts.forEach(c => {
                console.log(`   - ${c.name} (${c.id})`);
            });
        }
        return;
    }
    
    console.log(`Found ${contracts.length} Atrium contract(s):\n`);
    
    for (const contract of contracts) {
        console.log(`Contract: ${contract.name}`);
        console.log(`   ID: ${contract.id}`);
        console.log(`   Created: ${contract.created_at}`);
        
        // Count items
        const { count, error: countError } = await supabase
            .from('contract_items')
            .select('*', { count: 'exact', head: true })
            .eq('contract_id', contract.id);
        
        if (!countError) {
            console.log(`   Clauses: ${count}`);
        }
        
        // Check for PC content
        const { data: items } = await supabase
            .from('contract_items')
            .select('item_data')
            .eq('contract_id', contract.id);
        
        if (items) {
            const withPC = items.filter(i => i.item_data?.particular_condition && i.item_data.particular_condition.length > 0);
            console.log(`   With PC: ${withPC.length}`);
        }
        
        console.log('');
    }
}

findAtriumContracts().catch(console.error);
