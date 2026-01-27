/**
 * Convert Uploaded Documents to JSON
 * 
 * This script extracts text from uploaded documents in Supabase storage
 * and saves them as JSON in the contract_document_chunks table for AI access.
 * 
 * Usage:
 *   node scripts/convert_documents_to_json.js <contract_id>
 * 
 * Or import and use programmatically:
 *   const { processAllDocuments } = require('./convert_documents_to_json');
 *   await processAllDocuments(contractId);
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL and key are required');
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_BUCKET = 'contract-docs';

/**
 * Download file from URL
 */
async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Extract text from PDF using basic parsing
 * For production, consider using pdf-parse or similar library
 */
function extractTextFromPDF(buffer) {
  // Convert buffer to string and look for text streams
  const content = buffer.toString('latin1');
  const textParts = [];
  
  // Find text between BT (begin text) and ET (end text) markers
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  
  while ((match = btEtRegex.exec(content)) !== null) {
    const textBlock = match[1];
    
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    
    let tjMatch;
    while ((tjMatch = tjRegex.exec(textBlock)) !== null) {
      textParts.push(decodeText(tjMatch[1]));
    }
    
    while ((tjMatch = tjArrayRegex.exec(textBlock)) !== null) {
      const arrayContent = tjMatch[1];
      const textInArray = arrayContent.match(/\(([^)]*)\)/g);
      if (textInArray) {
        textParts.push(textInArray.map(t => decodeText(t.slice(1, -1))).join(''));
      }
    }
  }
  
  // Clean up the text
  let text = textParts.join(' ');
  text = text.replace(/\\n/g, '\n');
  text = text.replace(/\\r/g, '');
  text = text.replace(/\s+/g, ' ');
  text = text.trim();
  
  return text || '[PDF text extraction requires pdf-parse library for better results]';
}

/**
 * Decode PDF text encoding
 */
function decodeText(text) {
  return text
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')');
}

/**
 * Parse clauses from extracted text
 */
function parseClausesFromText(text, documentGroup) {
  const chunks = [];
  
  // Pattern to detect clause numbers (e.g., "1.1", "2.3.4", "Clause 5")
  const clausePattern = /(?:^|\n)\s*(?:Clause\s+)?(\d+(?:\.\d+)*)\s*[:\.\-–—]?\s*([A-Z][^.\n]*)?/gm;
  
  let lastIndex = 0;
  let chunkIndex = 0;
  let match;
  
  const matches = [];
  while ((match = clausePattern.exec(text)) !== null) {
    matches.push({
      index: match.index,
      clauseNumber: match[1],
      clauseTitle: match[2]?.trim() || null,
      fullMatch: match[0]
    });
  }
  
  // Create chunks from matches
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    
    const startIndex = current.index;
    const endIndex = next ? next.index : text.length;
    const content = text.substring(startIndex, endIndex).trim();
    
    if (content.length > 10) { // Skip very short content
      chunks.push({
        chunk_index: chunkIndex++,
        content: content,
        clause_number: current.clauseNumber,
        clause_title: current.clauseTitle,
        content_type: 'text',
        token_count: Math.ceil(content.length / 4) // Rough estimate
      });
    }
  }
  
  // If no clauses found, create a single chunk with all content
  if (chunks.length === 0 && text.length > 0) {
    chunks.push({
      chunk_index: 0,
      content: text,
      clause_number: null,
      clause_title: null,
      content_type: 'text',
      token_count: Math.ceil(text.length / 4)
    });
  }
  
  return chunks;
}

/**
 * Process a single document
 */
async function processDocument(document) {
  console.log(`Processing: ${document.name} (${document.file_type})`);
  
  try {
    // Get signed URL for the file
    const { data: urlData, error: urlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(document.file_path, 3600);
    
    if (urlError) {
      console.error(`  Error getting URL: ${urlError.message}`);
      return { success: false, error: urlError.message };
    }
    
    // Download the file
    console.log(`  Downloading...`);
    const fileBuffer = await downloadFile(urlData.signedUrl);
    console.log(`  Downloaded ${fileBuffer.length} bytes`);
    
    // Extract text based on file type
    let extractedText = '';
    
    if (document.file_type === 'pdf') {
      extractedText = extractTextFromPDF(fileBuffer);
      console.log(`  Extracted ${extractedText.length} characters from PDF`);
    } else {
      // For other file types, try to read as text
      extractedText = fileBuffer.toString('utf-8');
    }
    
    // Parse into chunks
    const chunks = parseClausesFromText(extractedText, document.document_group);
    console.log(`  Parsed ${chunks.length} chunks`);
    
    // Delete existing chunks for this document
    await supabase
      .from('contract_document_chunks')
      .delete()
      .eq('document_id', document.id);
    
    // Insert new chunks
    const chunksToInsert = chunks.map(chunk => ({
      document_id: document.id,
      contract_id: document.contract_id,
      ...chunk
    }));
    
    if (chunksToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('contract_document_chunks')
        .insert(chunksToInsert);
      
      if (insertError) {
        console.error(`  Error inserting chunks: ${insertError.message}`);
        return { success: false, error: insertError.message };
      }
    }
    
    // Update document status
    await supabase
      .from('contract_documents')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString(),
        processing_metadata: {
          chunks_created: chunks.length,
          text_length: extractedText.length,
          processed_at: new Date().toISOString()
        }
      })
      .eq('id', document.id);
    
    console.log(`  ✅ Completed: ${chunks.length} chunks saved`);
    return { success: true, chunks: chunks.length };
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    
    // Update document status to error
    await supabase
      .from('contract_documents')
      .update({ 
        status: 'error',
        processing_error: error.message
      })
      .eq('id', document.id);
    
    return { success: false, error: error.message };
  }
}

