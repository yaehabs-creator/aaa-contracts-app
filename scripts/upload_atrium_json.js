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

const JSON_PATH = join(rootDir, 'atrium_data.json');
const CONTRACT_NAME = "Contract #2: Atrium Construction Contract";
const CONTRACT_ID = "atrium-contract-002";

function removeUndefinedValues(obj) {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(item => removeUndefinedValues(item));
    if (typeof obj === 'object' && obj.constructor === Object) {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = removeUndefinedValues(value);
            }
        }
        return cleaned;
    }
    return obj;
}

async function main() {
    try {
        console.log('🚀 Starting Upload...');

        const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
        const { gc, pc } = JSON.parse(rawData);

        console.log(`   Loaded JSON: GC=${gc.length}, PC=${pc.length}`);

        console.log('\n💾 Connecting to Supabase...');

        // Cleanup
        await supabase.from('contract_items').delete().eq('contract_id', CONTRACT_ID);
        await supabase.from('contract_sections').delete().eq('contract_id', CONTRACT_ID);

        // Contract
        const contractMetadata = {
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

        const { error: mainError } = await supabase.from('contracts').upsert(contractMetadata);
        if (mainError) throw mainError;

        // Sections
        const sections = [
            { sectionType: 'GENERAL', title: 'General Conditions', items: gc },
            { sectionType: 'PARTICULAR', title: 'Particular Conditions', items: pc }
        ];

        for (const section of sections) {
            console.log(`   Saving ${section.sectionType}...`);
            const { error: sectionError } = await supabase
                .from('contract_sections')
                .upsert({
                    contract_id: CONTRACT_ID,
                    section_type: section.sectionType,
                    title: section.title,
                    item_count: section.items.length
                });
            if (sectionError) throw sectionError;

            const itemsToInsert = section.items.map((item, index) => ({
                contract_id: CONTRACT_ID,
                section_type: section.sectionType,
                order_index: index,
                item_data: removeUndefinedValues(item)
            }));

            // Batch
            for (let i = 0; i < itemsToInsert.length; i += 50) {
                const chunk = itemsToInsert.slice(i, i + 50);
                const { error: itemsError } = await supabase.from('contract_items').insert(chunk);
                if (itemsError) throw itemsError;
                process.stdout.write('.');
            }
            process.stdout.write('\n');
        }

        console.log('\n✅ Upload Complete!');

    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}

main();
