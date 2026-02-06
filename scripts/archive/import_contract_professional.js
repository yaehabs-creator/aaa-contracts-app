import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import crypto from 'crypto';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env.local');

if (fs.existsSync(envPath)) {
    const envConfig = dotenv.config({ path: envPath }).parsed;
    if (envConfig) {
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const PDF_PATH = join(rootDir, 'SODIC-TET-FL-500F-0-0001_ocred.pdf');

// Configuration
const MAX_CHUNK_SIZE = 4000;
const DEBUG_OUTPUT_DIR = join(rootDir, 'contract_import_debug');

// Helper to remove undefined values
function removeUndefinedValues(obj) {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(item => removeUndefinedValues(item));
    if (typeof obj === 'object' && obj.constructor === Object) {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = removeUndefinedValues(value);
            }
        }
        return cleaned;
    }
    return obj;
}

// STEP 2: Extract and clean text
async function extractTextFromPDF(pdfPath) {
    console.log(`📄 Loading PDF: ${pdfPath}`);
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = getDocument(data);
    const pdfDocument = await loadingTask.promise;

    console.log(`📖 PDF loaded. Pages: ${pdfDocument.numPages}`);

    const pages = [];
    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        pages.push({ pageNum: i, text: pageText });

        if (i % 10 === 0) {
            console.log(`   Extracted ${i}/${pdfDocument.numPages} pages...`);
        }
    }

    return pages;
}

function cleanText(pages) {
    console.log('🧹 Cleaning extracted text...');

    // Detect common headers/footers by finding repeated text
    const lineFrequency = new Map();
    pages.forEach(page => {
        const lines = page.text.split(/\n+/);
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.length > 5 && trimmed.length < 100) {
                lineFrequency.set(trimmed, (lineFrequency.get(trimmed) || 0) + 1);
            }
        });
    });

    // Headers/footers appear on many pages
    const threshold = Math.floor(pages.length * 0.3);
    const headersFooters = new Set();
    lineFrequency.forEach((count, line) => {
        if (count >= threshold) {
            headersFooters.add(line);
        }
    });

    console.log(`   Found ${headersFooters.size} repeated headers/footers`);

    // Clean each page
    let cleanedText = '';
    pages.forEach(page => {
        let pageText = page.text;

        // Remove headers/footers
        headersFooters.forEach(header => {
            pageText = pageText.replace(new RegExp(header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
        });

        // Fix hyphenation at line breaks
        pageText = pageText.replace(/(\w+)-\s+(\w+)/g, '$1$2');

        // Normalize whitespace
        pageText = pageText.replace(/\s+/g, ' ');

        cleanedText += pageText + '\n\n';
    });

    // Join wrapped lines (heuristic: if line doesn't end with punctuation and next starts lowercase)
    const lines = cleanedText.split('\n');
    const joined = [];
    let currentPara = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            if (currentPara) {
                joined.push(currentPara);
                currentPara = '';
            }
            continue;
        }

        if (currentPara && !/[.!?:;]$/.test(currentPara) && /^[a-z]/.test(line)) {
            currentPara += ' ' + line;
        } else {
            if (currentPara) joined.push(currentPara);
            currentPara = line;
        }
    }
    if (currentPara) joined.push(currentPara);

    return joined.join('\n\n');
}

// STEP 3: Parse into structure
function detectSections(cleanText) {
    console.log('📑 Detecting sections...');

    const sections = [];
    const gcMatch = cleanText.match(/(GENERAL CONDITIONS|Part I|PART I)/i);
    const pcMatch = cleanText.match(/(PARTICULAR CONDITIONS|Part II|PART II|SPECIAL CONDITIONS)/i);

    if (gcMatch && pcMatch) {
        const gcStart = gcMatch.index;
        const pcStart = pcMatch.index;

        sections.push({
            type: 'GENERAL',
            title: 'General Conditions',
            text: cleanText.substring(gcStart, pcStart)
        });

        sections.push({
            type: 'PARTICULAR',
            title: 'Particular Conditions',
            text: cleanText.substring(pcStart)
        });
    } else if (gcMatch) {
        sections.push({
            type: 'GENERAL',
            title: 'General Conditions',
            text: cleanText.substring(gcMatch.index)
        });
    } else if (pcMatch) {
        sections.push({
            type: 'PARTICULAR',
            title: 'Particular Conditions',
            text: cleanText.substring(pcMatch.index)
        });
    } else {
        // Fallback: treat all as general
        sections.push({
            type: 'GENERAL',
            title: 'General Conditions',
            text: cleanText
        });
    }

    console.log(`   Found ${sections.length} sections`);
    return sections;
}

