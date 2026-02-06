import { createClient } from '@supabase/supabase-js';
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

async function fixAtriumContractSections() {
    console.log('=== FIXING ATRIUM CONTRACT SECTIONS ===\n');

    // 1. Get the Atrium contract
    const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .ilike('name', '%Atrium%');

    if (contractError || !contracts || contracts.length === 0) {
        console.error('❌ Error: Atrium contract not found!');
        return;
    }

    const atriumContract = contracts[0];
    console.log(`Found contract: ${atriumContract.name}`);
    console.log(`Contract ID: ${atriumContract.id}\n`);

    // 2. Check existing sections
    const { data: existingSections, error: sectionsError } = await supabase
        .from('contract_sections')
        .select('*')
        .eq('contract_id', atriumContract.id);

    if (sectionsError) {
        console.error('❌ Error fetching sections:', sectionsError);
        return;
    }

    console.log(`Existing sections: ${existingSections?.length || 0}`);
    existingSections?.forEach(section => {
        console.log(`   - ${section.section_type}: ${section.title}`);
    });
    console.log('');

    // 3. Ensure we have the GENERAL section
    const hasGeneralSection = existingSections?.some(s => s.section_type === 'GENERAL');

    if (!hasGeneralSection) {
        console.log('⚠️  GENERAL section missing! Creating it...');

        const { error: insertError } = await supabase
            .from('contract_sections')
            .insert({
                contract_id: atriumContract.id,
                section_type: 'GENERAL',
                title: 'General Conditions'
            });

        if (insertError) {
            console.error('❌ Error creating GENERAL section:', insertError);
            return;
        }

        console.log('✅ Created GENERAL section');
    } else {
        console.log('✅ GENERAL section exists');
    }

    // 4. Check and update contract_items to have correct section_type
    const { data: items, error: itemsError } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', atriumContract.id);

    if (itemsError) {
        console.error('❌ Error fetching items:', itemsError);
        return;
    }

    console.log(`\nTotal items: ${items?.length || 0}`);

    // Count items by section_type
    const sectionCounts = {};
    items?.forEach(item => {
        sectionCounts[item.section_type] = (sectionCounts[item.section_type] || 0) + 1;
    });

    console.log('Items by section:');
    Object.entries(sectionCounts).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
    });

    // 5. Fix items that don't have section_type set to GENERAL
    let fixedCount = 0;
    for (const item of items || []) {
        if (item.section_type !== 'GENERAL') {
            const { error: updateError } = await supabase
                .from('contract_items')
                .update({ section_type: 'GENERAL' })
                .eq('id', item.id);

            if (updateError) {
                console.error(`❌ Error updating item ${item.id}:`, updateError);
            } else {
                fixedCount++;
            }
        }
    }

    if (fixedCount > 0) {
        console.log(`\n✅ Fixed ${fixedCount} items to have section_type = GENERAL`);
    } else {
        console.log('\n✅ All items already have correct section_type');
    }

    console.log('\n=== FIX COMPLETE ===');
    console.log('Refresh your browser to see the changes!');
}

fixAtriumContractSections().catch(console.error);
