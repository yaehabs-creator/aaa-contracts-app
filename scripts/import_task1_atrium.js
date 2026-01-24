import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env.local');

if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Inputs
const GC_PATH = join(rootDir, '1. ATRIUM GC.txt');
const PC_PATH = join(rootDir, 'ATRIUM PC .txt');
const DATA_DIR = join(rootDir, 'contract2_data');

// Ensure data dir
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Generate NEW ID
const CONTRACT_ID = crypto.randomUUID();
const CONTRACT_NAME = "Contract #2: Atrium Construction Contract (Recovery)";

console.log(`Using Contract ID: ${CONTRACT_ID}`);

function parseTextToClauses(text, sectionType) {
    const lines = text.split(/\r?\n/);
    const clauses = [];
    const clauseMap = new Map();
    let currentClause = null;
    let orderIndex = 0;

    // Regex strict: "1.1", "4.2", "4.2(a)" NOT matched as 4.2?
    // User said: "Detect clause refs like: 1, 1.1, 1.1.1, Sub-Clause 4.2, 4.2(a)"
    // "Preserve numbering exactly"
    // If line starts with "4.2(a) ...", number is "4.2(a)".

    // Regex adjustment:
    // Start with optional "Sub-Clause"
    // Capture Number: digits/dots/parens?
    // But be careful not to capture text.
    // Typical pattern: ^(Sub-Clause\s+)?([\d\w\.\(\)]+)\s+(.*)

    // But `1. ATRIUM GC.txt` uses "1.1 Definitions".
    // I'll stick to my previous regex but allow parens in number.
    const clauseRegex = /^\s*(?:Sub-Clause\s+)?((?:\d+[A-Z]?)(?:\.\d+[A-Z]?)*(?:\([a-z0-9]+\))?)\s*(.*)/i;
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

        // Filter out false positives like numbers in text?
        // E.g. "20. Claims" -> Heading
        // "4.2(a) If..." -> Clause 4.2(a)

        let newClause = null;

        if (headingMatch) {
            // Heading usually implies start of section? Treat as clause?
            // Contract #1 uses "number" for headers too?
            newClause = {
                number: headingMatch[1],
                heading: headingMatch[2].trim(),
                text: '',
                clause_number: headingMatch[1],
                clause_title: headingMatch[2].trim(),
                clause_text: '',
                itemType: 'CLAUSE',
                condition_type: sectionType === 'GC' ? 'General' : 'Particular'
            };
        } else if (match) {
            const num = match[1];
            // Validate num looks like a clause number (must have digits)
            if (!/\d/.test(num)) {
                // Just text
                if (currentClause) {
                    currentClause.text += '\n' + line;
                    currentClause.clause_text += '\n' + line;
                }
                continue;
            }

            const rest = match[2];
            let title = rest;
            let body = '';

            // Heuristic for title
            if (rest.length > 50 || rest.includes(' the ') || rest.includes(' shall ')) {
                title = num; // No title, just text
                body = rest;
            } else {
                title = rest;
                body = ''; // Expect text on next lines?
            }

            newClause = {
                number: num,
                heading: title,
                text: body,
                clause_number: num,
                clause_title: title,
                clause_text: body,
                itemType: 'CLAUSE',
                condition_type: sectionType === 'GC' ? 'General' : 'Particular'
            };
        } else {
            if (currentClause) {
                currentClause.text += '\n' + line;
                currentClause.clause_text += '\n' + line;
            }
        }

        if (newClause) {
            if (clauseMap.has(newClause.clause_number)) {
                // Merge duplicate keys (Particular often has splits)
                const existing = clauseMap.get(newClause.clause_number);
                if (newClause.text) {
                    existing.text += '\n\n' + newClause.text;
                    existing.clause_text += '\n\n' + newClause.clause_text;
                }
                currentClause = existing;
            } else {
                newClause.orderIndex = orderIndex++;
                clauseMap.set(newClause.clause_number, newClause);
                clauses.push(newClause);
                currentClause = newClause;
            }
        }
    }
    return clauses;
}

function removeUndefinedValues(obj) {
    return JSON.parse(JSON.stringify(obj));
}

async function main() {
    try {
        console.log('--- Phase 1: Parsing ---');
        console.log(`Reading ${GC_PATH}`);
        const gcRaw = fs.readFileSync(GC_PATH, 'utf-8');
        const gcClauses = parseTextToClauses(gcRaw, 'GC');
        console.log(`Parsed GC: ${gcClauses.length} clauses`);
        fs.writeFileSync(join(DATA_DIR, 'parsed_gc.json'), JSON.stringify(gcClauses, null, 2));

        console.log(`Reading ${PC_PATH}`);
        const pcRaw = fs.readFileSync(PC_PATH, 'utf-8');
        const pcClauses = parseTextToClauses(pcRaw, 'PC');
        console.log(`Parsed PC: ${pcClauses.length} clauses`);
        fs.writeFileSync(join(DATA_DIR, 'parsed_pc.json'), JSON.stringify(pcClauses, null, 2));

        console.log('--- Phase 2: Uploading ---');

        // Metadata
        const meta = {
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

        const { error: mErr } = await supabase.from('contracts').insert(meta); // INSERT (Safe, err if exists)
        if (mErr) throw mErr;
        console.log('Contract inserted.');

        // Sections
        const sections = [
            { type: 'GENERAL', title: 'General Conditions', items: gcClauses },
            { type: 'PARTICULAR', title: 'Particular Conditions', items: pcClauses }
        ];

        for (const sec of sections) {
            console.log(`Section: ${sec.type}`);
            const { error: sErr } = await supabase.from('contract_sections').insert({
                contract_id: CONTRACT_ID,
                section_type: sec.type,
                title: sec.title,
                item_count: sec.items.length
            });
            if (sErr) throw sErr;

            // Items
            const items = sec.items.map((item, idx) => ({
                contract_id: CONTRACT_ID,
                section_type: sec.type,
                order_index: idx,
                item_data: removeUndefinedValues(item)
            }));

            for (let i = 0; i < items.length; i += 50) {
                const chunk = items.slice(i, i + 50);
                const { error: iErr } = await supabase.from('contract_items').insert(chunk);
                if (iErr) throw iErr;
                process.stdout.write('.');
            }
            process.stdout.write('\n');
        }

        console.log('--- Success ---');
        console.log(`New Contract ID: ${CONTRACT_ID}`);

    } catch (e) {
        console.error('Failure:', e);
        process.exit(1);
    }
}

main();
