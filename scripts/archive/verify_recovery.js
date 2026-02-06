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
    console.log('--- Verifying Contracts ---');
    const { data: contracts, error } = await supabase.from('contracts').select('*');
    if (error) {
        console.error('Error fetching contracts:', error);
        return;
    }

    console.log(`Found ${contracts.length} contracts.`);
    contracts.forEach(c => {
        console.log(`- [${c.id}] ${c.name} (Metadata: ${JSON.stringify(c.metadata)})`);
    });

    // Check items for a known contract 1
    const c1 = contracts.find(c => c.name.includes('Contract #1') || c.id.includes('professional'));
    if (c1) {
        const { count } = await supabase.from('contract_items').select('*', { count: 'exact', head: true }).eq('contract_id', c1.id);
        console.log(`\nContract #1 (${c1.name}) has ${count} items.`);
    } else {
        console.error('\n⚠️ Contract #1 NOT FOUND!');
    }
}

main();