function parseClauses(sectionText, sectionType) {
    console.log(`🔍 Parsing clauses for ${sectionType}...`);

    const clauses = [];
    const lines = sectionText.split('\n');

    // Enhanced regex for FIDIC-style numbering
    const clausePatterns = [
        /^(\d+)\.\s+(.+)/,                    // "1. Title" or "1. Text"
        /^(\d+\.\d+)\s+(.+)/,                 // "1.1 Title"
        /^(\d+\.\d+\.\d+)\s+(.+)/,            // "1.1.1 Title"
        /^Clause\s+(\d+)\s*[-–]\s*(.+)/i,     // "Clause 1 - Title"
        /^(\d+[A-Z]?\.\d+)\s+(.+)/,           // "2A.1 Title"
    ];

    let currentClause = null;
    let orderIndex = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let matched = false;
        for (const pattern of clausePatterns) {
            const match = trimmed.match(pattern);
            if (match) {
                // Save previous clause
                if (currentClause) {
                    clauses.push(currentClause);
                }

                const clauseNum = match[1];
                const rest = match[2].trim();

                // Determine if rest is title or text
                const isTitle = rest.length < 100 && rest.toUpperCase() === rest;

                currentClause = {
                    itemType: 'CLAUSE',
                    clause_number: clauseNum,
                    clause_title: isTitle ? rest : generateTitle(rest),
                    clause_text: isTitle ? '' : rest,
                    number: clauseNum,
                    heading: isTitle ? rest : generateTitle(rest),
                    text: isTitle ? '' : rest,
                    orderIndex: orderIndex++,
                    condition_type: sectionType === 'GENERAL' ? 'General' : 'Particular',
                    parentRef: getParentRef(clauseNum),
                    depth: getDepth(clauseNum)
                };

                matched = true;
                break;
            }
        }

        if (!matched && currentClause) {
            // Continuation of current clause
            currentClause.clause_text += (currentClause.clause_text ? ' ' : '') + trimmed;
            currentClause.text += (currentClause.text ? ' ' : '') + trimmed;
        } else if (!matched) {
            // Text before any clause - create paragraph
            clauses.push({
                itemType: 'PARAGRAPH',
                text: trimmed,
                orderIndex: orderIndex++
            });
        }
    }

    if (currentClause) {
        clauses.push(currentClause);
    }

    console.log(`   Parsed ${clauses.length} items`);
    return clauses;
}

function generateTitle(text) {
    const words = text.split(/\s+/).slice(0, 10);
    let title = words.join(' ');
    if (words.length === 10) title += '...';
    return title;
}

function getParentRef(clauseNum) {
    const parts = clauseNum.split('.');
    if (parts.length > 1) {
        return parts.slice(0, -1).join('.');
    }
    return null;
}

function getDepth(clauseNum) {
    return clauseNum.split('.').length - 1;
}

// STEP 4: Chunk long clauses
function chunkLongClauses(clauses) {
    console.log('✂️  Chunking long clauses...');

    const chunked = [];
    let chunkedCount = 0;

    for (const clause of clauses) {
        if (clause.itemType !== 'CLAUSE' || !clause.clause_text) {
            chunked.push(clause);
            continue;
        }

        if (clause.clause_text.length <= MAX_CHUNK_SIZE) {
            chunked.push(clause);
            continue;
        }

        // Split at sentence boundaries
        const sentences = clause.clause_text.match(/[^.!?]+[.!?]+/g) || [clause.clause_text];
        const chunks = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > MAX_CHUNK_SIZE && currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                currentChunk += sentence;
            }
        }
        if (currentChunk) chunks.push(currentChunk.trim());

        // Create chunk items
        chunks.forEach((chunkText, idx) => {
            chunked.push({
                ...clause,
                clause_text: chunkText,
                text: chunkText,
                heading: idx === 0 ? clause.heading : `${clause.heading} (continued ${idx + 1})`,
                chunkIndex: idx,
                chunkCount: chunks.length,
                orderIndex: clause.orderIndex + idx * 0.01
            });
        });

        chunkedCount++;
    }

    console.log(`   Chunked ${chunkedCount} long clauses`);
    return chunked;
}

