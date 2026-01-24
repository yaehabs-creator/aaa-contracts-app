import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
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

const GC_PATH = join(rootDir, '1. ATRIUM GC.txt');
const PC_PATH = join(rootDir, 'ATRIUM PC .txt');
const CONTRACT_NAME = "Contract #2: Atrium Construction Contract";
const CONTRACT_ID = "atrium-contract-002";

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

function parseTextToClauses(text, sectionType, sectionTitle) {
    console.log(`   Parsing ${sectionType} (Length: ${text.length})...`);
    const lines = text.split(/\r?\n/);
    const clauses = [];
    let currentClause = null;
    let orderIndex = 0;

    // Regex to match clause numbers: "1.1", "11.2", "6A.1", "22A.3"
    const clauseRegex = /^\s*(?:Sub-Clause\s+)?((\d+[A-Z]?)\.(\d+[A-Z]?(\.\d+)?))\s*(.*)/i;
    const headingRegex = /^\s*(\d+[A-Z]?)\.\s+([A-Z\s,\-]+)$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('•')) {
            // Append to current clause
            if (currentClause) {
                currentClause.clause_text += '\n' + trimmed;
                currentClause.text += '\n' + trimmed;
            }
            continue;
        }

        try {
            let match = trimmed.match(clauseRegex);
            let headingMatch = trimmed.match(headingRegex);

            if (headingMatch) {
                if (currentClause) clauses.push(currentClause);

                currentClause = {
                    itemType: 'CLAUSE',
                    clause_number: headingMatch[1],
                    clause_title: headingMatch[2].trim(),
                    clause_text: '',
                    number: headingMatch[1],
                    heading: headingMatch[2].trim(),
                    text: '',
                    orderIndex: orderIndex++,
                    condition_type: sectionType,
                    parentRef: null,
                    depth: 0,
                    is_heading: true
                };
            }
            else if (match) {
                if (currentClause) clauses.push(currentClause);

                const num = match[1];
                const rest = match[5];

                let title = rest;
                let body = '';

                if (rest.length > 50 || rest.includes(' the ')) {
                    title = num;
                    body = rest;
                } else {
                    title = rest;
                    body = '';
                }

                currentClause = {
                    itemType: 'CLAUSE',
                    clause_number: num,
                    clause_title: title,
                    clause_text: body,
                    number: num,
                    heading: title,
                    text: body,
                    orderIndex: orderIndex++,
                    condition_type: sectionType,
                    parentRef: match[2],
                    depth: 1
                };
            } else {
                if (currentClause) {
                    currentClause.clause_text += (currentClause.clause_text ? '\n' : '') + trimmed;
                    currentClause.text += (currentClause.text ? '\n' : '') + trimmed;
                } else {
                    clauses.push({
                        itemType: 'PARAGRAPH',
                        text: trimmed,
                        orderIndex: orderIndex++
                    });
                }
            }
        } catch (err) {
            console.error(`Error parsing line ${i}: ${line}`, err);
        }
    }

    if (currentClause) clauses.push(currentClause);
    return clauses;
}

async function main() {
    try {
        console.log('🚀 Starting Import...');

        console.log(`   GC Path: ${GC_PATH}`);
        if (!fs.existsSync(GC_PATH)) throw new Error(`GC file missing`);
        const gcRaw = fs.readFileSync(GC_PATH, 'utf-8');
        console.log(`   Read GC: ${gcRaw.length} chars`);

        console.log(`   PC Path: ${PC_PATH}`);
        if (!fs.existsSync(PC_PATH)) throw new Error(`PC file missing`);
        const pcRaw = fs.readFileSync(PC_PATH, 'utf-8');
        console.log(`   Read PC: ${pcRaw.length} chars`);

        console.log('🔍 Parsing GC...');
        const gcClauses = parseTextToClauses(gcRaw, 'General', 'General Conditions');
        console.log(`   Found ${gcClauses.length} GC items.`);

        console.log('🔍 Parsing PC...');
        const pcClauses = parseTextToClauses(pcRaw, 'Particular', 'Particular Conditions');
        console.log(`   Found ${pcClauses.length} PC items.`);

        console.log('\n💾 Connecting to Supabase...');

        // Delete items
        const { error: delItemsErr } = await supabase.from('contract_items').delete().eq('contract_id', CONTRACT_ID);
        if (delItemsErr) throw new Error(delItemsErr.message);
        console.log('   Deleted old items.');

        // Delete sections
        const { error: delSecErr } = await supabase.from('contract_sections').delete().eq('contract_id', CONTRACT_ID);
        if (delSecErr) throw new Error(delSecErr.message);
        console.log('   Deleted old sections.');

        // Contract Metadata
        const contractMetadata = {
            id: CONTRACT_ID,
            name: CONTRACT_NAME,
            timestamp: Date.now(),
            metadata: {
                totalClauses: gcClauses.length + pcClauses.length,
                generalCount: gcClauses.length,
                particularCount: pcClauses.length,
                highRiskCount: 0,
                conflictCount: 0
            },
            uses_subcollections: true
        };

        console.log('   Upserting contract metadata...');
        const { error: mainError } = await supabase.from('contracts').upsert(contractMetadata);
        if (mainError) throw mainError;

        const sections = [
            { sectionType: 'GENERAL', title: 'General Conditions', items: gcClauses },
            { sectionType: 'PARTICULAR', title: 'Particular Conditions', items: pcClauses }
        ];

        console.log('   Saving Sections...');
        for (const section of sections) {
            console.log(`     Saving ${section.sectionType} section...`);
            const { error: sectionError } = await supabase
                .from('contract_sections')
                .upsert({
                    contract_id: CONTRACT_ID,
                    section_type: section.sectionType,
                    title: section.title,
                    item_count: section.items.length
                });
            if (sectionError) throw sectionError;

            const itemsToInsert = section.items.map((item, index) => ({
                contract_id: CONTRACT_ID,
                section_type: section.sectionType,
                order_index: index,
                item_data: removeUndefinedValues(item)
            }));

            console.log(`     Inserting ${itemsToInsert.length} items...`);
            for (let i = 0; i < itemsToInsert.length; i += 50) {
                const chunk = itemsToInsert.slice(i, i + 50);
                const { error: itemsError } = await supabase.from('contract_items').insert(chunk);
                if (itemsError) throw itemsError;
            }
        }

        console.log('✅ Import Complete!');
    } catch (e) {
        console.error('❌ Error details:', e);
        process.exit(1);
    }
}

main();
