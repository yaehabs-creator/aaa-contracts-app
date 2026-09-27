/**
 * Step 1: Upload Contract JSON Files to Supabase
 * Reads all PKG*.json files from "Finished Contracts" folder
 * and imports them into contract_documents + contract_document_chunks tables.
 *
 * Usage: node scripts/upload_contracts.js
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONTRACTS_FOLDER = path.join(__dirname, '..', 'Finished Contracts');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ──────────────────────────────────────────────────
// Helper: simple content hash
// ──────────────────────────────────────────────────
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

// ──────────────────────────────────────────────────
// Helper: chunk a long string into ~1000-char pieces
// ──────────────────────────────────────────────────
function chunkText(text, maxChars = 3000) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += ' ' + s;
    }
  }
  if (current.trim().length > 30) chunks.push(current.trim());
  return chunks;
}

// ──────────────────────────────────────────────────
// Batch insert (50 rows at a time)
// ──────────────────────────────────────────────────
async function batchInsertChunks(rows) {
  const SIZE = 50;
  let total = 0;
  for (let i = 0; i < rows.length; i += SIZE) {
    const batch = rows.slice(i, i + SIZE);
    const { error } = await supabase.from('contract_document_chunks').insert(batch);
    if (error) {
      console.warn(`  ⚠️  Chunk batch ${Math.floor(i / SIZE) + 1} error: ${error.message}`);
    } else {
      total += batch.length;
      process.stdout.write(`\r  📦 Chunks saved: ${total}/${rows.length}`);
    }
  }
  console.log('');
  return total;
}

// ──────────────────────────────────────────────────
// Process one PKG JSON file
// ──────────────────────────────────────────────────
async function processPackage(filePath) {
  const filename = path.basename(filePath);
  console.log(`\n📂 Processing: ${filename}`);

  let jsonData;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    jsonData = JSON.parse(raw);
  } catch (err) {
    console.error(`  ❌ Could not read/parse ${filename}: ${err.message}`);
    return;
  }

  const pkg = jsonData.contract_package || filename.replace(' Contract.json', '');
  const contractName = jsonData.contract_name || `${pkg} Contract - Mivida Gardens`;
  const projectName = jsonData.project || 'Mivida Gardens';

  // ── 1. Find or create contract row ──────────────
  // Check if contract already exists by name
  const { data: existing } = await supabase
    .from('contracts')
    .select('id')
    .eq('name', contractName)
    .maybeSingle();

  let contractRow;
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('contracts')
      .update({
        timestamp: Date.now(),
        metadata: {
          package: pkg,
          project: projectName,
          total_documents: jsonData.total_documents || 0,
          total_clauses: jsonData.summary?.total_clauses || 0,
          parties: jsonData.summary?.identified_parties || [],
          source_file: filename
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) { console.error(`  ❌ Failed to update contract: ${error.message}`); return; }
    contractRow = data;
    console.log(`  ♻️  Updating existing contract record...`);
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        name: contractName,
        timestamp: Date.now(),
        metadata: {
          package: pkg,
          project: projectName,
          total_documents: jsonData.total_documents || 0,
          total_clauses: jsonData.summary?.total_clauses || 0,
          parties: jsonData.summary?.identified_parties || [],
          source_file: filename
        }
      })
      .select('id')
      .single();
    if (error) { console.error(`  ❌ Failed to insert contract: ${error.message}`); return; }
    contractRow = data;
  }

  if (!contractRow) {
    console.error(`  ❌ Could not get contract row`);
    return;
  }

  const contractId = contractRow.id;
  console.log(`  ✅ Contract ID: ${contractId}`);

  // Delete old documents & chunks for this contract (clean re-import)
  await supabase.from('contract_document_chunks').delete().eq('contract_id', contractId);
  await supabase.from('contract_documents').delete().eq('contract_id', contractId);

  const documents = jsonData.documents || [];
  if (documents.length === 0) {
    console.warn(`  ⚠️  No documents found in ${filename}`);
    return;
  }

  let totalChunks = 0;

  for (let docIdx = 0; docIdx < documents.length; docIdx++) {
    const doc = documents[docIdx];
    const meta = doc.document_metadata || {};
    const docName = meta.document_name || `Document ${docIdx + 1}`;
    const docType = meta.document_type || 'General';

    // Determine standard group code (A, B, C, D, I, N)
    let group = 'N';
    const combined = `${docType} ${docName}`.toLowerCase();
    if (combined.includes('letter of acceptance') || combined.includes('loa')) group = 'B';
    else if (combined.includes('general condition') || combined.includes('particular condition') || combined.includes('fidic')) group = 'C';
    else if (combined.includes('agreement') || combined.includes('form of')) group = 'A';
    else if (combined.includes('boq') || combined.includes('bill of quantit') || combined.includes('priced')) group = 'I';
    else if (combined.includes('addend')) group = 'D';

    // ── 2. Insert contract_document row ──────────
    const { data: docRow, error: docErr } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: contractId,
        document_group: group,
        name: docName,
        original_filename: docName,
        file_type: 'json',
        page_count: (doc.document_structure || []).length,
        sequence_number: docIdx + 1,
        status: 'completed',
        processed_at: new Date().toISOString(),
        processing_metadata: {
          document_type: docType,
          contract_package: pkg,
          date: meta.date || null,
          parties: meta.parties || []
        }
      })
      .select('id')
      .single();

    if (docErr || !docRow) {
      console.warn(`  ⚠️  Failed to insert document ${docIdx + 1}: ${docErr?.message}`);
      continue;
    }

    const documentId = docRow.id;

    // ── 3. Build chunks from document_structure (pages) ──
    const chunkRows = [];
    const pages = doc.document_structure || [];
    let chunkIdx = 0;

    for (const page of pages) {
      const pageContent = page.content || '';
      if (pageContent.trim().length < 20) continue;

      // Split long pages into smaller chunks
      const pieces = pageContent.length > 3000 ? chunkText(pageContent, 3000) : [pageContent];
      for (const piece of pieces) {
        chunkRows.push({
          document_id: documentId,
          contract_id: contractId,
          chunk_index: chunkIdx++,
          content: piece,
          content_hash: simpleHash(piece),
          content_type: 'text',
          clause_number: null,
          clause_title: page.heading || null,
          page_number: page.page || null,
          token_count: Math.ceil(piece.length / 4),
          metadata: { group, document_type: docType, package: pkg }
        });
      }
    }

    // Also add explicit clause chunks if available
    const clauses = doc.clauses || [];
    for (const clause of clauses) {
      const clauseContent = clause.content || '';
      if (clauseContent.trim().length < 10) continue;

      const pieces = clauseContent.length > 3000 ? chunkText(clauseContent, 3000) : [clauseContent];
      for (const piece of pieces) {
        chunkRows.push({
          document_id: documentId,
          contract_id: contractId,
          chunk_index: chunkIdx++,
          content: piece,
          content_hash: simpleHash(`clause-${clause.clause_number}-${piece}`),
          content_type: 'clause',
          clause_number: String(clause.clause_number || ''),
          clause_title: clause.clause_title || null,
          page_number: clause.page || null,
          token_count: Math.ceil(piece.length / 4),
          metadata: { group, document_type: docType, package: pkg }
        });
      }
    }

    if (chunkRows.length > 0) {
      console.log(`  📄 Document ${docIdx + 1}/${documents.length}: "${docName.substring(0, 60)}" → ${chunkRows.length} chunks`);
      const saved = await batchInsertChunks(chunkRows);
      totalChunks += saved;
    }
  }

  console.log(`  🎉 Package ${pkg} done! Total chunks saved: ${totalChunks}`);
}

// ──────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────
async function main() {
  console.log('🚀 Contract Upload Script');
  console.log(`📁 Reading from: ${CONTRACTS_FOLDER}`);
  console.log(`🌐 Supabase: ${SUPABASE_URL}\n`);

  // Get all PKG*.json files
  let files;
  try {
    files = fs.readdirSync(CONTRACTS_FOLDER)
      .filter(f => f.startsWith('PKG') && f.endsWith('.json'))
      .map(f => path.join(CONTRACTS_FOLDER, f));
  } catch (err) {
    console.error(`❌ Cannot read folder: ${err.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('❌ No PKG*.json files found in the Finished Contracts folder');
    process.exit(1);
  }

  console.log(`Found ${files.length} contract file(s):\n`);
  files.forEach(f => {
    const sizeMB = (fs.statSync(f).size / 1024 / 1024).toFixed(1);
    console.log(`  • ${path.basename(f)} (${sizeMB} MB)`);
  });

  console.log('\n⏳ Starting upload (large files may take a few minutes)...\n');

  for (const file of files) {
    await processPackage(file);
  }

  // Final summary
  console.log('\n\n══════════════════════════════════════');
  console.log('✅ All contracts uploaded successfully!');
  console.log('══════════════════════════════════════');
  console.log('\nYou can now:');
  console.log('  1. Open your app and go to the Chat section');
  console.log('  2. Select a contract package');
  console.log('  3. Ask questions like "What is the contract sum?" or "What are the payment terms?"');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
