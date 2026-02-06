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
const CONTRACT_ID = "atrium-contract-002";
const JSON_PATH = join(rootDir, 'atrium_data.json');

async function main() {
    console.log('--- Checking File ---');
    if (fs.existsSync(JSON_PATH)) {
        const stats = fs.statSync(JSON_PATH);
        console.log(`File exists. Size: ${stats.size} bytes`);
        try {
            const raw = fs.readFileSync(JSON_PATH, 'utf-8');
            console.log(`Read ${raw.length} chars.`);
            const json = JSON.parse(raw);
            console.log(`JSON valid. GC: ${json.gc.length}, PC: ${json.pc.length}`);
        } catch (e) {
            console.error('File Read/Parse Error:', e.message);
        }
    } else {
        console.error('File NOT found!');
    }

    console.log('--- Checking DB ---');
    const { count, error } = await supabase
        .from('contract_items')
        .select('*', { count: 'exact', head: true })
        .eq('contract_id', CONTRACT_ID);

    if (error) console.error('DB Error:', error);
    else console.log(`Items in DB for ${CONTRACT_ID}: ${count}`);
}

main();
