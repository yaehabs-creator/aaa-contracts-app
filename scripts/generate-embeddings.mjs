/**
 * Generate OpenAI Embeddings for Contract Document Chunks
 * 
 * Usage:
 *   node scripts/generate-embeddings.mjs
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

const ATRIUM_CONTRACT_ID = 'f8edad2c-e752-440a-bf84-0627eedb69fd';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 20;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('Missing VITE_OPENAI_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Generate embeddings for texts using OpenAI
 */
async function generateEmbeddings(texts) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: 1536
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Embedding failed');
  }

  const data = await response.json();
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

/**
 * Main function
 */
async function main() {
  console.log('Generate Embeddings for Atrium Document Chunks\n');

  // Get chunks without embeddings
  console.log('Fetching chunks without embeddings...');
  const { data: chunks, error } = await supabase
    .from('contract_document_chunks')
    .select('id, content')
    .eq('contract_id', ATRIUM_CONTRACT_ID)
    .is('embedding', null)
    .order('chunk_index');

  if (error) {
    console.error('Error fetching chunks:', error.message);
    process.exit(1);
  }

  if (!chunks || chunks.length === 0) {
    console.log('No chunks found without embeddings.');
    console.log('\nNote: Run the SQL from scripts/atrium-documents-data.sql first');
    console.log('to insert document chunks into the database.');
    return;
  }

  console.log(`Found ${chunks.length} chunks to embed\n`);

  let embedded = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.content.slice(0, 8000)); // Limit text length

    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}...`);

    try {
      const embeddings = await generateEmbeddings(texts);

      // Update each chunk with its embedding
      for (let j = 0; j < batch.length; j++) {
        const { error: updateError } = await supabase
          .from('contract_document_chunks')
          .update({ embedding: embeddings[j] })
          .eq('id', batch[j].id);

        if (updateError) {
          console.error(`  Failed to update chunk ${batch[j].id}: ${updateError.message}`);
          failed++;
        } else {
          embedded++;
        }
      }

      console.log(`  Embedded ${embedded} chunks so far`);

      // Rate limit - wait 200ms between batches
      await new Promise(r => setTimeout(r, 200));

    } catch (err) {
      console.error(`  Batch error: ${err.message}`);
      failed += batch.length;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Embedded: ${embedded}`);
  console.log(`Failed: ${failed}`);

  if (embedded > 0) {
    console.log('\nEmbeddings generated successfully!');
    console.log('OpenAI can now perform semantic search on document chunks.');
  }
}

main().catch(console.error);
