import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(rootDir, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClauseReferences() {
    console.log('=== CHECKING FOR CLAUSE REFERENCES IN ATRIUM CONTRACT ===\n');

    // Find Atrium contract
    const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .ilike('name', '%Atrium%');

    if (contractError || !contracts || contracts.length === 0) {
        console.error('Could not find Atrium contract');
        return;
    }

    const contractId = contracts[0].id;
    console.log(`Contract ID: ${contractId}`);
    console.log(`Contract Name: ${contracts[0].name}\n`);

    // Get all items
    const { data: items, error: itemsError } = await supabase
        .from('contract_items')
        .select('item_data')
        .eq('contract_id', contractId);

    if (itemsError) {
        console.error('Error fetching items:', itemsError);
        return;
    }

    console.log(`Total clauses: ${items.length}\n`);

    // Regex pattern for clause references
    const clausePattern = /(?:Clause|Sub-[Cc]lause)\s+([0-9]+[A-Za-z]?(?:\.[0-9]+[A-Za-z]?)*(?:\s*\([a-z0-9]+\))?)/gi;

    let totalReferences = 0;
    const clausesWithReferences = [];

    // Check each clause for references
    items.forEach(item => {
        const data = item.item_data;
        const texts = [
            data.clause_text,
            data.general_condition,
            data.particular_condition
        ].filter(Boolean);

        const fullText = texts.join(' ');
        const matches = fullText.match(clausePattern);

        if (matches && matches.length > 0) {
            totalReferences += matches.length;
            clausesWithReferences.push({
                number: data.clause_number,
                title: data.clause_title,
                references: matches
            });
        }
    });

    console.log('=== RESULTS ===\n');
    console.log(`Total clause references found: ${totalReferences}`);
    console.log(`Clauses containing references: ${clausesWithReferences.length}\n`);

    if (clausesWithReferences.length > 0) {
        console.log('Sample clauses with references:\n');
        clausesWithReferences.slice(0, 10).forEach(c => {
            console.log(`Clause ${c.number}: ${c.title}`);
            console.log(`  References: ${c.references.join(', ')}`);
            console.log('');
        });
    } else {
        console.log('⚠️  NO CLAUSE REFERENCES FOUND!');
        console.log('The Atrium contract text does not contain any "Clause X" or "Sub-clause X" references.');
        console.log('This is why no hyperlinks are appearing - there\'s nothing to linkify!\n');

        // Show a sample of clause text to verify
        console.log('Sample of clause text content:\n');
        for (let i = 0; i < Math.min(3, items.length); i++) {
            const data = items[i].item_data;
            const text = (data.clause_text || data.general_condition || '').substring(0, 200);
            console.log(`Clause ${data.clause_number}:`);
            console.log(`  "${text}..."\n`);
        }
    }
}

checkClauseReferences().catch(console.error);
