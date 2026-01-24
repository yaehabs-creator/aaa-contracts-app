import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

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

function parseTextToClauses(text, sectionType) {
    console.log(`\n🔍 Parsing ${sectionType}...`);
    const lines = text.split(/\r?\n/);
    // Use Map to handle duplicates automatically
    const clauseMap = new Map(); // number -> clauseObj
    const clauseOrder = []; // Keep order

    let currentClause = null;
    let orderIndex = 0;

    const clauseRegex = /^\s*(?:Sub-Clause\s+)?((\d+[A-Z]?)\.(\d+[A-Z]?(\.\d+)?))\s*(.*)/i;
    const headingRegex = /^\s*(\d+[A-Z]?)\.\s+([A-Z\s,\-]+)$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.startsWith('•')) {
            if (currentClause) {
                currentClause.text += '\n' + line;
                currentClause.clause_text += '\n' + line;
            }
            continue;
        }

        let headingMatch = line.match(headingRegex);
        let match = line.match(clauseRegex);

        let newClause = null;

        if (headingMatch) {
            newClause = {
                clause_number: headingMatch[1],
                clause_title: headingMatch[2].trim(),
                is_heading: true,
                text: '',
                clause_text: '',
                itemType: 'CLAUSE',
                condition_type: sectionType === 'GC' ? 'General' : 'Particular',
                number: headingMatch[1],
                heading: headingMatch[2].trim()
            };
        } else if (match) {
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

            newClause = {
                clause_number: num,
                clause_title: title,
                text: body,
                clause_text: body,
                itemType: 'CLAUSE',
                condition_type: sectionType === 'GC' ? 'General' : 'Particular',
                number: num,
                heading: title
            };
        } else {
            // Continuation
            if (currentClause) {
                currentClause.text += '\n' + line;
                currentClause.clause_text += '\n' + line;
            } else {
                // Orphan text (preamble) - we ignore for map, but could add as PARAGRAPH?
                // For simplicity, let's ignore or attach to previous if exists
            }
        }

        if (newClause) {
            // Check if exists
            if (clauseMap.has(newClause.clause_number)) {
                // Merge!
                const existing = clauseMap.get(newClause.clause_number);
                // Append text
                if (newClause.text) {
                    existing.text += '\n\n' + newClause.text;
                    existing.clause_text += '\n\n' + newClause.clause_text;
                }
                currentClause = existing;
            } else {
                // New
                newClause.orderIndex = orderIndex++;
                clauseMap.set(newClause.clause_number, newClause);
                clauseOrder.push(newClause);
                currentClause = newClause;
            }
        }
    }

    return clauseOrder;
}

async function main() {
    try {
        console.log('🚀 Starting Final Import...');

        const gcRaw = fs.readFileSync(GC_PATH, 'utf-8');
        const pcRaw = fs.readFileSync(PC_PATH, 'utf-8');

        const gcClauses = parseTextToClauses(gcRaw, 'GC');
        console.log(`✅ GC Clauses (Unique): ${gcClauses.length}`);

        const pcClauses = parseTextToClauses(pcRaw, 'PC');
        console.log(`✅ PC Clauses (Unique): ${pcClauses.length}`);

        console.log('\n💾 Connecting to Supabase...');

        // Cleanup
        await supabase.from('contract_items').delete().eq('contract_id', CONTRACT_ID);
        await supabase.from('contract_sections').delete().eq('contract_id', CONTRACT_ID);

        // Contract
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

        const { error: mainError } = await supabase.from('contracts').upsert(contractMetadata);
        if (mainError) throw mainError;

        // Sections
        const sections = [
            { sectionType: 'GENERAL', title: 'General Conditions', items: gcClauses },
            { sectionType: 'PARTICULAR', title: 'Particular Conditions', items: pcClauses }
        ];

        for (const section of sections) {
            console.log(`   Saving ${section.sectionType}...`);
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

            // Batch
            for (let i = 0; i < itemsToInsert.length; i += 50) {
                const chunk = itemsToInsert.slice(i, i + 50);
                const { error: itemsError } = await supabase.from('contract_items').insert(chunk);
                if (itemsError) throw itemsError;
            }
        }

        console.log('\n✅ Import Complete!');

    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}

main();