// Main execution
async function main() {
    try {
        // Create debug output directory
        if (!fs.existsSync(DEBUG_OUTPUT_DIR)) {
            fs.mkdirSync(DEBUG_OUTPUT_DIR, { recursive: true });
        }

        console.log('🚀 Starting professional contract import...\n');

        // STEP 2: Extract and clean
        const pages = await extractTextFromPDF(PDF_PATH);
        const cleanedText = cleanText(pages);

        // Save cleaned text for debugging
        fs.writeFileSync(join(DEBUG_OUTPUT_DIR, 'cleaned_text.txt'), cleanedText);
        console.log(`   ✅ Saved cleaned text to ${DEBUG_OUTPUT_DIR}/cleaned_text.txt\n`);

        // STEP 3: Parse sections and clauses
        const sections = detectSections(cleanedText);
        const parsedSections = sections.map(section => ({
            sectionType: section.type,
            title: section.title,
            items: parseClauses(section.text, section.type)
        }));

        // STEP 4: Chunk long clauses
        parsedSections.forEach(section => {
            section.items = chunkLongClauses(section.items);
        });

        // Add empty AGREEMENT and LOA sections
        const allSections = [
            { sectionType: 'AGREEMENT', title: 'Agreement', items: [] },
            { sectionType: 'LOA', title: 'Letter of Acceptance', items: [] },
            ...parsedSections
        ];

        // Calculate metadata
        const totalClauses = allSections.reduce((sum, s) => sum + s.items.filter(i => i.itemType === 'CLAUSE').length, 0);
        const generalCount = allSections.find(s => s.sectionType === 'GENERAL')?.items.filter(i => i.itemType === 'CLAUSE').length || 0;
        const particularCount = allSections.find(s => s.sectionType === 'PARTICULAR')?.items.filter(i => i.itemType === 'CLAUSE').length || 0;

        console.log(`\n📊 Import Summary:`);
        console.log(`   Total Clauses: ${totalClauses}`);
        console.log(`   General: ${generalCount}`);
        console.log(`   Particular: ${particularCount}\n`);

        // STEP 5: Delete old Contract #2 if exists
        console.log('🗑️  Checking for existing Contract #2...');
        const { data: existingContracts } = await supabase
            .from('contracts')
            .select('id, name')
            .ilike('name', '%SODIC%');

        if (existingContracts && existingContracts.length > 0) {
            console.log(`   Found ${existingContracts.length} existing SODIC contract(s). Deleting...`);
            for (const contract of existingContracts) {
                await supabase.from('contract_items').delete().eq('contract_id', contract.id);
                await supabase.from('contract_sections').delete().eq('contract_id', contract.id);
                await supabase.from('contracts').delete().eq('id', contract.id);
                console.log(`   ✅ Deleted: ${contract.name}`);
            }
        }

        // Generate new UUID
        const contractId = crypto.randomUUID();
        console.log(`\n💾 Saving new contract with ID: ${contractId}`);

        // Save to Supabase
        const contractMetadata = removeUndefinedValues({
            id: contractId,
            name: 'SODIC-TET-FL-500F-0-0001 (FIDIC 4th Ed. 1987)',
            timestamp: Date.now(),
            metadata: {
                totalClauses,
                generalCount,
                particularCount,
                highRiskCount: 0,
                conflictCount: 0,
                timeSensitiveCount: 0
            },
            clauses: null,
            sections: null,
            uses_subcollections: true
        });

        const { error: mainError } = await supabase.from('contracts').upsert(contractMetadata);
        if (mainError) throw new Error(`Failed to save contract: ${mainError.message}`);

        // Save sections and items
        for (const section of allSections) {
            const { error: sectionError } = await supabase
                .from('contract_sections')
                .upsert({
                    contract_id: contractId,
                    section_type: section.sectionType,
                    title: section.title,
                    item_count: section.items.length
                });

            if (sectionError) throw new Error(`Failed to save section: ${sectionError.message}`);

            if (section.items.length > 0) {
                const itemsToInsert = section.items.map((item, index) => ({
                    contract_id: contractId,
                    section_type: section.sectionType,
                    order_index: index,
                    item_data: removeUndefinedValues(item)
                }));

                // Insert in batches of 50
                for (let i = 0; i < itemsToInsert.length; i += 50) {
                    const chunk = itemsToInsert.slice(i, i + 50);
                    const { error: itemsError } = await supabase.from('contract_items').insert(chunk);
                    if (itemsError) throw new Error(`Failed to save items: ${itemsError.message}`);
                }
            }
        }

        console.log('\n✅ SUCCESS! Contract imported successfully.');
        console.log(`   Contract ID: ${contractId}`);
        console.log(`   Name: ${contractMetadata.name}`);

    } catch (error) {
        console.error('\n❌ ERROR:', error);
        process.exit(1);
    }
}

main();
