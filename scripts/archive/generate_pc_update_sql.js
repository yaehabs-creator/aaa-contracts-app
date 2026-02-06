/**
 * Generate SQL to update Atrium GC clauses with Particular Conditions
 * Matches PC to GC by clause_number and updates the particular_condition field
 */

import fs from 'fs';

const ATRIUM_CONTRACT_ID = 'cfb1883c-bf70-410d-afe2-8273467ea099';

// Read the PC text file
const pcText = fs.readFileSync('./atrium Pc.txt', 'utf-8');

/**
 * Parse Particular Conditions text and extract clauses
 */
function parseParticularConditions(text) {
    const clauses = new Map();
    
    // Define the known clause sections in the PC document
    const knownSections = [
        { pattern: /^1\.1\s+Definitions:/m, number: '1.1', title: 'Definitions' },
        { pattern: /^1\.6\s+Notices,\s*Consents/m, number: '1.6', title: 'Notices, Consents, Approvals and Agreements' },
        { pattern: /^1\.7\s+Communications/m, number: '1.7', title: 'Communications' },
        { pattern: /^4\.\s+CONTRACT\s+DOCUMENTS/m, number: '4', title: 'Contract Documents' },
        { pattern: /^5\.1\s+Submission/m, number: '5.1', title: 'Submission and Approval' },
        { pattern: /^5\.7\s+As-built/m, number: '5.7', title: 'As-built Drawings' },
        { pattern: /^6\.\s+OBLIGATIONS/m, number: '6', title: 'Obligations of the Contractor' },
        { pattern: /^6\.1\s+General\s+Obligations/m, number: '6.1', title: 'General Obligations' },
        { pattern: /^6\.8\s+Quality/m, number: '6.8', title: 'Quality Assurance' },
        { pattern: /^6A\s+FREE\s+ISSUE/m, number: '6A', title: 'Free Issue Items' },
        { pattern: /^6A\.1/m, number: '6A.1', title: 'Free Issue Items Definition' },
        { pattern: /^6A\.2\s+Collection/m, number: '6A.2', title: 'Collection and Taking Delivery' },
        { pattern: /^6A\.5\s+Notification/m, number: '6A.5', title: 'Notification of Damage' },
        { pattern: /^6A\.6\s+Surplus/m, number: '6A.6', title: 'Surplus Items' },
        { pattern: /^6A\.8\s+Contractor/m, number: '6A.8', title: 'Contractor\'s Confirmation Procedures' },
        { pattern: /^6B\s+EARLY/m, number: '6B', title: 'Early Procured Materials' },
        { pattern: /^7\.\s+BONDS/m, number: '7', title: 'Bonds' },
        { pattern: /^7\.1\s+Provision/m, number: '7.1', title: 'Provision of Bonds' },
        { pattern: /^9\.\s+THE\s+SITE/m, number: '9', title: 'The Site' },
        { pattern: /^9\.1\s+Information/m, number: '9.1', title: 'Information and Inspection' },
        { pattern: /^9\.1A\s+Unforeseeable/m, number: '9.1A', title: 'Unforeseeable Physical Conditions' },
        { pattern: /^9\.4\s+Opportunities/m, number: '9.4', title: 'Opportunities for Other Contractors' },
        { pattern: /^9\.6\s+Notices,\s+Permits/m, number: '9.6', title: 'Notices, Permits, and Fees' },
        { pattern: /^9\.13\s+Fossils/m, number: '9.13', title: 'Fossils' },
        { pattern: /^9\.18\s+Mobilization/m, number: '9.18', title: 'Mobilization' },
        { pattern: /^9\.19\s+Independent/m, number: '9.19', title: 'Independent Site Survey' },
        { pattern: /^10\.1\s+Contractor.*Representative/m, number: '10.1', title: 'Contractor\'s Representative' },
        { pattern: /^10\.3\s+Employees/m, number: '10.3', title: 'Employees' },
        { pattern: /^11\.\s+PLANT/m, number: '11', title: 'Plant, Workmanship' },
        { pattern: /^11\.1\s+General/m, number: '11.1', title: 'General' },
        { pattern: /^11\.2\s+Inspection/m, number: '11.2', title: 'Inspection and Testing' },
        { pattern: /^11\.3\s+Covering/m, number: '11.3', title: 'Covering and Uncovering' },
        { pattern: /^11\.4\s+Cost/m, number: '11.4', title: 'Cost of Testing' },
        { pattern: /^12\.\s+TITLE/m, number: '12', title: 'Title, Risk, Care' },
        { pattern: /^12\.5\s+Risk/m, number: '12.5', title: 'Risk and Care' },
        { pattern: /^12\.6\s+General\s+Indemnity/m, number: '12.6', title: 'General Indemnity' },
        { pattern: /^12\.9\s+Insurance/m, number: '12.9', title: 'Insurance' },
        { pattern: /^12\.10\s+Inherent/m, number: '12.10', title: 'Inherent Defects' },
        { pattern: /^17\.\s+COMMENCEMENT/m, number: '17', title: 'Commencement and Progress' },
        { pattern: /^17\.1\s+Commencement/m, number: '17.1', title: 'Commencement' },
        { pattern: /^17\.3\s+Programme/m, number: '17.3', title: 'Programme' },
        { pattern: /^17\.6\s+Progress/m, number: '17.6', title: 'Progress Reports' },
        { pattern: /^17\.7\s+Rate/m, number: '17.7', title: 'Rate of Progress' },
        { pattern: /^17\.8\s+Site\s+Working/m, number: '17.8', title: 'Site Working Hours' },
        { pattern: /^18\.\s+SUSPENSION/m, number: '18', title: 'Suspension of Works' },
        { pattern: /^18\.1\s+Suspension/m, number: '18.1', title: 'Suspension Order' },
        { pattern: /^19\.\s+TIME/m, number: '19', title: 'Time for Completion' },
        { pattern: /^19\.1\s+Time/m, number: '19.1', title: 'Time for Completion' },
        { pattern: /^19\.2\s+Extension/m, number: '19.2', title: 'Extension of Time' },
        { pattern: /^19\.3\s+Liquidated/m, number: '19.3', title: 'Liquidated Damages' },
        { pattern: /^20\.\s+TAKING/m, number: '20', title: 'Taking Over' },
        { pattern: /^20\.1\s+Taking/m, number: '20.1', title: 'Taking-Over Certificate' },
        { pattern: /^20\.2\s+Use/m, number: '20.2', title: 'Use Before Taking Over' },
        { pattern: /^20\.4\s+Draft/m, number: '20.4', title: 'Draft Final Account' },
        { pattern: /^21\.\s+DEFECTS/m, number: '21', title: 'Defects' },
        { pattern: /^21\.1\s+Completion/m, number: '21.1', title: 'Completion of Outstanding Work' },
        { pattern: /^21\.2\s+Defects\s+after/m, number: '21.2', title: 'Defects after Taking Over' },
        { pattern: /^21\.3\s+Cost/m, number: '21.3', title: 'Cost of Remedying Defects' },
        { pattern: /^21\.4\s+Further/m, number: '21.4', title: 'Further Tests on Completion' },
        { pattern: /^21\.5\s+Access/m, number: '21.5', title: 'Access after Taking Over' },
        { pattern: /^21\.6\s+Delay/m, number: '21.6', title: 'Delay in Remedying Defects' },
        { pattern: /^21\.7\s+Contractor\s+to\s+Search/m, number: '21.7', title: 'Contractor to Search' },
        { pattern: /^22\.\s+VARIATION/m, number: '22', title: 'Variation' },
        { pattern: /^22\.2\s+Effect/m, number: '22.2', title: 'Effect on Programme' },
        { pattern: /^22\.3\s+Valuation/m, number: '22.3', title: 'Valuation of Variation Orders' },
        { pattern: /^22\.5\s+Value/m, number: '22.5', title: 'Value Engineering' },
        { pattern: /^22A\.\s+PROVISIONAL/m, number: '22A', title: 'Provisional Sum' },
        { pattern: /^22A\.3\s+Nomination/m, number: '22A.3', title: 'Nomination' },
        { pattern: /^23\.\s+CLAIMS/m, number: '23', title: 'Claims' },
        { pattern: /^23\.1\s+Notice/m, number: '23.1', title: 'Notice of Claims' },
        { pattern: /^23\.7\s+Determination/m, number: '23.7', title: 'Determination of Claims' },
        { pattern: /^23\.8\s+Exclusion/m, number: '23.8', title: 'Exclusion of Small Claims' },
        { pattern: /^25\.\s+MEASUR/m, number: '25', title: 'Measurements' },
        { pattern: /^25\.1\s+Quantities/m, number: '25.1', title: 'Quantities' },
        { pattern: /^25\.2\s+Works/m, number: '25.2', title: 'Works to be Measured' },
        { pattern: /^25\.3\s+Method/m, number: '25.3', title: 'Method of Measurement' },
        { pattern: /^25\.4\s+Valuation/m, number: '25.4', title: 'Valuation' },
        { pattern: /^26\.\s+INTERIM/m, number: '26', title: 'Interim and Final Certificates' },
        { pattern: /^26\.1\s+Application/m, number: '26.1', title: 'Application of Interim Certificates' },
        { pattern: /^26\.2\s+Issue/m, number: '26.2', title: 'Issue of Interim Certificates' },
        { pattern: /^26\.3\s+Payment/m, number: '26.3', title: 'Payment' },
        { pattern: /^26\.4\s+Issue\s+of\s+Final/m, number: '26.4', title: 'Issue of Final Certificates' },
        { pattern: /^27\.\s+ADVANCE/m, number: '27', title: 'Advance Payment' },
        { pattern: /^27\.1\s+Advance/m, number: '27.1', title: 'Advance Payment' },
        { pattern: /^28\.\s+REMEDIES/m, number: '28', title: 'Remedies' },
        { pattern: /^29\.\s+FORCE/m, number: '29', title: 'Force Majeure' },
        { pattern: /^30\.\s+DEFAULT/m, number: '30', title: 'Default' },
        { pattern: /^30\.2\s+Definition/m, number: '30.2', title: 'Definition of Default' },
        { pattern: /^30\.5\s+Payment/m, number: '30.5', title: 'Payment on Termination' },
        { pattern: /^31\.\s+EMPLOYER.*DEFAULT/m, number: '31', title: 'Employer\'s Default' },
        { pattern: /^32\.\s+NOTICES/m, number: '32', title: 'Notices' },
        { pattern: /^32\.1\s+Notices/m, number: '32.1', title: 'Notices' },
    ];
    
    // Find all matches and their positions
    const matches = [];
    for (const section of knownSections) {
        const match = text.match(section.pattern);
        if (match) {
            matches.push({
                number: section.number,
                title: section.title,
                position: match.index
            });
        }
    }
    
    // Sort by position
    matches.sort((a, b) => a.position - b.position);
    
    // Extract content between sections
    for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const nextPos = i < matches.length - 1 ? matches[i + 1].position : text.length;
        
        let content = text.substring(current.position, nextPos).trim();
        
        // Remove the header line
        const lines = content.split('\n');
        content = lines.slice(1).join('\n').trim();
        
        if (content.length > 0) {
            clauses.set(current.number, {
                clause_number: current.number,
                clause_title: current.title,
                particular_condition: content
            });
        }
    }
    
    return clauses;
}

