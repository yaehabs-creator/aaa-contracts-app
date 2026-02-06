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

// Replicate the normalizeClauseId function from navigation.ts
const normalizeClauseId = (clauseNumber) => {
    if (!clauseNumber) return '';
    return clauseNumber
        .trim()
        .replace(/\s+/g, '')      // Remove all spaces
        .replace(/[()]/g, '')     // Remove parentheses
        .replace(/[[\]]/g, '')    // Remove brackets
        .toLowerCase()            // Normalize case for matching
        .replace(/^clause-?/i, '') // Remove "clause-" prefix if present
        .toUpperCase();           // Convert back to uppercase for display consistency
};

// Replicate the generateClauseIdVariants function
const generateClauseIdVariants = (clauseNumber) => {
    if (!clauseNumber) return [];

    const base = clauseNumber.trim();
    const normalized = normalizeClauseId(base);

    const variants = new Set();
    variants.add(normalized);
    variants.add(normalized.toLowerCase());
    variants.add(normalized.toUpperCase());

    const numericOnly = normalized.replace(/[A-Za-z]/g, '');
    if (numericOnly && numericOnly !== normalized) {
        variants.add(numericOnly);
    }

    const subPartMatch = normalized.match(/^(\d+(?:\.\d+)*)([A-Za-z])$/);
    if (subPartMatch) {
        variants.add(`${subPartMatch[1]}.${subPartMatch[2]}`);
        variants.add(`${subPartMatch[1]}${subPartMatch[2].toLowerCase()}`);
        variants.add(`${subPartMatch[1]}${subPartMatch[2].toUpperCase()}`);
    }

    return Array.from(variants);
};

// Replicate the linkifyText function from App.tsx
const linkifyText = (text, availableClauseIds) => {
    if (!text) return "";

    // If no available clause IDs provided, return text without links
    if (!availableClauseIds || availableClauseIds.size === 0) {
        return text;
    }

    // The pattern from App.tsx
    const pattern = /(?:[Cc]lause|[Ss]ub-[Cc]lause)\s+([0-9]+[A-Za-z]?(?:\.[0-9]+[A-Za-z]?)*(?:\s*\([a-z0-9]+\))?)(?=[\s,;:.)\\]"]|$)/g;

    return text.replace(pattern, (match, number) => {
        const cleanId = normalizeClauseId(number);

        if (availableClauseIds.has(cleanId)) {
            return `<a href="#clause-${cleanId}" class="clause-link">${match}</a>`;
        }

        const variants = generateClauseIdVariants(number);
        for (const variant of variants) {
            if (availableClauseIds.has(variant)) {
                return `<a href="#clause-${variant}" class="clause-link">${match}</a>`;
            }
        }

        return match;
    });
};

async function testClauseLinking() {
    console.log('=== TESTING CLAUSE LINKING ===\n');

    // Find Atrium contract
    const { data: contracts } = await supabase
        .from('contracts')
        .select('*')
        .ilike('name', '%Atrium%');

    if (!contracts || contracts.length === 0) {
        console.error('Could not find Atrium contract');
        return;
    }

    const contractId = contracts[0].id;
    console.log(`Contract ID: ${contractId}`);
    console.log(`Contract Name: ${contracts[0].name}\n`);

    // Get all items
    const { data: items } = await supabase
        .from('contract_items')
        .select('item_data')
        .eq('contract_id', contractId);

    console.log(`Total clauses: ${items.length}\n`);

    // Build available clause IDs set
    const availableClauseIds = new Set();
    items.forEach(item => {
        const clauseNumber = item.item_data.clause_number;
        if (clauseNumber) {
            const normalized = normalizeClauseId(clauseNumber);
            availableClauseIds.add(normalized);

            const variants = generateClauseIdVariants(clauseNumber);
            variants.forEach(v => availableClauseIds.add(v));
        }
    });

    console.log(`Available clause IDs: ${availableClauseIds.size}`);
    console.log(`Sample IDs: ${Array.from(availableClauseIds).slice(0, 20).join(', ')}\n`);

    // Find clauses with references and test linking
    let referencesFound = 0;
    let linksCreated = 0;

    console.log('=== TESTING LINKIFY ===\n');

    items.forEach(item => {
        const data = item.item_data;
        const texts = [data.clause_text, data.general_condition, data.particular_condition].filter(Boolean);

        texts.forEach(text => {
            const pattern = /(?:[Cc]lause|[Ss]ub-[Cc]lause)\s+([0-9]+[A-Za-z]?(?:\.[0-9]+[A-Za-z]?)*(?:\s*\([a-z0-9]+\))?)(?=[\s,;:.)\\]"]|$)/g;
            const matches = text.match(pattern);

            if (matches) {
                referencesFound += matches.length;

                // Apply linkify
                const linked = linkifyText(text, availableClauseIds);
                const linkMatches = linked.match(/<a [^>]*class="clause-link"[^>]*>/g);
                if (linkMatches) {
                    linksCreated += linkMatches.length;
                }
            }
        });
    });

    console.log(`Clause references found: ${referencesFound}`);
    console.log(`Links created: ${linksCreated}\n`);

    if (linksCreated === 0 && referencesFound > 0) {
        console.log('⚠️  PROBLEM: References found but no links created!\n');

        // Debug: check one specific case
        const testClauseNum = '16.1';
        console.log(`Checking if clause ${testClauseNum} exists in available IDs...`);
        const normalized = normalizeClauseId(testClauseNum);
        console.log(`Normalized ID: "${normalized}"`);
        console.log(`In set: ${availableClauseIds.has(normalized)}`);

        // Check if 16.1 clause exists
        const clause161 = items.find(i => i.item_data.clause_number === '16.1');
        console.log(`Clause 16.1 exists in data: ${!!clause161}`);

        if (clause161) {
            console.log(`\nTrying to linkify text containing 'Clause 16.1'...`);
            const testText = "This is a reference to Clause 16.1 in the contract.";
            const result = linkifyText(testText, availableClauseIds);
            console.log(`Input: "${testText}"`);
            console.log(`Output: "${result}"`);
        }
    } else if (linksCreated > 0) {
        console.log('✅ Links are being created! The issue might be elsewhere.\n');

        // Show a sample
        const sampleItem = items.find(item => {
            const text = item.item_data.clause_text || item.item_data.general_condition || '';
            return text.includes('Clause ');
        });

        if (sampleItem) {
            const text = sampleItem.item_data.clause_text || sampleItem.item_data.general_condition;
            const linked = linkifyText(text, availableClauseIds);
            console.log(`Sample before: "${text.substring(0, 200)}..."`);
            console.log(`Sample after: "${linked.substring(0, 300)}..."`);
        }
    }
}

testClauseLinking().catch(console.error);
