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
    console.log('=== CONTRACT #1 SCHEMA INSPECTION ===\n');

    // Find Contract #1
    const { data: contracts, error: cErr } = await supabase
        .from('contracts')
        .select('*')
        .ilike('name', '%Hassan Allam%');

    if (cErr || !contracts || contracts.length === 0) {
        console.error('Contract #1 not found!');
        return;
    }

    const contract1 = contracts[0];
    console.log('Contract #1:');
    console.log(`  ID: ${contract1.id}`);
    console.log(`  Name: ${contract1.name}`);
    console.log(`  Metadata:`, JSON.stringify(contract1.metadata, null, 2));
    console.log(`  Uses Subcollections: ${contract1.uses_subcollections}`);

    // Get sections
    const { data: sections, error: sErr } = await supabase
        .from('contract_sections')
        .select('*')
        .eq('contract_id', contract1.id);

    console.log(`\nSections (${sections?.length || 0}):`);
    sections?.forEach(s => {
        console.log(`  - ${s.section_type}: "${s.title}" (${s.item_count} items)`);
    });

    // Sample items from first section
    if (sections && sections.length > 0) {
        const { data: items, error: iErr } = await supabase
            .from('contract_items')
            .select('*')
            .eq('contract_id', contract1.id)
            .eq('section_type', sections[0].section_type)
            .order('order_index')
            .limit(5);

        console.log(`\nSample Items from ${sections[0].section_type}:`);
        items?.forEach((item, idx) => {
            const data = item.item_data;
            console.log(`  [${idx}] Order: ${item.order_index}`);
            console.log(`      Type: ${data.itemType}`);
            console.log(`      Number: ${data.clause_number || data.number || 'N/A'}`);
            console.log(`      Title: ${(data.clause_title || data.heading || '').substring(0, 50)}...`);
            console.log(`      Text Preview: ${(data.clause_text || data.text || '').substring(0, 60)}...`);
        });
    }

    console.log('\n=== SCHEMA FIELDS USED ===');
    if (sections && sections.length > 0) {
        const { data: sampleItem } = await supabase
            .from('contract_items')
            .select('item_data')
            .eq('contract_id', contract1.id)
            .limit(1)
            .single();

        if (sampleItem) {
            console.log('Fields in item_data:', Object.keys(sampleItem.item_data).join(', '));
        }
    }
}

main();
