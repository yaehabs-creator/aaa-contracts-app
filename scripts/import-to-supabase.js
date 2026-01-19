/**
 * Import script to migrate data from exported JSON files to Supabase
 * 
 * Usage:
 * 1. Ensure migration-data/ directory exists with exported JSON files
 * 2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 * 3. Run: node scripts/import-to-supabase.js
 * 
 * Note: Uses service role key to bypass RLS for data migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these before running the import script.');
  process.exit(1);
}

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DATA_DIR = './migration-data';

async function importUsers() {
  console.log('📥 Importing users...');
  
  try {
    const usersData = await readFile(join(DATA_DIR, 'users.json'), 'utf-8');
    const users = JSON.parse(usersData);
    
    let imported = 0;
    let errors = 0;
    
    for (const user of users) {
      try {
        // First, create user in Supabase Auth (if not exists)
        // Note: This requires admin API access
        // For now, we'll just create the user profile in the database
        // Users will need to sign up/login through the app
        
        const { error } = await supabase
          .from('users')
          .upsert({
            uid: user.uid,
            email: user.email,
            display_name: user.displayName || user.display_name,
            role: user.role,
            created_at: user.createdAt,
            created_by: user.createdBy || null,
            last_login: user.lastLogin || null
          }, {
            onConflict: 'uid'
          });
        
        if (error) {
          console.error(`   ⚠️  Error importing user ${user.email}:`, error.message);
          errors++;
        } else {
          imported++;
        }
      } catch (error) {
        console.error(`   ⚠️  Error importing user ${user.email}:`, error.message);
        errors++;
      }
    }
    
    console.log(`✅ Imported ${imported} users (${errors} errors)`);
    return { imported, errors };
  } catch (error) {
    console.error('❌ Failed to import users:', error);
    throw error;
  }
}

async function importContracts() {
  console.log('📥 Importing contracts...');
  
  try {
    const contractsData = await readFile(join(DATA_DIR, 'contracts.json'), 'utf-8');
    const contracts = JSON.parse(contractsData);
    
    let imported = 0;
    let errors = 0;
    
    for (const contract of contracts) {
      try {
        // Import main contract document
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .upsert({
            id: contract.id,
            name: contract.name,
            timestamp: contract.timestamp,
            metadata: contract.metadata,
            clauses: contract.clauses || null,
            sections: contract.usesSubcollections ? null : (contract.sections || null),
            uses_subcollections: contract.usesSubcollections || false
          }, {
            onConflict: 'id'
          })
          .select()
          .single();
        
        if (contractError) {
          console.error(`   ⚠️  Error importing contract ${contract.id}:`, contractError.message);
          errors++;
          continue;
        }
        
        // If contract uses subcollections, import sections and items
        if (contract.usesSubcollections && contract.sections) {
          for (const section of contract.sections) {
            // Import section
            const { error: sectionError } = await supabase
              .from('contract_sections')
              .upsert({
                contract_id: contract.id,
                section_type: section.sectionType,
                title: section.title,
                item_count: section.items?.length || 0
              }, {
                onConflict: 'contract_id,section_type'
              });
            
            if (sectionError) {
              console.error(`   ⚠️  Error importing section ${section.sectionType}:`, sectionError.message);
              continue;
            }
            
            // Import items for this section
            if (section.items && section.items.length > 0) {
              const itemsToInsert = section.items.map((item, index) => ({
                contract_id: contract.id,
                section_type: section.sectionType,
                order_index: item.orderIndex ?? index,
                item_data: item
              }));
              
              // Delete existing items for this section
              await supabase
                .from('contract_items')
                .delete()
                .eq('contract_id', contract.id)
                .eq('section_type', section.sectionType);
              
              // Insert new items
              const { error: itemsError } = await supabase
                .from('contract_items')
                .insert(itemsToInsert);
              
              if (itemsError) {
                console.error(`   ⚠️  Error importing items for section ${section.sectionType}:`, itemsError.message);
              }
            }
          }
        }
        
        imported++;
      } catch (error) {
        console.error(`   ⚠️  Error importing contract ${contract.id}:`, error.message);
        errors++;
      }
    }
    
    console.log(`✅ Imported ${imported} contracts (${errors} errors)`);
    return { imported, errors };
  } catch (error) {
    console.error('❌ Failed to import contracts:', error);
    throw error;
  }
}

async function importActivityLogs() {
  console.log('📥 Importing activity logs...');
  
  try {
    const logsData = await readFile(join(DATA_DIR, 'activity_logs.json'), 'utf-8');
    const logs = JSON.parse(logsData);
    
    if (logs.length === 0) {
      console.log('✅ No activity logs to import');
      return { imported: 0, errors: 0 };
    }
    
    const logsToInsert = logs.map(log => ({
      id: log.id,
      action: log.action,
      contract_id: log.contractId || log.contract_id || null,
      user_id: log.userId || log.user_id || null,
      details: log.details || null,
      timestamp: log.timestamp || new Date().toISOString()
    }));
    
    // Insert in batches of 1000
    const batchSize = 1000;
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < logsToInsert.length; i += batchSize) {
      const batch = logsToInsert.slice(i, i + batchSize);
      const { error } = await supabase
        .from('activity_logs')
        .insert(batch);
      
      if (error) {
        console.error(`   ⚠️  Error importing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
      }
    }
    
    console.log(`✅ Imported ${imported} activity logs (${errors} errors)`);
    return { imported, errors };
  } catch (error) {
    console.error('❌ Failed to import activity logs:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Supabase data import...\n');
  
  try {
    const usersResult = await importUsers();
    console.log('');
    
    const contractsResult = await importContracts();
    console.log('');
    
    const logsResult = await importActivityLogs();
    console.log('');
    
    console.log('✅ Import completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Users: ${usersResult.imported} imported, ${usersResult.errors} errors`);
    console.log(`   - Contracts: ${contractsResult.imported} imported, ${contractsResult.errors} errors`);
    console.log(`   - Activity Logs: ${logsResult.imported} imported, ${logsResult.errors} errors`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

main();
