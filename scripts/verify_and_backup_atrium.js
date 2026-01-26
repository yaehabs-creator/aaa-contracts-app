/**
 * Verify and backup Atrium contract data
 * Ensures data is correctly saved and creates a local backup
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const ATRIUM_CONTRACT_ID = 'cfb1883c-bf70-410d-afe2-8273467ea099';

async function verifyAndBackup() {
    console.log('=== VERIFYING ATRIUM CONTRACT DATA ===\n');
    
    // 1. Verify contract exists
    console.log('1. Checking contract...');
    const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', ATRIUM_CONTRACT_ID)
        .single();
    
    if (contractError || !contract) {
        console.error('❌ Contract not found!', contractError);
        return;
    }
    console.log(`   ✅ Contract: ${contract.name}`);
    console.log(`   ✅ ID: ${contract.id}`);
    console.log(`   ✅ Created: ${contract.created_at}`);
    
    // 2. Verify sections
    console.log('\n2. Checking sections...');
    const { data: sections, error: sectionsError } = await supabase
        .from('contract_sections')
        .select('*')
        .eq('contract_id', ATRIUM_CONTRACT_ID);
    
    if (sectionsError) {
        console.error('❌ Error fetching sections:', sectionsError);
    } else {
        console.log(`   ✅ Found ${sections.length} sections:`);
        sections.forEach(s => console.log(`      - ${s.section_type}: ${s.title}`));
    }
    
    // 3. Verify clauses
    console.log('\n3. Checking clauses...');
    const { data: items, error: itemsError } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', ATRIUM_CONTRACT_ID)
        .order('order_index');
    
    if (itemsError) {
        console.error('❌ Error fetching items:', itemsError);
        return;
    }
    
    console.log(`   ✅ Total clauses: ${items.length}`);
    
    // Count clauses with GC and PC
    let gcOnly = 0;
    let pcOnly = 0;
    let both = 0;
    let empty = 0;
    
    for (const item of items) {
        const data = item.item_data;
        const hasGC = data.general_condition && data.general_condition.length > 0;
        const hasPC = data.particular_condition && data.particular_condition.length > 0;
        
        if (hasGC && hasPC) both++;
        else if (hasGC) gcOnly++;
        else if (hasPC) pcOnly++;
        else empty++;
    }
    
    console.log(`   ✅ GC only: ${gcOnly}`);
    console.log(`   ✅ PC only: ${pcOnly}`);
    console.log(`   ✅ Both GC + PC: ${both}`);
    if (empty > 0) console.log(`   ⚠️ Empty clauses: ${empty}`);
    
    // 4. Show sample clauses with PC
    console.log('\n4. Sample clauses with Particular Conditions:');
    const clausesWithPC = items.filter(i => i.item_data.particular_condition && i.item_data.particular_condition.length > 0);
    clausesWithPC.slice(0, 10).forEach(item => {
        const d = item.item_data;
        console.log(`   ${d.clause_number}: ${d.clause_title}`);
        console.log(`      GC: ${d.general_condition ? d.general_condition.substring(0, 50) + '...' : '(none)'}`);
        console.log(`      PC: ${d.particular_condition.substring(0, 50)}...`);
    });
    
    // 5. Create backup
    console.log('\n5. Creating local backup...');
    
    const backup = {
        exportDate: new Date().toISOString(),
        contract: contract,
        sections: sections,
        items: items,
        stats: {
            totalClauses: items.length,
            gcOnly,
            pcOnly,
            both,
            empty
        }
    };
    
    const backupPath = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupPath, `atrium_backup_${timestamp}.json`);
    
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`   ✅ Backup saved: ${backupFile}`);
    
    // Also save a "latest" backup
    const latestBackup = path.join(backupPath, 'atrium_latest_backup.json');
    fs.writeFileSync(latestBackup, JSON.stringify(backup, null, 2));
    console.log(`   ✅ Latest backup: ${latestBackup}`);
    
    // 6. Summary
    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log(`Contract: ${contract.name}`);
    console.log(`Total Clauses: ${items.length}`);
    console.log(`Clauses with both GC & PC: ${both}`);
    console.log(`Backup Location: ${backupFile}`);
    console.log('\n✅ Data is verified and backed up!');
}

verifyAndBackup().catch(console.error);
