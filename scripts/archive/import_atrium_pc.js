import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
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

// Contract ID for Atrium (the new rebuilt contract)
const ATRIUM_CONTRACT_ID = 'cfb1883c-bf70-410d-afe2-8273467ea099';

/**
 * Parse the Particular Conditions text file and extract clauses
 */
function parseParticularConditions(text) {
    const clauses = [];
    
    // Split by lines and process
    const lines = text.split('\n');
    let currentClause = null;
    let currentContent = [];
    
    // Patterns to identify clause headers
    // Match patterns like "1.1 Definitions:", "5.7 As-built Drawings", "6A FREE ISSUE ITEMS", etc.
    const clauseHeaderPattern = /^(\d+[A-Z]?(?:\.\d+)?(?:\s*\([a-z]\))?)\s+(.+?)(?::|$)/;
    const subClausePattern = /^(\d+[A-Z]?\.\d+)\s+(.+?)$/;
    const newClausePattern = /^Add [Nn]ew (?:Sub-)?[Cc]lause[s]?\s+(\d+[A-Z]?(?:\.\d+)?(?:\s*[&,]\s*\d+[A-Z]?(?:\.\d+)?)*)\s+as follows/i;
    const deletePattern = /^Delete this Sub-Clause/i;
    const addPattern = /^Add (?:the following|new)/i;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines at the start of content
        if (!line && !currentClause) continue;
        
        // Check for main clause headers (like "1.1 Definitions:")
        const headerMatch = line.match(clauseHeaderPattern);
        const subMatch = line.match(subClausePattern);
        
        // Check if this is a new clause section
        if (headerMatch && !line.startsWith('(') && !line.startsWith('•')) {
            // Save previous clause if exists
            if (currentClause) {
                clauses.push({
                    clause_number: currentClause.number,
                    clause_title: currentClause.title,
                    particular_condition: currentContent.join('\n').trim()
                });
            }
            
            currentClause = {
                number: headerMatch[1],
                title: headerMatch[2].replace(/:$/, '').trim()
            };
            currentContent = [];
        } else if (subMatch && !line.startsWith('(') && !line.startsWith('•') && line.length < 100) {
            // This might be a sub-clause header
            // Save previous clause if exists
            if (currentClause) {
                clauses.push({
                    clause_number: currentClause.number,
                    clause_title: currentClause.title,
                    particular_condition: currentContent.join('\n').trim()
                });
            }
            
            currentClause = {
                number: subMatch[1],
                title: subMatch[2].trim()
            };
            currentContent = [];
        } else if (currentClause) {
            // Add content to current clause
            currentContent.push(line);
        }
    }
    
    // Don't forget the last clause
    if (currentClause) {
        clauses.push({
            clause_number: currentClause.number,
            clause_title: currentClause.title,
            particular_condition: currentContent.join('\n').trim()
        });
    }
    
    return clauses;
}

/**
 * Manually parse the PC text with better structure awareness
 */
