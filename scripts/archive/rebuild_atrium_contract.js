/**
 * Script to rebuild the Atrium contract in Supabase
 * Step 1: Delete existing Atrium contract
 * Step 2: Create new contract with General Conditions from JSON
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function rebuildAtriumContract() {
  console.log('=== Rebuilding Atrium Contract ===\n');

  // Step 1: Find and delete existing Atrium contract
  console.log('Step 1: Finding existing Atrium contract...');
  
  const { data: existingContracts, error: findError } = await supabase
    .from('contracts')
    .select('id, name')
    .ilike('name', '%atrium%');

  if (findError) {
    console.error('Error finding contracts:', findError);
    return;
  }

  console.log(`Found ${existingContracts?.length || 0} Atrium contract(s):`, existingContracts?.map(c => `${c.name} (${c.id})`));

  // Delete existing Atrium contracts
  for (const contract of (existingContracts || [])) {
    console.log(`\nDeleting contract: ${contract.name} (${contract.id})`);
    
    // Delete contract_items first
    const { error: itemsError } = await supabase
      .from('contract_items')
      .delete()
      .eq('contract_id', contract.id);
    
    if (itemsError) {
      console.error('Error deleting items:', itemsError);
    } else {
      console.log('  - Deleted contract_items');
    }

    // Delete contract_sections
    const { error: sectionsError } = await supabase
      .from('contract_sections')
      .delete()
      .eq('contract_id', contract.id);
    
    if (sectionsError) {
      console.error('Error deleting sections:', sectionsError);
    } else {
      console.log('  - Deleted contract_sections');
    }

    // Delete the contract
    const { error: contractError } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contract.id);
    
    if (contractError) {
      console.error('Error deleting contract:', contractError);
    } else {
      console.log('  - Deleted contract');
    }
  }

  // Step 2: Load the JSON file
  console.log('\nStep 2: Loading Atrium_GC_Contract.json...');
  
  const jsonPath = path.join(__dirname, '..', 'Atrium_GC_Contract.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  console.log(`Loaded ${jsonData.clauses.length} clauses from JSON`);

  // Step 3: Create new contract
  console.log('\nStep 3: Creating new Atrium contract...');
  
  const contractId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const { error: createError } = await supabase
    .from('contracts')
    .insert({
      id: contractId,
      name: 'Atrium General Conditions',
      created_at: now,
      updated_at: now
    });

  if (createError) {
    console.error('Error creating contract:', createError);
    return;
  }
  
  console.log(`Created contract with ID: ${contractId}`);

  // Step 4: Create sections
  console.log('\nStep 4: Creating sections...');
  
  const sections = [
    { contract_id: contractId, section_type: 'GENERAL', order_index: 0 },
    { contract_id: contractId, section_type: 'PARTICULAR', order_index: 1 }
  ];
  
  const { error: sectionsCreateError } = await supabase
    .from('contract_sections')
    .insert(sections);

  if (sectionsCreateError) {
    console.error('Error creating sections:', sectionsCreateError);
    return;
  }
  
  console.log('Created GENERAL and PARTICULAR sections');

  // Step 5: Insert all clauses as GENERAL items
  console.log('\nStep 5: Inserting clauses...');
  
  const clauseItems = jsonData.clauses.map((clause, index) => ({
    contract_id: contractId,
    section_type: 'GENERAL',
    order_index: index,
    item_data: {
      itemType: 'CLAUSE',
      clause_number: clause.clause_number,
      clause_title: clause.clause_title,
      clause_text: clause.clause_text || clause.general_condition || '',
      general_condition: clause.general_condition || clause.clause_text || '',
      particular_condition: '',
      condition_type: 'General',
      has_time_frame: clause.has_time_frame || false,
      time_frames: clause.time_frames || [],
      comparison: clause.comparison || [],
      orderIndex: index
    }
  }));

  // Insert in batches of 50 to avoid timeout
  const batchSize = 50;
  let insertedCount = 0;
  
  for (let i = 0; i < clauseItems.length; i += batchSize) {
    const batch = clauseItems.slice(i, i + batchSize);
    
    const { error: insertError } = await supabase
      .from('contract_items')
      .insert(batch);

    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
    } else {
      insertedCount += batch.length;
      console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} clauses (total: ${insertedCount})`);
    }
  }

  // Step 6: Verify
  console.log('\nStep 6: Verifying...');
  
  const { data: verifyItems, error: verifyError } = await supabase
    .from('contract_items')
    .select('id, item_data')
    .eq('contract_id', contractId);

  if (verifyError) {
    console.error('Error verifying:', verifyError);
  } else {
    console.log(`\n✅ SUCCESS! Contract created with ${verifyItems.length} clauses`);
    console.log(`\nContract ID: ${contractId}`);
    console.log('Contract Name: Atrium General Conditions');
    console.log('\nSample clauses:');
    verifyItems.slice(0, 5).forEach(item => {
      const data = item.item_data;
      console.log(`  - ${data.clause_number}: ${data.clause_title}`);
    });
  }
}

rebuildAtriumContract().catch(console.error);
