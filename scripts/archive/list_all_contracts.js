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

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('=== ALL CONTRACTS IN DATABASE ===\n');

    const { data: contracts, error } = await supabase
        .from('contracts')
        .select('*')
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total contracts: ${contracts.length}\n`);

    contracts.forEach((contract, idx) => {
        console.log(`${idx + 1}. ${contract.name}`);
        console.log(`   ID: ${contract.id}`);
        console.log(`   Timestamp: ${new Date(contract.timestamp).toLocaleString()}`);
        console.log(`   Metadata:`, contract.metadata);
        console.log(`   Uses Subcollections: ${contract.uses_subcollections}`);
        console.log('');
    });

    // Check if Contract #2 has items
    const contract2 = contracts.find(c => c.name.includes('Atrium GC'));
    if (contract2) {
        const { data: items, count } = await supabase
            .from('contract_items')
            .select('*', { count: 'exact' })
            .eq('contract_id', contract2.id);

        console.log(`\n=== CONTRACT #2 DETAILS ===`);
        console.log(`Name: ${contract2.name}`);
        console.log(`Total Items: ${count}`);

        if (items && items.length > 0) {
            console.log(`\nFirst item sample:`);
            const firstItem = items[0].item_data;
            console.log(`  Clause: ${firstItem.clause_number}`);
            console.log(`  Title: ${firstItem.clause_title}`);
            console.log(`  Text length: ${firstItem.clause_text?.length || 0} chars`);
            console.log(`  Text preview: ${(firstItem.clause_text || '').substring(0, 100)}...`);
        }
    }
}

main();
