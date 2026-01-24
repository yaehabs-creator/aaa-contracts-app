import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const GC_PATH = join(rootDir, '1. ATRIUM GC.txt');
const PC_PATH = join(rootDir, 'ATRIUM PC .txt');

function parseTextToClauses(text, sectionType) {
    console.log(`\n🔍 Parsing ${sectionType} (${text.length} chars)...`);
    const lines = text.split(/\r?\n/);
    const clauses = [];
    let currentClause = null;
    let orderIndex = 0;

    const clauseRegex = /^\s*(?:Sub-Clause\s+)?((\d+[A-Z]?)\.(\d+[A-Z]?(\.\d+)?))\s*(.*)/i;
    const headingRegex = /^\s*(\d+[A-Z]?)\.\s+([A-Z\s,\-]+)$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.startsWith('•')) {
            if (currentClause) currentClause.text += '\n' + line;
            continue;
        }

        let headingMatch = line.match(headingRegex);
        let match = line.match(clauseRegex);

        if (headingMatch) {
            if (currentClause) clauses.push(currentClause);
            currentClause = {
                clause_number: headingMatch[1],
                clause_title: headingMatch[2].trim(),
                is_heading: true,
                text: ''
            };
        } else if (match) {
            if (currentClause) clauses.push(currentClause);
            const num = match[1];
            const rest = match[5];
            let title = rest;
            if (rest.length > 50) title = num;

            currentClause = {
                clause_number: num,
                clause_title: title,
                text: rest
            };
        } else {
            if (currentClause) currentClause.text += '\n' + line;
        }
    }
    if (currentClause) clauses.push(currentClause);
    return clauses;
}

async function main() {
    try {
        console.log('📖 Reading files...');
        const gcRaw = fs.readFileSync(GC_PATH, 'utf-8');
        const pcRaw = fs.readFileSync(PC_PATH, 'utf-8');

        const gcClauses = parseTextToClauses(gcRaw, 'GC');
        console.log(`✅ GC Clauses: ${gcClauses.length}`);

        const pcClauses = parseTextToClauses(pcRaw, 'PC');
        console.log(`✅ PC Clauses: ${pcClauses.length}`);

        // Stats
        const gcMap = new Set(gcClauses.map(c => c.clause_number));
        const pcMap = new Set(pcClauses.map(c => c.clause_number));

        let matches = 0;
        pcClauses.forEach(c => {
            if (gcMap.has(c.clause_number)) matches++;
        });

        console.log(`\n📊 Matches: ${matches}`);
        console.log(`   GC Only: ${gcClauses.length - matches}`);
        console.log(`   PC Only: ${pcClauses.length - matches}`);

        console.log('\n📋 Sample Matches:');
        const samples = pcClauses.filter(c => gcMap.has(c.clause_number)).slice(0, 5);
        samples.forEach(c => {
            console.log(`   [${c.clause_number}] ${c.clause_title.substring(0, 30)}...`);
        });

    } catch (e) {
        console.error(e);
    }
}

main();
