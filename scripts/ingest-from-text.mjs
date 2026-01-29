/**
 * Ingest Atrium Documents from Pre-extracted Text Files
 * Uses service role key for direct database access
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const ATRIUM_CONTRACT_ID = 'f8edad2c-e752-440a-bf84-0627eedb69fd';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Simple chunking
function chunk(text, size = 5000) {
  const result = [];
  for (let i = 0; i < text.length; i += size) {
    const c = text.substring(i, i + size).trim();
    if (c.length > 50) result.push(c);
  }
  return result;
}

// Hash
function hash(s) {
  let h = 0;
  for (let i = 0; i < Math.min(s.length, 200); i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h).toString(16).padStart(8, '0');
}

async function main() {
  console.log('Atrium Document Ingestion from Text Files\n');

  // 1. Ensure contract exists
  console.log('1. Creating/updating contract...');
  const { error: contractError } = await supabase
    .from('contracts')
    .upsert({
      id: ATRIUM_CONTRACT_ID,
      name: 'Atrium GC (General Conditions)',
      timestamp: Date.now(),
      metadata: { type: 'FIDIC', project: 'Atrium' }
    }, { onConflict: 'id' });

  if (contractError) {
    console.error('Contract error:', contractError.message);
    process.exit(1);
  }
  console.log('   Contract ready\n');

  // 2. Create document records
  console.log('2. Creating document records...');
  
  const docs = [
    { group: 'C', seq: 1, name: 'General Conditions', file: 'C001_General_Conditions.pdf', pages: 39 },
    { group: 'C', seq: 2, name: 'Particular Conditions', file: 'C002_Particular_Conditions.pdf', pages: 15 }
  ];

  for (const doc of docs) {
    const { error } = await supabase
      .from('contract_documents')
      .upsert({
        contract_id: ATRIUM_CONTRACT_ID,
        document_group: doc.group,
        name: doc.name,
        original_filename: doc.file,
        file_path: `contracts/${ATRIUM_CONTRACT_ID}/${doc.group}/${doc.file}`,
        file_type: 'pdf',
        page_count: doc.pages,
        sequence_number: doc.seq,
        status: 'completed'
      }, { onConflict: 'contract_id,document_group,sequence_number' });

    if (error) {
      console.error(`   Error creating ${doc.name}:`, error.message);
    } else {
      console.log(`   Created: ${doc.name}`);
    }
  }

  // 3. Get document IDs
  const { data: docRecords } = await supabase
    .from('contract_documents')
    .select('id, sequence_number, name')
    .eq('contract_id', ATRIUM_CONTRACT_ID)
    .eq('document_group', 'C');

  const gcDoc = docRecords?.find(d => d.sequence_number === 1);
  const pcDoc = docRecords?.find(d => d.sequence_number === 2);

  if (!gcDoc || !pcDoc) {
    console.error('Could not find document records');
    process.exit(1);
  }

  console.log(`   GC Document ID: ${gcDoc.id}`);
  console.log(`   PC Document ID: ${pcDoc.id}\n`);

  // 4. Delete old chunks
  console.log('3. Deleting old chunks...');
  await supabase
    .from('contract_document_chunks')
    .delete()
    .eq('contract_id', ATRIUM_CONTRACT_ID);
  console.log('   Done\n');

  // 5. Read and chunk text files
  console.log('4. Processing text files...');
  
  const gcText = readFileSync(join(PROJECT_ROOT, 'contract_import_debug/cleanText_GC.txt'), 'utf-8');
  const pcText = readFileSync(join(PROJECT_ROOT, 'contract_import_debug/cleanText_PC.txt'), 'utf-8');
  
  console.log(`   GC: ${gcText.length} chars`);
  console.log(`   PC: ${pcText.length} chars`);

  const gcChunks = chunk(gcText);
  const pcChunks = chunk(pcText);

  console.log(`   GC chunks: ${gcChunks.length}`);
  console.log(`   PC chunks: ${pcChunks.length}\n`);

  // 6. Insert GC chunks
  console.log('5. Inserting GC chunks...');
  for (let i = 0; i < gcChunks.length; i++) {
    const c = gcChunks[i];
    const clauseMatch = c.match(/^(?:Clause|Sub-Clause)?\s*(\d+(?:\.\d+)*)/i);
    
    const { error } = await supabase
      .from('contract_document_chunks')
      .insert({
        document_id: gcDoc.id,
        contract_id: ATRIUM_CONTRACT_ID,
        chunk_index: i,
        content: c,
        content_hash: hash(c),
        content_type: 'text',
        clause_number: clauseMatch ? clauseMatch[1] : null,
        token_count: Math.ceil(c.length / 4),
        metadata: { group: 'C' }
      });

    if (error) {
      console.error(`   Chunk ${i} error:`, error.message);
    }
  }
  console.log(`   Inserted ${gcChunks.length} GC chunks\n`);

  // 7. Insert PC chunks
  console.log('6. Inserting PC chunks...');
  for (let i = 0; i < pcChunks.length; i++) {
    const c = pcChunks[i];
    const clauseMatch = c.match(/^(?:Clause|Sub-Clause)?\s*(\d+(?:\.\d+)*)/i);
    
    const { error } = await supabase
      .from('contract_document_chunks')
      .insert({
        document_id: pcDoc.id,
        contract_id: ATRIUM_CONTRACT_ID,
        chunk_index: i,
        content: c,
        content_hash: hash(c),
        content_type: 'text',
        clause_number: clauseMatch ? clauseMatch[1] : null,
        token_count: Math.ceil(c.length / 4),
        metadata: { group: 'C' }
      });

    if (error) {
      console.error(`   Chunk ${i} error:`, error.message);
    }
  }
  console.log(`   Inserted ${pcChunks.length} PC chunks\n`);

  // 8. Verify
  console.log('7. Verifying...');
  const { data: verifyDocs } = await supabase
    .from('contract_documents')
    .select('name, page_count')
    .eq('contract_id', ATRIUM_CONTRACT_ID);

  const { count: chunkCount } = await supabase
    .from('contract_document_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('contract_id', ATRIUM_CONTRACT_ID);

  console.log(`   Documents: ${verifyDocs?.length || 0}`);
  verifyDocs?.forEach(d => console.log(`     - ${d.name} (${d.page_count} pages)`));
  console.log(`   Total chunks: ${chunkCount || 0}`);

  console.log('\n✅ Ingestion complete!');
  console.log('\nNext: Run embeddings with:');
  console.log('  node scripts/generate-embeddings.mjs');
}

main().catch(console.error);
