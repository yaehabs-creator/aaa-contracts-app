/**
 * Delete ALL Documents from Supabase Database and Storage
 * 
 * Run with: node scripts/delete-all-documents.js
 * 
 * Make sure you have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const STORAGE_BUCKET = 'contract-documents';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deleteAllDocuments() {
  console.log('🗑️  Starting document deletion...\n');

  try {
    // Step 1: Get all documents to find their file paths
    console.log('📋 Fetching all documents...');
    const { data: documents, error: fetchError } = await supabase
      .from('contract_documents')
      .select('id, file_path, name');

    if (fetchError) {
      console.error('❌ Error fetching documents:', fetchError.message);
      return;
    }

    console.log(`   Found ${documents?.length || 0} documents\n`);

    // Step 2: Delete from storage bucket
    if (documents && documents.length > 0) {
      console.log('🗂️  Deleting files from storage...');
      const filePaths = documents.map(d => d.file_path).filter(Boolean);
      
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(filePaths);

        if (storageError) {
          console.warn('⚠️  Storage deletion warning:', storageError.message);
        } else {
          console.log(`   ✅ Deleted ${filePaths.length} files from storage\n`);
        }
      }
    }

    // Step 3: Delete database records (order matters due to foreign keys)
    const tables = [
      'ingestion_jobs',
      'document_overrides', 
      'clause_references',
      'contract_document_chunks',
      'contract_documents'
    ];

    for (const table of tables) {
      console.log(`🗑️  Deleting from ${table}...`);
      const { error, count } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (workaround for no WHERE clause)

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Deleted records from ${table}`);
      }
    }

    // Step 4: Verify deletion
    console.log('\n📊 Verification:');
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      console.log(`   ${table}: ${count || 0} records remaining`);
    }

    console.log('\n✅ Document deletion complete!');
    console.log('\n💡 Note: If any files remain in storage, manually clear them in Supabase Dashboard:');
    console.log('   Storage > contract-documents > Select all > Delete');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Run the deletion
deleteAllDocuments();