// Parse the PC text
const parsedClauses = parseParticularConditions(pcText);

console.log(`Parsed ${parsedClauses.size} PC clauses:\n`);
for (const [num, clause] of parsedClauses) {
    console.log(`  ${num}: ${clause.clause_title} (${clause.particular_condition.length} chars)`);
}

// Generate SQL updates
let sql = `-- Update Atrium GC clauses with Particular Conditions
-- Contract ID: ${ATRIUM_CONTRACT_ID}
-- Generated: ${new Date().toISOString()}
-- Total PC clauses to match: ${parsedClauses.size}

`;

let updateCount = 0;
for (const [clauseNum, pcData] of parsedClauses) {
    // Escape single quotes for SQL
    const pcContent = pcData.particular_condition.replace(/'/g, "''");
    
    sql += `-- Update clause ${clauseNum}: ${pcData.clause_title}
UPDATE contract_items 
SET item_data = item_data || jsonb_build_object(
    'particular_condition', '${pcContent}',
    'condition_type', CASE WHEN item_data->>'general_condition' != '' THEN 'Both' ELSE 'Particular' END
)
WHERE contract_id = '${ATRIUM_CONTRACT_ID}'
  AND item_data->>'clause_number' = '${clauseNum}';

`;
    updateCount++;
}

sql += `-- Verification
SELECT item_data->>'clause_number' as num, 
       item_data->>'clause_title' as title,
       LENGTH(item_data->>'particular_condition') as pc_length,
       item_data->>'condition_type' as type
FROM contract_items 
WHERE contract_id = '${ATRIUM_CONTRACT_ID}'
  AND LENGTH(item_data->>'particular_condition') > 0
ORDER BY item_data->>'clause_number';
`;

// Write SQL file
fs.writeFileSync('./scripts/update_atrium_pc.sql', sql);
console.log(`\n✅ Generated SQL file: scripts/update_atrium_pc.sql`);
console.log(`   Total UPDATE statements: ${updateCount}`);
console.log(`\nRun this SQL in Supabase SQL Editor to add PC content to matching GC clauses.`);
