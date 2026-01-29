/**
 * Atrium Contract Document Ingestion Script
 * 
 * Uploads PDFs from atrium-documents/ folder, extracts text,
 * stores in Supabase, and chunks for semantic search.
 * 
 * Usage:
 *   node scripts/ingest-atrium-documents.mjs
 *   node scripts/ingest-atrium-documents.mjs --embeddings  # Also generate embeddings
 * 
 * Requirements:
 *   - PDF files in atrium-documents/ folder following naming convention
 *   - .env.local with Supabase and OpenAI credentials
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile, stat } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const DOCUMENTS_DIR = join(PROJECT_ROOT, 'atrium-documents');

// Atrium Contract ID from atrium_data.json
const ATRIUM_CONTRACT_ID = 'f8edad2c-e752-440a-bf84-0627eedb69fd';

// Configuration - prioritize service role key for RLS bypass
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.SUPABASE_SERVICE_ROLE_KEY ||
                     process.env.VITE_SUPABASE_ANON_KEY ||
                     process.env.SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const STORAGE_BUCKET = 'contract-docs';

// Validate environment
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_ROLE_KEY (recommended) or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Check if using service role key (required for RLS bypass)
const isServiceRole = SUPABASE_KEY?.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9') && 
                      SUPABASE_KEY?.length > 200;
if (!isServiceRole) {
  console.log('⚠️  WARNING: Not using service role key. Database operations may fail due to RLS.');
  console.log('   Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env.local for full functionality.\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Document group labels
const DOCUMENT_GROUP_LABELS = {
  A: 'Form of Agreement & Annexes',
  B: 'Letter of Acceptance',
  C: 'Conditions of Contract',
  D: 'Addendums & Clarifications',
  I: 'Bills of Quantities',
  N: 'Schedules & Annexes'
};

// Priority order for processing
const GROUP_PRIORITY = ['A', 'B', 'D', 'C', 'I', 'N'];

/**
 * Validate filename against naming convention
 */
function validateFileName(filename) {
  const pattern = /^([ABCDIN])(\d{3})_([A-Za-z0-9_-]+)\.([a-zA-Z0-9]+)$/;
  const match = filename.match(pattern);
  
  if (!match) {
    return { isValid: false, errors: ['Filename does not match pattern: {GROUP}{SEQ}_{Name}.{ext}'] };
  }
  
  const [, group, seq, name, ext] = match;
  return {
    isValid: true,
    parsed: {
      group,
      sequence: parseInt(seq, 10),
      name,
      extension: ext
    }
  };
}

/**
 * Extract text from PDF using pdfjs-dist
 */
async function extractTextFromPdf(filePath) {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const buffer = await readFile(filePath);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true
    });
    
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    let text = '';
    
    // Extract text from each page
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      text += pageText + '\n\n';
    }
    
    // Get metadata
    const metadata = await pdf.getMetadata().catch(() => ({}));
    
    return {
      text: text.trim(),
      pageCount,
      metadata: metadata?.info || {}
    };
  } catch (error) {
    console.error(`   ⚠️  PDF parse error: ${error.message}`);
    return { text: '', pageCount: 0, metadata: {} };
  }
}

/**
 * Upload file to Supabase Storage
 */
async function uploadToStorage(filePath, storagePath) {
  const buffer = await readFile(filePath);
  
  try {
    // First, check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      console.log(`   📦 Creating storage bucket: ${STORAGE_BUCKET}`);
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: false,
        fileSizeLimit: 100 * 1024 * 1024 // 100MB
      });
      if (createError && !createError.message.includes('already exists')) {
        console.warn(`   ⚠️  Bucket creation warning: ${createError.message}`);
      }
    }
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (error) {
      // If RLS error, log warning but continue (store in DB without storage)
      if (error.message.includes('row-level security') || error.message.includes('policy')) {
        console.warn(`   ⚠️  Storage upload skipped (RLS): Use service role key for full upload`);
        return storagePath; // Return path anyway for DB record
      }
      throw new Error(`Storage upload failed: ${error.message}`);
    }
    
    return storagePath;
  } catch (err) {
    console.warn(`   ⚠️  Storage warning: ${err.message}`);
    return storagePath; // Return path for DB record even if storage fails
  }
}

