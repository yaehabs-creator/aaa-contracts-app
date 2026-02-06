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

const GC_PATH = join(rootDir, '1. ATRIUM GC.txt');
const CONTRACT_ID = crypto.randomUUID();
const CONTRACT_NAME = "Contract #2: Atrium GC (General Conditions)";

console.log(`Contract ID: ${CONTRACT_ID}\n`);

function parseGCStrictSubClauses(text) {
    const lines = text.split(/\r?\n/);
    const storedClauses = [];

    let currentSectionNumber = null;
    let currentSectionTitle = null;
    let currentClause = null;
    let orderIndex = 0;

    // Stats
    let sectionHeaderCount = 0;
    let subClauseCount = 0;

    // Regex patterns
    // Section header: "10 Title" or "10. Title" or "Clause 10 Title"
    const sectionHeaderRegex = /^(?:Clause\s+)?(\d+)\.?\s+([A-Z][A-Z\s,\-]+)$/;

    // Sub-clause: "10.1" or "10.2" (X.Y format ONLY)
    const subClauseRegex = /^(\d+)\.(\d+)\s+(.*)$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Check for section header (NOT stored)
        const sectionMatch = line.match(sectionHeaderRegex);
        if (sectionMatch) {
            // Save previous clause if exists
            if (currentClause) {
                storedClauses.push(currentClause);
                currentClause = null;
            }

            currentSectionNumber = sectionMatch[1];
            currentSectionTitle = sectionMatch[2].trim();
            sectionHeaderCount++;
            console.log(`[Section ${currentSectionNumber}] ${currentSectionTitle} (NOT stored)`);
            continue;
        }

        // Check for sub-clause (X.Y format - STORED)
        const subClauseMatch = line.match(subClauseRegex);
        if (subClauseMatch) {
            // Save previous clause
            if (currentClause) {
                storedClauses.push(currentClause);
            }

            const clauseRef = `${subClauseMatch[1]}.${subClauseMatch[2]}`;
            const restOfLine = subClauseMatch[3];

            currentClause = {
                itemType: 'CLAUSE',
                clause_number: clauseRef,
                clause_title: restOfLine.length > 60 ? clauseRef : restOfLine,
                clause_text: restOfLine,
                number: clauseRef,
                heading: restOfLine.length > 60 ? clauseRef : restOfLine,
                text: restOfLine,
                condition_type: 'General',
                orderIndex: orderIndex++,
                sectionNumber: currentSectionNumber,
                sectionTitle: currentSectionTitle
            };

            subClauseCount++;
            continue;
        }

        // Continuation line - append to current clause
        if (currentClause) {
            currentClause.clause_text += '\n' + line;
            currentClause.text += '\n' + line;
        }
    }

    // Save last clause
    if (currentClause) {
        storedClauses.push(currentClause);
    }

    console.log(`\n=== PARSING STATS ===`);
    console.log(`Section Headers Detected: ${sectionHeaderCount}`);
    console.log(`Sub-Clauses Stored (X.Y): ${subClauseCount}`);
    console.log(`Total Stored Records: ${storedClauses.length}`);

    return storedClauses;
}

async function main() {
    try {
        console.log('=== PARSING GC FILE ===\n');
        const gcText = fs.readFileSync(GC_PATH, 'utf-8');
        const clauses = parseGCStrictSubClauses(gcText);

        console.log(`\n=== SAMPLE STORED CLAUSES (First 10) ===`);
        clauses.slice(0, 10).forEach((c, idx) => {
            console.log(`${idx + 1}. [${c.clause_number}] ${c.clause_title.substring(0, 50)}...`);
            console.log(`   Text: ${c.clause_text.substring(0, 80).replace(/\n/g, ' ')}...`);
        });

        console.log(`\n=== UPLOADING TO SUPABASE ===`);

        // Create contract
        const { error: cErr } = await supabase.from('contracts').insert({
            id: CONTRACT_ID,
            name: CONTRACT_NAME,
            timestamp: Date.now(),
            metadata: {
                totalClauses: clauses.length,
                generalCount: clauses.length,
                particularCount: 0,
                highRiskCount: 0,
                conflictCount: 0
            },
            uses_subcollections: true
        });
        if (cErr) throw cErr;
        console.log('✓ Contract created');

        // Create section
        const { error: sErr } = await supabase.from('contract_sections').insert({
            contract_id: CONTRACT_ID,
            section_type: 'GENERAL',
            title: 'General Conditions',
            item_count: clauses.length
        });
        if (sErr) throw sErr;
        console.log('✓ Section created');

        // Insert items
        const items = clauses.map((c, idx) => ({
            contract_id: CONTRACT_ID,
            section_type: 'GENERAL',
            order_index: idx,
            item_data: JSON.parse(JSON.stringify(c))
        }));

        for (let i = 0; i < items.length; i += 50) {
            const chunk = items.slice(i, i + 50);
            const { error: iErr } = await supabase.from('contract_items').insert(chunk);
            if (iErr) throw iErr;
            process.stdout.write('.');
        }
        console.log('\n✓ Items inserted');

        console.log(`\n=== SUCCESS ===`);
        console.log(`Contract #2 ID: ${CONTRACT_ID}`);
        console.log(`Stored ${clauses.length} sub-clauses (X.Y format only)`);

        // Verify Contract #1 unchanged
        console.log(`\n=== VERIFYING CONTRACT #1 ===`);
        const { data: c1, error: c1Err } = await supabase
            .from('contracts')
            .select('id, name')
            .ilike('name', '%Hassan Allam%')
            .single();

        if (c1) {
            const { count } = await supabase
                .from('contract_items')
                .select('*', { count: 'exact', head: true })
                .eq('contract_id', c1.id);
            console.log(`✓ Contract #1: ${c1.name}`);
            console.log(`  Items: ${count} (unchanged)`);
        }

    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
}

main();
