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

async function checkAtriumContract() {
    console.log('=== CHECKING ATRIUM CONTRACT ===\n');

    // 1. Find Atrium contract
    const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .ilike('name', '%Atrium%');

    if (contractError || !contracts || contracts.length === 0) {
        console.error('❌ No Atrium contract found!');
        return;
    }

    console.log(`Found ${contracts.length} Atrium contract(s):`);
    contracts.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.name} (ID: ${c.id})`);
    });
    console.log('');

    const atriumContract = contracts[0];
    
    // 2. Check sections
    console.log(`\nChecking sections for: ${atriumContract.id}`);
    const { data: sections, error: sectionsError } = await supabase
        .from('contract_sections')
        .select('*')
        .eq('contract_id', atriumContract.id);
    
    console.log('Sections:', sections?.length || 0);
    if (sections) {
        sections.forEach(s => console.log(`  - ${s.section_type}`));
    }
    
    // 3. Check items
    console.log(`\nChecking items for: ${atriumContract.id}`);
    const { data: items, error: itemsError } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', atriumContract.id);
    
    console.log('Items:', items?.length || 0);
    
    // 4. Check if contract has JSON sections
    console.log('\nContract data:');
    console.log('  has sections field:', !!atriumContract.sections);
    if (atriumContract.sections) {
        console.log('  sections:', JSON.stringify(atriumContract.sections).substring(0, 200) + '...');
    }
}

checkAtriumContract().catch(console.error);