/**
 * Create document record in database
 */
async function createDocumentRecord(doc) {
  const { data, error } = await supabase
    .from('contract_documents')
    .upsert({
      contract_id: doc.contractId,
      document_group: doc.group,
      name: doc.name,
      original_filename: doc.originalFilename,
      file_path: doc.filePath,
      file_type: 'pdf',
      file_size_bytes: doc.fileSize,
      page_count: doc.pageCount,
      sequence_number: doc.sequence,
      effective_date: doc.effectiveDate || null,
      status: 'processing',
      processing_metadata: doc.metadata || {}
    }, {
      onConflict: 'contract_id,document_group,sequence_number'
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }
  
  return data;
}

/**
 * Chunk text into segments for embedding
 */
function chunkText(text, options = {}) {
  const maxTokens = options.maxTokens || 2000;
  const overlapTokens = options.overlapTokens || 100;
  const charsPerToken = 4;
  
  const maxChars = maxTokens * charsPerToken;
  const overlapChars = overlapTokens * charsPerToken;
  
  const chunks = [];
  
  // Split by clause patterns first
  const clausePattern = /^(?:Clause|Sub-Clause|Article|Section)\s*(\d+[A-Za-z]?(?:\.\d+)*)/gmi;
  const numberedPattern = /^(\d+[A-Za-z]?(?:\.\d+)*)\s+([A-Z][A-Za-z\s]+)/gm;
  
  // Find clause boundaries
  const clauseMatches = [...text.matchAll(clausePattern), ...text.matchAll(numberedPattern)];
  
  if (clauseMatches.length > 0) {
    // Sort by position
    clauseMatches.sort((a, b) => a.index - b.index);
    
    for (let i = 0; i < clauseMatches.length; i++) {
      const start = clauseMatches[i].index;
      const end = i < clauseMatches.length - 1 ? clauseMatches[i + 1].index : text.length;
      const content = text.slice(start, end).trim();
      
      if (content.length > maxChars) {
        // Split large clauses further
        const subChunks = splitBySize(content, maxChars, overlapChars);
        chunks.push(...subChunks.map((c, idx) => ({
          content: c,
          clauseNumber: clauseMatches[i][1],
          chunkIndex: idx
        })));
      } else if (content.length > 50) {
        chunks.push({
          content,
          clauseNumber: clauseMatches[i][1],
          chunkIndex: 0
        });
      }
    }
    
    // Handle text before first clause
    if (clauseMatches[0].index > 100) {
      const preamble = text.slice(0, clauseMatches[0].index).trim();
      if (preamble.length > 50) {
        chunks.unshift({
          content: preamble,
          clauseNumber: null,
          chunkIndex: 0,
          isPreamble: true
        });
      }
    }
  } else {
    // No clauses found - chunk by size
    const sizeChunks = splitBySize(text, maxChars, overlapChars);
    chunks.push(...sizeChunks.map((c, idx) => ({
      content: c,
      clauseNumber: null,
      chunkIndex: idx
    })));
  }
  
  return chunks;
}

/**
 * Split text by size with overlap
 */
function splitBySize(text, maxChars, overlapChars) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    
    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + maxChars / 2) {
        end = breakPoint + 1;
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
    
    start = end - overlapChars;
    if (start >= text.length) break;
  }
  
  return chunks;
}

/**
 * Generate content hash for deduplication
 */
