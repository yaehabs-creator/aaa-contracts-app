
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

async function main() {
    console.log('Fetching contracts list...');
    const { data: contracts, error } = await supabase.from('contracts').select('*').order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching contracts:', error);
        return;
    }

    console.log(`Found ${contracts.length} contracts.`);

    for (const c of contracts) {
        console.log(`[${c.id}] ${c.name} (Subcols: ${c.uses_subcollections})`);
    }

    const newContract = contracts.find(c => c.id.startsWith('contract_002_'));

    if (newContract) {
        console.log('\n--- Details for New Contract ---');
        console.log('ID:', newContract.id);

        if (newContract.uses_subcollections) {
            const { data: sections } = await supabase
                .from('contract_sections')
                .select('*')
                .eq('contract_id', newContract.id);

            console.log('Sections:', sections.map(s => `${s.section_type} (${s.item_count} items)`).join(', '));

            // Sample items
            const { data: items } = await supabase
                .from('contract_items')
                .select('*')
                .eq('contract_id', newContract.id)
                .limit(5);

            console.log('Sample Items:', JSON.stringify(items.map(i => i.item_data.text?.substring(0, 50) + '...'), null, 2));
        }
    } else {
        console.log('New contract not found!');
    }
}

main();
