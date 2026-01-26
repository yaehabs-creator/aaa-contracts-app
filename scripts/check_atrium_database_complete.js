import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(rootDir, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAtriumContractComplete() {
    console.log('=== COMPLETE ATRIUM CONTRACT CHECK ===\n');

    // 1. Get the contract
    const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .ilike('name', '%Atrium%');

    if (contractError || !contracts || contracts.length === 0) {
        console.error('❌ No Atrium contract found!');
        return;
    }

    const contract = contracts[0];
    console.log('📋 CONTRACT METADATA:');
    console.log(`   ID: ${contract.id}`);
    console.log(`   Name: ${contract.name}`);
    console.log(`   Uses Subcollections: ${contract.uses_subcollections}`);
    console.log(`   Timestamp: ${new Date(contract.timestamp).toLocaleString()}`);
    console.log('');

    // 2. Get sections
    const { data: sections, error: sectionsError } = await supabase
        .from('contract_sections')
        .select('*')
        .eq('contract_id', contract.id);

    console.log('📁 SECTIONS:');
    if (sectionsError) {
        console.error('   ❌ Error:', sectionsError.message);
    } else {
        console.log(`   Total: ${sections?.length || 0}`);
        sections?.forEach(section => {
            console.log(`   - ${section.section_type}: "${section.title}"`);
        });
    }
    console.log('');

    // 3. Get items count by section
    const { data: items, error: itemsError } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', contract.id)
        .order('order_index');

    console.log('📄 CONTRACT ITEMS:');
    if (itemsError) {
        console.error('   ❌ Error:', itemsError.message);
        return;
    }

    console.log(`   Total Items: ${items?.length || 0}`);

    // Count by section type
    const bySectionType = {};
    items?.forEach(item => {
        bySectionType[item.section_type] = (bySectionType[item.section_type] || 0) + 1;
    });

    console.log('   By Section Type:');
    Object.entries(bySectionType).forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`);
    });
    console.log('');

    // 4. Check first 3 items structure
    console.log('🔍 SAMPLE ITEMS (first 3):');
    for (let i = 0; i < Math.min(3, items?.length || 0); i++) {
        const item = items[i];
        const data = item.item_data;

        console.log(`\n   Item ${i + 1}:`);
        console.log(`      Section: ${item.section_type}`);
        console.log(`      Order: ${item.order_index}`);
        console.log(`      Clause #: ${data.clause_number || 'N/A'}`);
        console.log(`      Title: ${data.clause_title || 'N/A'}`);
        console.log(`      Item Type: ${data.itemType || 'N/A'}`);
        console.log(`      Condition Type: ${data.condition_type || 'N/A'}`);
        console.log(`      Has clause_text: ${!!data.clause_text}`);
        console.log(`      Has general_condition: ${!!data.general_condition}`);
        console.log(`      Has comparison: ${!!data.comparison}`);
        console.log(`      Has time_frames: ${!!data.time_frames}`);
    }
    console.log('');

    // 5. Export full contract to JSON for inspection
    const exportData = {
        contract: {
            id: contract.id,
            name: contract.name,
            uses_subcollections: contract.uses_subcollections,
            timestamp: contract.timestamp
        },
        sections: sections,
        items: items?.map(item => ({
            section_type: item.section_type,
            order_index: item.order_index,
            item_data: item.item_data
        }))
    };

    const exportPath = join(rootDir, 'atrium_contract_database_export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`📦 Full contract exported to: atrium_contract_database_export.json`);
    console.log('');

    // 6. Summary
    console.log('=== SUMMARY ===');
    console.log(`✅ Contract exists: ${contract.name}`);
    console.log(`✅ Sections: ${sections?.length || 0}`);
    console.log(`✅ Total items: ${items?.length || 0}`);
    console.log(`✅ Uses subcollections: ${contract.uses_subcollections ? 'YES' : 'NO'}`);
}

checkAtriumContractComplete().catch(console.error);
