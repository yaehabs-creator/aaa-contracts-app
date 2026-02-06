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
    console.log('--- Fetching all contracts ---');
    const { data: contracts, error: fetchError } = await supabase.from('contracts').select('id, name');

    if (fetchError) {
        console.error('Error fetching contracts:', fetchError);
        process.exit(1);
    }

    console.log(`Found ${contracts.length} contracts:`);
    contracts.forEach(c => console.log(`  - [${c.id}] ${c.name}`));

    // Find Hassan Allam contract
    const hassanContract = contracts.find(c => c.name.toLowerCase().includes('hassan allam'));

    if (!hassanContract) {
        console.error('\n❌ Hassan Allam contract not found! Aborting.');
        process.exit(1);
    }

    console.log(`\n✅ Keeping: [${hassanContract.id}] ${hassanContract.name}`);

    // Delete all others
    const toDelete = contracts.filter(c => c.id !== hassanContract.id);

    if (toDelete.length === 0) {
        console.log('\n✅ No other contracts to delete.');
        return;
    }

    console.log(`\n🗑️  Deleting ${toDelete.length} contract(s)...`);

    for (const contract of toDelete) {
        console.log(`   Deleting: [${contract.id}] ${contract.name}`);

        // Delete items
        const { error: itemsError } = await supabase
            .from('contract_items')
            .delete()
            .eq('contract_id', contract.id);
        if (itemsError) console.error(`     Items error:`, itemsError);

        // Delete sections
        const { error: sectionsError } = await supabase
            .from('contract_sections')
            .delete()
            .eq('contract_id', contract.id);
        if (sectionsError) console.error(`     Sections error:`, sectionsError);

        // Delete contract
        const { error: contractError } = await supabase
            .from('contracts')
            .delete()
            .eq('id', contract.id);
        if (contractError) console.error(`     Contract error:`, contractError);

        console.log(`     ✓ Deleted`);
    }

    console.log('\n✅ Cleanup complete!');

    // Verify
    const { data: remaining } = await supabase.from('contracts').select('id, name');
    console.log(`\nRemaining contracts: ${remaining.length}`);
    remaining.forEach(c => console.log(`  - [${c.id}] ${c.name}`));
}

main();
