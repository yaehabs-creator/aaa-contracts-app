import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env.local');

if (fs.existsSync(envPath)) {
    const envConfig = dotenv.config({ path: envPath }).parsed;
    if (envConfig) {
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanupContracts() {
    console.log('🔍 Listing contracts...');

    const { data: contracts, error } = await supabase
        .from('contracts')
        .select('id, name');

    if (error) {
        console.error('❌ Error fetching contracts:', error);
        return;
    }

    console.log(`found ${contracts.length} contracts.`);

    const keepContract = contracts.find(c => c.name.toLowerCase().includes('hassan allam'));

    if (!keepContract) {
        console.error('❌ Could not find "Hassan Allam" contract! Aborting cleanup to prevent data loss.');
        contracts.forEach(c => console.log(`   - ${c.name} (${c.id})`));
        return;
    }

    console.log(`✅ Keeping: "${keepContract.name}" (${keepContract.id})`);

    const contractsToDelete = contracts.filter(c => c.id !== keepContract.id);

    if (contractsToDelete.length === 0) {
        console.log('✨ No other contracts to delete.');
        return;
    }

    console.log(`\n🗑️  Deleting ${contractsToDelete.length} contracts:`);

    for (const contract of contractsToDelete) {
        console.log(`   - Deleting "${contract.name}" (${contract.id})...`);

        // Delete items
        const { error: itemsError } = await supabase.from('contract_items').delete().eq('contract_id', contract.id);
        if (itemsError) console.error(`     ❌ Error deleting items: ${itemsError.message}`);

        // Delete sections
        const { error: sectionsError } = await supabase.from('contract_sections').delete().eq('contract_id', contract.id);
        if (sectionsError) console.error(`     ❌ Error deleting sections: ${sectionsError.message}`);

        // Delete contract
        const { error: contractError } = await supabase.from('contracts').delete().eq('id', contract.id);
        if (contractError) {
            console.error(`     ❌ Error deleting contract: ${contractError.message}`);
        } else {
            console.log(`     ✅ Deleted.`);
        }
    }

    console.log('\n✨ Cleanup complete!');
}

cleanupContracts();
