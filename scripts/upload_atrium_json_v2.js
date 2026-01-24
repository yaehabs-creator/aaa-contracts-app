import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env.local');

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const JSON_PATH = join(rootDir, 'atrium_data.json');
const CONTRACT_NAME = "Contract #2: Atrium Construction Contract";
const CONTRACT_ID = "c0000002-0000-0000-0000-000000000000"; // Valid UUID

async function main() {
    try {
        console.log('Starting Upload v2...');
        const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
        const { gc, pc } = JSON.parse(rawData);
        console.log(`Loaded JSON: GC=${gc.length}, PC=${pc.length}`);

        // Clean Payload
        const cleanItem = (item) => JSON.parse(JSON.stringify(item));

        console.log('Deleting existing items...');
        await supabase.from('contract_items').delete().eq('contract_id', CONTRACT_ID);
        console.log('Deleted items.');

        console.log('Deleting existing sections...');
        await supabase.from('contract_sections').delete().eq('contract_id', CONTRACT_ID);
        console.log('Deleted sections.');

        console.log('Upserting contract...');
        const meta = {
            id: CONTRACT_ID,
            name: CONTRACT_NAME,
            timestamp: Date.now(),
            metadata: {
                totalClauses: gc.length + pc.length,
                generalCount: gc.length,
                particularCount: pc.length,
                highRiskCount: 0,
                conflictCount: 0
            },
            uses_subcollections: true
        };
        const { error: mErr } = await supabase.from('contracts').upsert(meta);
        if (mErr) throw mErr;
        console.log('Contract upserted.');

        const sections = [
            { type: 'GENERAL', title: 'General Conditions', items: gc },
            { type: 'PARTICULAR', title: 'Particular Conditions', items: pc }
        ];

        for (const sec of sections) {
            console.log(`Processing ${sec.type} section...`);
            const { error: sErr } = await supabase.from('contract_sections').upsert({
                contract_id: CONTRACT_ID,
                section_type: sec.type,
                title: sec.title,
                item_count: sec.items.length
            });
            if (sErr) throw sErr;

            const items = sec.items.map((item, idx) => ({
                contract_id: CONTRACT_ID,
                section_type: sec.type,
                order_index: idx,
                item_data: cleanItem(item)
            }));

            console.log(`Inserting ${items.length} items for ${sec.type}...`);
            const BATCH_SIZE = 20;
            for (let i = 0; i < items.length; i += BATCH_SIZE) {
                const chunk = items.slice(i, i + BATCH_SIZE);
                const { error: iErr } = await supabase.from('contract_items').insert(chunk);
                if (iErr) {
                    console.error('Insert Error:', iErr);
                    throw iErr;
                }
            }
            console.log(`Done SECTION ${sec.type}.`);
        }

        console.log('Success!');
    } catch (e) {
        console.error('Crash:', e);
    }
}

main();
