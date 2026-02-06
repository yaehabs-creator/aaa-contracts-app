
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
    console.error('Missing env vars:', { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY });
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PDF_PATH = join(rootDir, 'SODIC-TET-FL-500F-0-0001_ocred.pdf');

// Helper to remove undefined values for Supabase
function removeUndefinedValues(obj) {
    if (obj === null || obj === undefined) {
        return null;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefinedValues(item));
    }

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

// Simple heuristic clause parser
function parseClauses(text, sectionType) {
    const lines = text.split('\n');
    const items = [];
    let currentClause = null;
    let orderIndex = 0;

    // Regex to detect clause numbers like "1.1", "2.1.3", "4.2", "Clause 5"
    const clauseRegex = /^(\d+(\.\d+)+|\d+\.)/;
    const titleRegex = /^[A-Z][a-zA-Z\s\(\)]+$/; // Roughly uppercase titles

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const match = line.match(clauseRegex);
        if (match) {
            // Start new clause
            if (currentClause) {
                items.push(currentClause);
            }
            currentClause = {
                itemType: 'CLAUSE',
                clause_number: match[0],
                clause_title: '', // Title might be on same line or next
                clause_text: line.substring(match[0].length).trim(),
                orderIndex: orderIndex++,
                sectionType: sectionType
            };
            // Heuristic: if text after number is short and uppercase, it's a title
            if (currentClause.clause_text.length < 50 && currentClause.clause_text.toUpperCase() === currentClause.clause_text) {
                currentClause.clause_title = currentClause.clause_text;
                currentClause.clause_text = ''; // Reset text if it was just a title
            }
        } else {
            if (currentClause) {
                // Append to current clause
                currentClause.clause_text += (currentClause.clause_text ? ' ' : '') + line;
            } else {
                // Text before any clause, treat as paragraph
                items.push({
                    itemType: 'PARAGRAPH',
                    text: line,
                    orderIndex: orderIndex++,
                    sectionType: sectionType
                });
            }
        }
    }
    if (currentClause) {
        items.push(currentClause);
    }

    // Transform to SectionItem format
    return items.map(item => ({
        itemType: item.itemType,
        number: item.clause_number,
        heading: item.clause_title,
        text: item.clause_text || item.text,
        orderIndex: item.orderIndex,
        // Metadata for consistency
        clause_number: item.clause_number,
        clause_title: item.clause_title,
        clause_text: item.clause_text,
        condition_type: sectionType === 'GENERAL' ? 'General' : 'Particular'
    }));
}


async function extractTextFromPDF(pdfPath) {
    console.log(`Loading PDF from ${pdfPath}...`);
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = getDocument(data);
    const pdfDocument = await loadingTask.promise;

    console.log(`PDF loaded. Pages: ${pdfDocument.numPages}`);
    let fullText = '';

    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const tokenizedText = await page.getTextContent();
        const pageText = tokenizedText.items.map(token => token.str).join(' ');
        fullText += pageText + '\n\n';
    }
    return fullText;
}

async function main() {
    try {
        const rawText = await extractTextFromPDF(PDF_PATH);
        console.log(`Extracted ${rawText.length} characters.`);

        // Heuristic split between General and Particular conditions
        // Assuming the PDF contains both sequentially or mixed. 
        // For this task, since the user didn't specify the split point, 
        // we'll treat the first half as General and second as Particular 
        // OR look for keywords. 
        // BETTER APPROACH: Just put everything in GENERAL if we can't tell, 
        // or try to find "PARTICULAR CONDITIONS" header.

        let generalText = rawText;
        let particularText = '';

        const splitMatch = rawText.match(/PARTICULAR CONDITIONS/i);
        if (splitMatch && splitMatch.index > 500) { // arbitrary buffer
            console.log('Found "PARTICULAR CONDITIONS" header, splitting text...');
            generalText = rawText.substring(0, splitMatch.index);
            particularText = rawText.substring(splitMatch.index);
        } else {
            console.log('Could not find explicit split. Putting all text in General Conditions for now (user can edit later).');
        }

        const generalItems = parseClauses(generalText, 'GENERAL');
        const particularItems = parseClauses(particularText, 'PARTICULAR');

        console.log(`Parsed ${generalItems.length} General items and ${particularItems.length} Particular items.`);

        // FIX: Generate a valid UUID
        const contractId = crypto.randomUUID();
        console.log(`Generated UUID for contract: ${contractId}`);

        const contract = {
            id: contractId,
            name: 'SODIC-TET-FL-500F-0-0001 (Imported)',
            timestamp: Date.now(),
            metadata: {
                totalClauses: generalItems.length + particularItems.length,
                generalCount: generalItems.length,
                particularCount: particularItems.length,
                highRiskCount: 0,
                conflictCount: 0,
                timeSensitiveCount: 0
            },
            // Create the section structure
            sections: [
                { sectionType: 'AGREEMENT', title: 'Agreement', items: [] },
                { sectionType: 'LOA', title: 'Letter of Acceptance', items: [] },
                { sectionType: 'GENERAL', title: 'General Conditions', items: generalItems },
                { sectionType: 'PARTICULAR', title: 'Particular Conditions', items: particularItems }
            ],
            uses_subcollections: true // Enforce new structure
        };

        console.log('Saving to Supabase...');

        // 1. Save main contract metadata
        const contractMetadata = removeUndefinedValues({
            id: contract.id,
            name: contract.name,
            timestamp: contract.timestamp,
            metadata: contract.metadata,
            clauses: null,
            sections: null,
            uses_subcollections: true
        });

        const { error: mainError } = await supabase
            .from('contracts')
            .upsert(contractMetadata);

        if (mainError) throw new Error(`Failed to save contract metadata: ${mainError.message}`);

        // 2. Save sections and items
        for (const section of contract.sections) {
            // Upsert section
            const { error: sectionError } = await supabase
                .from('contract_sections')
                .upsert({
                    contract_id: contract.id,
                    section_type: section.sectionType,
                    title: section.title,
                    item_count: section.items.length
                });

            if (sectionError) throw new Error(`Failed to save section ${section.sectionType}: ${sectionError.message}`);

            // Insert items
            if (section.items.length > 0) {
                const itemsToInsert = section.items.map((item, index) => ({
                    contract_id: contract.id,
                    section_type: section.sectionType,
                    order_index: index,
                    item_data: removeUndefinedValues(item)
                }));

                // Batch insert in chunks of 50 to avoid request size limits
                for (let i = 0; i < itemsToInsert.length; i += 50) {
                    const chunk = itemsToInsert.slice(i, i + 50);
                    const { error: itemsError } = await supabase
                        .from('contract_items')
                        .insert(chunk);

                    if (itemsError) throw new Error(`Failed to save items chunk for ${section.sectionType}: ${itemsError.message}`);
                }
            }
        }

        console.log(`✅ Success! Contract imported with ID: ${contractId}`);
        console.log(`Name: ${contract.name}`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();