function parseParticularConditionsManual(text) {
    const clauses = new Map();
    
    // Define the clause sections we know exist in the PC document
    const knownSections = [
        { start: '1.1 Definitions:', number: '1.1', title: 'Definitions' },
        { start: '1.6 Notices, Consents, Approvals and Agreements', number: '1.6', title: 'Notices, Consents, Approvals and Agreements' },
        { start: '1.7 Communications', number: '1.7', title: 'Communications' },
        { start: '4. CONTRACT DOCUMENTS', number: '4', title: 'Contract Documents' },
        { start: '5.1 Submission and Approval', number: '5.1', title: 'Submission and Approval' },
        { start: '5.7 As-built Drawings', number: '5.7', title: 'As-built Drawings, Operations and Maintenance Manuals' },
        { start: '6. OBLIGATIONS OF THE CONTRACTOR', number: '6', title: 'Obligations of the Contractor' },
        { start: '6.1 General Obligations', number: '6.1', title: 'General Obligations' },
        { start: '6.8 Quality Assurance', number: '6.8', title: 'Quality Assurance' },
        { start: '6A FREE ISSUE ITEMS', number: '6A', title: 'Free Issue Items' },
        { start: '6A.2 Collection and Taking Delivery', number: '6A.2', title: 'Collection and Taking Delivery' },
        { start: '6A.5 Notification of Damage', number: '6A.5', title: 'Notification of Damage' },
        { start: '6A.6 Surplus Items', number: '6A.6', title: 'Surplus Items' },
        { start: '6A.8 Contractor\'s Confirmation Procedures', number: '6A.8', title: 'Contractor\'s Confirmation Procedures' },
        { start: '6B EARLY PROCURED MATERIALS', number: '6B', title: 'Early Procured Materials' },
        { start: '7. BONDS', number: '7', title: 'Bonds' },
        { start: '7.1 Provision of Bonds', number: '7.1', title: 'Provision of Bonds' },
        { start: '9. THE SITE', number: '9', title: 'The Site' },
        { start: '9.1 Information and Inspection', number: '9.1', title: 'Information and Inspection' },
        { start: '9.1A Unforeseeable Physical Conditions', number: '9.1A', title: 'Unforeseeable Physical Conditions' },
        { start: '9.4 Opportunities for Other contractors', number: '9.4', title: 'Opportunities for Other Contractors' },
        { start: '9.6 Notices, Permits, and Fees', number: '9.6', title: 'Notices, Permits, and Fees' },
        { start: '9.13 Fossils', number: '9.13', title: 'Fossils, Remnant of Wars' },
        { start: '9.18 Mobilization', number: '9.18', title: 'Mobilization' },
        { start: '9.19 Independent Site Survey', number: '9.19', title: 'Independent Site Survey and Progressive Surveys' },
        { start: '10.1 Contractor\'s Representative', number: '10.1', title: 'Contractor\'s Representative' },
        { start: '10.3 Employees', number: '10.3', title: 'Employees' },
        { start: '11. PLANT, WORKMANSHIP', number: '11', title: 'Plant, Workmanship and Contractor\'s Equipment' },
        { start: '11.1 General', number: '11.1', title: 'General' },
        { start: '11.2 Inspection and Testing', number: '11.2', title: 'Inspection and Testing' },
        { start: '11.3 Covering and Uncovering', number: '11.3', title: 'Covering and Uncovering the Works' },
        { start: '11.4 Cost of Testing', number: '11.4', title: 'Cost of Testing' },
        { start: '12. TITLE, RISK, CARE', number: '12', title: 'Title, Risk, Care, Indemnities, and Insurance' },
        { start: '12.5 Risk and Care', number: '12.5', title: 'Risk and Care' },
        { start: '12.6 General Indemnity', number: '12.6', title: 'General Indemnity' },
        { start: '12.9 Insurance', number: '12.9', title: 'Insurance' },
        { start: '12.10 Inherent Defects', number: '12.10', title: 'Inherent Defects' },
        { start: '17. COMMENCEMENT AND PROGRESS', number: '17', title: 'Commencement and Progress' },
        { start: '17.1 Commencement', number: '17.1', title: 'Commencement' },
        { start: '17.3 Programme', number: '17.3', title: 'Programme' },
        { start: '17.6 Progress Reports', number: '17.6', title: 'Progress Reports' },
        { start: '17.7 Rate of Progress', number: '17.7', title: 'Rate of Progress' },
        { start: '17.8 Site Working Hours', number: '17.8', title: 'Site Working Hours' },
        { start: '18. SUSPENSION OF WORKS', number: '18', title: 'Suspension of Works' },
        { start: '18.1 Suspension Order', number: '18.1', title: 'Suspension Order' },
        { start: '19. TIME FOR COMPLETION', number: '19', title: 'Time for Completion and Liquidated Damages' },
        { start: '19.1 Time for Completion', number: '19.1', title: 'Time for Completion' },
        { start: '19.2 Extension of Time', number: '19.2', title: 'Extension of Time' },
        { start: '19.3 Liquidated Damages', number: '19.3', title: 'Liquidated Damages' },
        { start: '20. TAKING OVER', number: '20', title: 'Taking Over' },
        { start: '20.1 Taking-Over Certificate', number: '20.1', title: 'Taking-Over Certificate' },
        { start: '20.2 Use Before Taking Over', number: '20.2', title: 'Use Before Taking Over' },
        { start: '20.4 Draft Final Account', number: '20.4', title: 'Draft Final Account' },
        { start: '21. DEFECTS', number: '21', title: 'Defects' },
        { start: '21.1 Completion of Outstanding Work', number: '21.1', title: 'Completion of Outstanding Work' },
        { start: '21.2 Defects after Taking Over', number: '21.2', title: 'Defects after Taking Over' },
        { start: '21.3 Cost of Remedying Defects', number: '21.3', title: 'Cost of Remedying Defects' },
        { start: '21.4 Further Tests on Completion', number: '21.4', title: 'Further Tests on Completion' },
        { start: '21.5 Access after Taking Over', number: '21.5', title: 'Access after Taking Over' },
        { start: '21.6 Delay in Remedying Defects', number: '21.6', title: 'Delay in Remedying Defects' },
        { start: '21.7 Contractor to Search', number: '21.7', title: 'Contractor to Search' },
        { start: '22. VARIATION', number: '22', title: 'Variation' },
        { start: '22.2 Effect on Programme', number: '22.2', title: 'Effect on Programme' },
        { start: '22.3 Valuation of Variation Orders', number: '22.3', title: 'Valuation of Variation Orders' },
        { start: '22.5 Value Engineering', number: '22.5', title: 'Value Engineering' },
        { start: '22.6 If, on the issue', number: '22.6', title: 'Variation Threshold' },
        { start: '22A. PROVISIONAL SUM', number: '22A', title: 'Provisional Sum' },
        { start: '22A.3 Nomination', number: '22A.3', title: 'Nomination' },
        { start: '23. CLAIMS', number: '23', title: 'Claims' },
        { start: '23.1 Notice of Claims', number: '23.1', title: 'Notice of Claims' },
        { start: '23.7 Determination of Claims', number: '23.7', title: 'Determination of Claims' },
        { start: '23.8 Exclusion of Small Claims', number: '23.8', title: 'Exclusion of Small Claims' },
        { start: '25. MEASURMENTS', number: '25', title: 'Measurements' },
        { start: '25.1 Quantities', number: '25.1', title: 'Quantities' },
        { start: '25.2 Works to be Measured', number: '25.2', title: 'Works to be Measured' },
        { start: '25.3 Method of Measurement', number: '25.3', title: 'Method of Measurement' },
        { start: '25.4 Valuation', number: '25.4', title: 'Valuation' },
        { start: '26. INTERIM AND FINAL CERTIFICATES', number: '26', title: 'Interim and Final Certificates' },
        { start: '26.1 Application of Interim Certificates', number: '26.1', title: 'Application of Interim Certificates' },
        { start: '26.2 Issue of Interim Certificates', number: '26.2', title: 'Issue of Interim Certificates' },
    ];
    
    // Find positions of each section in the text
    const sectionPositions = [];
    for (const section of knownSections) {
        const pos = text.indexOf(section.start);
        if (pos !== -1) {
            sectionPositions.push({ ...section, position: pos });
        }
    }
    
    // Sort by position
    sectionPositions.sort((a, b) => a.position - b.position);
    
    // Extract content for each section
    for (let i = 0; i < sectionPositions.length; i++) {
        const current = sectionPositions[i];
        const nextPos = i < sectionPositions.length - 1 ? sectionPositions[i + 1].position : text.length;
        
        const content = text.substring(current.position, nextPos).trim();
        
        // Remove the header line from content
        const lines = content.split('\n');
        const contentWithoutHeader = lines.slice(1).join('\n').trim();
        
        clauses.set(current.number, {
            clause_number: current.number,
            clause_title: current.title,
            particular_condition: contentWithoutHeader
        });
    }
    
    return clauses;
}