function generateContentHash(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Store chunks in database
 */
async function storeChunks(documentId, chunks, documentGroup) {
  const chunkRecords = chunks.map((chunk, index) => ({
    document_id: documentId,
    chunk_index: index,
    clause_number: chunk.clauseNumber,
    clause_title: chunk.isPreamble ? 'Preamble' : null,
    content: chunk.content,
    content_hash: generateContentHash(chunk.content),
    content_type: chunk.isPreamble ? 'preamble' : (chunk.clauseNumber ? 'clause' : 'text'),
    token_count: Math.ceil(chunk.content.length / 4),
    metadata: {
      documentGroup,
      chunkIndex: chunk.chunkIndex
    }
  }));
  
  // Delete existing chunks for this document
  await supabase
    .from('contract_document_chunks')
    .delete()
    .eq('document_id', documentId);
  
  // Insert new chunks in batches
  const batchSize = 50;
  for (let i = 0; i < chunkRecords.length; i += batchSize) {
    const batch = chunkRecords.slice(i, i + batchSize);
    const { error } = await supabase
      .from('contract_document_chunks')
      .insert(batch);
    
    if (error) {
      console.error(`   ⚠️  Chunk insert error: ${error.message}`);
    }
  }
  
  return chunkRecords.length;
}

/**
 * Generate embeddings for chunks using OpenAI
 */
async function generateEmbeddings(documentId) {
  if (!OPENAI_API_KEY) {
    console.log('   ⚠️  OpenAI API key not set - skipping embeddings');
    return 0;
  }
  
  // Get chunks without embeddings
  const { data: chunks, error } = await supabase
    .from('contract_document_chunks')
    .select('id, content')
    .eq('document_id', documentId)
    .is('embedding', null);
  
  if (error || !chunks?.length) {
    return 0;
  }
  
  const EMBEDDING_MODEL = 'text-embedding-3-small';
  const BATCH_SIZE = 20;
  let embedded = 0;
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.content.slice(0, 8000)); // Limit text length
    
    try {
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
        const err = await response.json();
        throw new Error(err.error?.message || 'Embedding failed');
      }
      
      const data = await response.json();
      const embeddings = data.data.sort((a, b) => a.index - b.index);
      
      // Update each chunk with its embedding
      for (let j = 0; j < batch.length; j++) {
        const { error: updateError } = await supabase
          .from('contract_document_chunks')
          .update({ embedding: embeddings[j].embedding })
          .eq('id', batch[j].id);
        
        if (!updateError) embedded++;
      }
      
      // Rate limit
      await new Promise(r => setTimeout(r, 200));
      
    } catch (err) {
      console.error(`   ⚠️  Embedding error: ${err.message}`);
    }
  }
  
  return embedded;
}

/**
 * Update document status
 */
async function updateDocumentStatus(documentId, status, error = null) {
  const update = {
    status,
    processed_at: new Date().toISOString()
  };
  
  if (error) {
    update.processing_error = error;
  }
  
  await supabase
    .from('contract_documents')
    .update(update)
    .eq('id', documentId);
}

/**
 * Process a single document
 */
