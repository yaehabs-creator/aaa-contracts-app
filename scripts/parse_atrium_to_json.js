import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const GC_PATH = join(rootDir, '1. ATRIUM GC.txt');
const PC_PATH = join(rootDir, 'ATRIUM PC .txt');
const OUT_PATH = join(rootDir, 'atrium_data.json');

function parseTextToClauses(text, sectionType) {
    console.log(`\n🔍 Parsing ${sectionType}...`);
    const lines = text.split(/\r?\n/);
    const clauseMap = new Map();
    const clauseOrder = [];

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
                clause_text: body, // Ensure both fields used by schema
                itemType: 'CLAUSE',
                condition_type: sectionType === 'GC' ? 'General' : 'Particular',
                number: num,
                heading: title
            };
        } else {
            if (currentClause) {
                currentClause.text += '\n' + line;
                currentClause.clause_text += '\n' + line;
            }
        }

        if (newClause) {
            if (clauseMap.has(newClause.clause_number)) {
                // Merge
                const existing = clauseMap.get(newClause.clause_number);
                if (newClause.text) {
                    existing.text += '\n\n' + newClause.text;
                    existing.clause_text += '\n\n' + newClause.clause_text;
                }
                currentClause = existing;
            } else {
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
        console.log('📖 Reading files...');
        const gcRaw = fs.readFileSync(GC_PATH, 'utf-8');
        const pcRaw = fs.readFileSync(PC_PATH, 'utf-8');

        const gcClauses = parseTextToClauses(gcRaw, 'GC');
        const pcClauses = parseTextToClauses(pcRaw, 'PC');

        const data = {
            gc: gcClauses,
            pc: pcClauses
        };

        fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
        console.log(`✅ Saved parsed data to ${OUT_PATH}`);
        console.log(`   GC: ${gcClauses.length}, PC: ${pcClauses.length}`);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