/**
 * Main function to import Particular Conditions
 */
async function importParticularConditions() {
    console.log('=== IMPORTING ATRIUM PARTICULAR CONDITIONS ===\n');
    
    // 1. Read the PC text file
    const pcFilePath = join(rootDir, 'atrium Pc.txt');
    let pcText;
    try {
        pcText = readFileSync(pcFilePath, 'utf-8');
        console.log(`✅ Read PC file: ${pcText.length} characters\n`);
    } catch (error) {
        console.error('❌ Failed to read atrium Pc.txt:', error.message);
        process.exit(1);
    }
    
    // 2. Parse the PC text
    const parsedClauses = parseParticularConditionsManual(pcText);
    console.log(`📋 Parsed ${parsedClauses.size} clause sections from PC text\n`);
    
    // Show what we parsed
    console.log('Parsed clauses:');
    for (const [num, clause] of parsedClauses) {
        console.log(`   ${num}: ${clause.clause_title} (${clause.particular_condition.length} chars)`);
    }
    console.log('');
    
    // 3. Get existing clauses from database
    const { data: existingItems, error: fetchError } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', ATRIUM_CONTRACT_ID);
    
    if (fetchError) {
        console.error('❌ Failed to fetch existing items:', fetchError.message);
        process.exit(1);
    }
    
    console.log(`📦 Found ${existingItems.length} existing items in database\n`);
    
    // Create a map of existing clauses by clause_number
    const existingByNumber = new Map();
    for (const item of existingItems) {
        if (item.item_data?.clause_number) {
            existingByNumber.set(item.item_data.clause_number, item);
        }
    }
    
    // 4. Update existing clauses and track new ones
    let updatedCount = 0;
    let newCount = 0;
    let errorCount = 0;
    const newClauses = [];
    
    for (const [clauseNum, pcClause] of parsedClauses) {
        const existing = existingByNumber.get(clauseNum);
        
        if (existing) {
            // Update existing clause with particular_condition
            const updatedItemData = {
                ...existing.item_data,
                particular_condition: pcClause.particular_condition,
                condition_type: existing.item_data.general_condition ? 'Both' : 'Particular'
            };
            
            const { error: updateError } = await supabase
                .from('contract_items')
                .update({ item_data: updatedItemData })
                .eq('contract_id', existing.contract_id)
                .eq('section_type', existing.section_type)
                .eq('order_index', existing.order_index);
            
            if (updateError) {
                console.error(`   ❌ Failed to update ${clauseNum}:`, updateError.message);
                errorCount++;
            } else {
                console.log(`   ✅ Updated ${clauseNum}: ${pcClause.clause_title}`);
                updatedCount++;
            }
        } else {
            // This is a new clause that doesn't exist in GC
            newClauses.push(pcClause);
        }
    }
    
    console.log(`\n📊 Updated ${updatedCount} existing clauses`);
    
    // 5. Add new clauses that only exist in PC
    if (newClauses.length > 0) {
        console.log(`\n🆕 Adding ${newClauses.length} new clauses that only exist in PC:\n`);
        
        // Get the max order_index for the GENERAL section
        const maxOrderIndex = Math.max(...existingItems
            .filter(item => item.section_type === 'GENERAL')
            .map(item => item.order_index));
        
        let orderIndex = maxOrderIndex + 1;
        
        for (const newClause of newClauses) {
            const newItemData = {
                itemType: 'CLAUSE',
                clause_number: newClause.clause_number,
                clause_title: newClause.clause_title,
                clause_text: newClause.particular_condition,
                general_condition: '',
                particular_condition: newClause.particular_condition,
                condition_type: 'Particular',
                time_frames: '',
                has_time_frame: false
            };
            
            const { error: insertError } = await supabase
                .from('contract_items')
                .insert({
                    contract_id: ATRIUM_CONTRACT_ID,
                    section_type: 'GENERAL',
                    order_index: orderIndex++,
                    item_data: newItemData
                });
            
            if (insertError) {
                console.error(`   ❌ Failed to add ${newClause.clause_number}:`, insertError.message);
                errorCount++;
            } else {
                console.log(`   ✅ Added ${newClause.clause_number}: ${newClause.clause_title}`);
                newCount++;
            }
        }
    }
    
    // 6. Summary
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`✅ Updated existing clauses: ${updatedCount}`);
    console.log(`🆕 Added new clauses: ${newCount}`);
    if (errorCount > 0) {
        console.log(`❌ Errors: ${errorCount}`);
    }
    console.log('\n🎉 Import complete!');
}

// Run the import
importParticularConditions().catch(console.error);