async function processDocument(filePath, filename, generateEmbed = false) {
  console.log(`\n📄 Processing: ${filename}`);
  
  // Validate filename
  const validation = validateFileName(filename);
  if (!validation.isValid) {
    console.log(`   ❌ Invalid filename: ${validation.errors.join(', ')}`);
    return null;
  }
  
  const { group, sequence, name, extension } = validation.parsed;
  console.log(`   Group: ${group} (${DOCUMENT_GROUP_LABELS[group]})`);
  console.log(`   Sequence: ${sequence}`);
  
  try {
    // Get file stats
    const fileStats = await stat(filePath);
    
    // Extract text from PDF
    console.log('   📖 Extracting text...');
    const { text, pageCount, metadata } = await extractTextFromPdf(filePath);
    console.log(`   📑 Pages: ${pageCount}, Characters: ${text.length}`);
    
    // Upload to storage
    const storagePath = `contracts/${ATRIUM_CONTRACT_ID}/${group}/${filename}`;
    console.log('   ☁️  Uploading to storage...');
    await uploadToStorage(filePath, storagePath);
    
    // Create database record
    console.log('   💾 Creating database record...');
    const docRecord = await createDocumentRecord({
      contractId: ATRIUM_CONTRACT_ID,
      group,
      name: `${name.replace(/_/g, ' ')}`,
      originalFilename: filename,
      filePath: storagePath,
      fileSize: fileStats.size,
      pageCount,
      sequence,
      metadata
    });
    
    // Chunk the text
    console.log('   ✂️  Chunking text...');
    const chunks = chunkText(text);
    console.log(`   📦 Created ${chunks.length} chunks`);
    
    // Store chunks
    const storedCount = await storeChunks(docRecord.id, chunks, group);
    console.log(`   ✅ Stored ${storedCount} chunks`);
    
    // Generate embeddings if requested
    if (generateEmbed) {
      console.log('   🧠 Generating embeddings...');
      const embeddedCount = await generateEmbeddings(docRecord.id);
      console.log(`   ✅ Generated ${embeddedCount} embeddings`);
    }
    
    // Update status
    await updateDocumentStatus(docRecord.id, 'completed');
    console.log(`   ✅ Document processed successfully`);
    
    return docRecord;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Main ingestion function
 */
async function ingestDocuments() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Atrium Contract Document Ingestion                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const generateEmbed = process.argv.includes('--embeddings');
  
  if (generateEmbed && !OPENAI_API_KEY) {
    console.log('⚠️  --embeddings flag set but VITE_OPENAI_API_KEY not found');
    console.log('   Embeddings will be skipped\n');
  }
  
  console.log(`📁 Documents folder: ${DOCUMENTS_DIR}`);
  console.log(`🔑 Contract ID: ${ATRIUM_CONTRACT_ID}`);
  console.log(`🧠 Generate embeddings: ${generateEmbed ? 'Yes' : 'No'}\n`);
  
  // Read documents directory
  let files;
  try {
    files = await readdir(DOCUMENTS_DIR);
  } catch (error) {
    console.error('❌ Cannot read atrium-documents/ folder');
    console.error('   Make sure the folder exists and contains PDF files');
    process.exit(1);
  }
  
  // Filter PDF files and ignore README
  const pdfFiles = files.filter(f => 
    f.toLowerCase().endsWith('.pdf') && 
    !f.startsWith('.')
  );
  
  if (pdfFiles.length === 0) {
    console.log('⚠️  No PDF files found in atrium-documents/');
    console.log('   Please add PDF files following the naming convention:');
    console.log('   {GROUP}{SEQ}_{Name}.pdf (e.g., A001_Form_of_Agreement.pdf)');
    process.exit(0);
  }
  
  console.log(`📋 Found ${pdfFiles.length} PDF files:\n`);
  
  // Sort files by priority group, then by sequence
  const sortedFiles = pdfFiles.sort((a, b) => {
    const validA = validateFileName(a);
    const validB = validateFileName(b);
    
    if (!validA.isValid) return 1;
    if (!validB.isValid) return -1;
    
    const priorityA = GROUP_PRIORITY.indexOf(validA.parsed.group);
    const priorityB = GROUP_PRIORITY.indexOf(validB.parsed.group);
    
    if (priorityA !== priorityB) return priorityA - priorityB;
    return validA.parsed.sequence - validB.parsed.sequence;
  });
  
  // List files to process
  sortedFiles.forEach(f => {
    const validation = validateFileName(f);
    const status = validation.isValid ? '✓' : '✗';
    console.log(`   ${status} ${f}`);
  });
  
  // Process each file
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    documents: []
  };
  
  console.log('\n─────────────────────────────────────────────────────────');
  console.log('Starting ingestion...');
  console.log('─────────────────────────────────────────────────────────');
  
  for (const filename of sortedFiles) {
    const filePath = join(DOCUMENTS_DIR, filename);
    const doc = await processDocument(filePath, filename, generateEmbed);
    
    if (doc) {
      results.success++;
      results.documents.push(doc);
    } else {
      const validation = validateFileName(filename);
      if (!validation.isValid) {
        results.skipped++;
      } else {
        results.failed++;
      }
    }
  }
  
  // Summary
  console.log('\n═════════════════════════════════════════════════════════');
  console.log('                    INGESTION SUMMARY                     ');
  console.log('═════════════════════════════════════════════════════════\n');
  console.log(`   ✅ Successfully processed: ${results.success}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⚠️  Skipped (invalid name): ${results.skipped}`);
  
  if (results.success > 0) {
    console.log('\n📊 Documents by Group:');
    const byGroup = {};
    results.documents.forEach(doc => {
      byGroup[doc.document_group] = (byGroup[doc.document_group] || 0) + 1;
    });
    Object.entries(byGroup).forEach(([group, count]) => {
      console.log(`   ${group}: ${count} document(s) - ${DOCUMENT_GROUP_LABELS[group]}`);
    });
  }
  
  console.log('\n═════════════════════════════════════════════════════════');
  
  if (!generateEmbed && results.success > 0) {
    console.log('\n💡 To generate embeddings for semantic search, run:');
    console.log('   node scripts/ingest-atrium-documents.mjs --embeddings\n');
  }
}

// Run ingestion
ingestDocuments().catch(console.error);