/**
 * Process all pending documents for a contract
 */
async function processAllDocuments(contractId) {
  console.log(`\n📄 Processing documents for contract: ${contractId}\n`);
  
  // Get all documents for this contract
  const { data: documents, error } = await supabase
    .from('contract_documents')
    .select('*')
    .eq('contract_id', contractId)
    .in('status', ['pending', 'error']) // Process pending or retry errors
    .order('document_group')
    .order('sequence_number');
  
  if (error) {
    console.error('Error fetching documents:', error.message);
    return { success: false, error: error.message };
  }
  
  if (!documents || documents.length === 0) {
    console.log('No pending documents to process.');
    return { success: true, processed: 0 };
  }
  
  console.log(`Found ${documents.length} documents to process\n`);
  
  const results = {
    total: documents.length,
    successful: 0,
    failed: 0,
    errors: []
  };
  
  for (const doc of documents) {
    const result = await processDocument(doc);
    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
      results.errors.push({ document: doc.name, error: result.error });
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total: ${results.total}`);
  console.log(`   ✅ Successful: ${results.successful}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log(`\n   Errors:`);
    results.errors.forEach(e => console.log(`   - ${e.document}: ${e.error}`));
  }
  
  return results;
}

/**
 * Export document data as JSON file
 */
async function exportToJsonFile(contractId, outputPath) {
  console.log(`\n📁 Exporting contract documents to JSON...\n`);
  
  // Get all documents
  const { data: documents, error: docError } = await supabase
    .from('contract_documents')
    .select('*')
    .eq('contract_id', contractId)
    .order('document_group')
    .order('sequence_number');
  
  if (docError) {
    console.error('Error fetching documents:', docError.message);
    return null;
  }
  
  // Get all chunks
  const { data: chunks, error: chunkError } = await supabase
    .from('contract_document_chunks')
    .select('*')
    .eq('contract_id', contractId)
    .order('chunk_index');
  
  if (chunkError) {
    console.error('Error fetching chunks:', chunkError.message);
    return null;
  }
  
  // Build JSON structure
  const exportData = {
    exportDate: new Date().toISOString(),
    contractId: contractId,
    summary: {
      totalDocuments: documents.length,
      totalChunks: chunks.length,
      documentGroups: {}
    },
    documents: documents.map(doc => {
      const docChunks = chunks.filter(c => c.document_id === doc.id);
      return {
        id: doc.id,
        name: doc.name,
        documentGroup: doc.document_group,
        fileType: doc.file_type,
        status: doc.status,
        sequenceNumber: doc.sequence_number,
        chunks: docChunks.map(c => ({
          clauseNumber: c.clause_number,
          clauseTitle: c.clause_title,
          content: c.content,
          contentType: c.content_type
        }))
      };
    })
  };
  
  // Count by group
  documents.forEach(doc => {
    const group = doc.document_group;
    exportData.summary.documentGroups[group] = (exportData.summary.documentGroups[group] || 0) + 1;
  });
  
  // Write to file
  const fs = require('fs');
  const path = require('path');
  const finalPath = outputPath || path.join(__dirname, '..', `contract_${contractId}_documents.json`);
  
  fs.writeFileSync(finalPath, JSON.stringify(exportData, null, 2));
  console.log(`✅ Exported to: ${finalPath}`);
  
  return exportData;
}

// CLI execution
if (require.main === module) {
  const contractId = process.argv[2];
  const command = process.argv[3] || 'process';
  
  if (!contractId) {
    console.log('Usage:');
    console.log('  node convert_documents_to_json.js <contract_id> [process|export]');
    console.log('');
    console.log('Commands:');
    console.log('  process - Extract text from documents and save as chunks (default)');
    console.log('  export  - Export all document data to a JSON file');
    process.exit(1);
  }
  
  (async () => {
    if (command === 'export') {
      await exportToJsonFile(contractId);
    } else {
      await processAllDocuments(contractId);
    }
  })();
}

module.exports = {
  processDocument,
  processAllDocuments,
  exportToJsonFile
};
