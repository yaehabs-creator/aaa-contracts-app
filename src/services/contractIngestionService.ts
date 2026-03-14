import { supabase } from '../supabase/config';
import { calculateFileHash } from '../utils/fileHasher';
import { 
    SavedContract, 
    IngestionSection, 
    IngestionClause,
    IngestionProgress 
} from '../types';

/**
 * Verified Ingestion Service
 * Manages the lifecycle of contract ingestion from Draft to Ready.
 */

// Storage Bucket for raw chunks
const STORAGE_BUCKET = 'contract-docs';

/**
 * 1. Initialize Root Contract Record
 */
export async function createRootContract(name: string, projectId: string, category: string): Promise<SavedContract> {
    const expectedSections = ["AGREEMENT", "PARTICULAR_CONDITIONS", "GENERAL_CONDITIONS"];

    const { data, error } = await supabase
        .from('contracts')
        .insert([{
            name,
            title: name,
            project_id: projectId,
            status: 'draft',
            timestamp: Date.now(),
            metadata: {
                totalClauses: 0,
                generalCount: 0,
                particularCount: 0,
                highRiskCount: 0,
                conflictCount: 0
              },
            ingestion_progress: {
                expected_sections: expectedSections,
                completed_sections: [],
                errors: []
            }
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * 2. Upload a Section Chunk
 */
export async function uploadContractSection(
    contractId: string, 
    sectionKey: string, 
    file: File
): Promise<IngestionSection> {
    // Basic Validation
    if (file.type !== 'application/pdf') {
        throw new Error("Invalid file type. Only PDFs are allowed for contract sections.");
    }

    // Hash Calculation
    const fileHash = await calculateFileHash(file);
    
    // Duplicate Detection (within contract)
    const { data: existing } = await supabase
        .from('ingestion_sections')
        .select('id')
        .eq('contract_id', contractId)
        .eq('file_hash', fileHash)
        .maybeSingle();

    if (existing) {
        throw new Error(`This specific file has already been uploaded for this contract.`);
    }

    // Physical Upload
    const fileName = `${sectionKey}_${Date.now()}.pdf`;
    const filePath = `contracts/${contractId}/chunks/${fileName}`;
    const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file);

    if (storageError) throw storageError;

    // Database Record
    const { data: section, error: sectionError } = await supabase
        .from('ingestion_sections')
        .insert([{
            contract_id: contractId,
            section_key: sectionKey,
            file_name: file.name,
            file_url: filePath,
            file_hash: fileHash,
            file_size: file.size,
            status: 'uploaded'
        }])
        .select()
        .single();

    if (sectionError) throw sectionError;
    return section;
}

/**
 * 3. Store Verbatim Clauses (Batch)
 */
export async function storeIngestionClauses(
    contractId: string,
    sectionId: string,
    sectionKey: string,
    clauses: Array<{ 
        clause_number: string; 
        title: string; 
        content: string; 
        page_start: number; 
        page_end: number 
    }>
) {
    const payload = clauses.map(c => ({
        contract_id: contractId,
        section_id: sectionId,
        section_key: sectionKey,
        clause_number: c.clause_number,
        title: c.title,
        content: c.content,
        page_start: c.page_start,
        page_end: c.page_end
    }));

    const { error } = await supabase
        .from('ingestion_clauses')
        .insert(payload);

    if (error) throw error;
    
    // Update section status
    await supabase
        .from('ingestion_sections')
        .update({ status: 'completed' })
        .eq('id', sectionId);

    // Sync to root progress
    const { data: contract } = await supabase
        .from('contracts')
        .select('ingestion_progress')
        .eq('id', contractId)
        .single();

    const newProgress: IngestionProgress = { ...contract.ingestion_progress };
    if (!newProgress.completed_sections.includes(sectionKey)) {
        newProgress.completed_sections.push(sectionKey);
    }

    await supabase
        .from('contracts')
        .update({ ingestion_progress: newProgress })
        .eq('id', contractId);

    return true;
}

/**
 * 4. Verify and Finalize Contract
 */
export async function verifyAndActivateContract(contractId: string) {
    const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('ingestion_progress')
        .eq('id', contractId)
        .single();
    
    if (contractError || !contract) throw new Error("Contract not found");

    const { expected_sections, completed_sections } = contract.ingestion_progress;
    const missing = expected_sections.filter((s: string) => !completed_sections.includes(s));

    if (missing.length > 0) {
        throw new Error(`Incomplete contract. Missing: ${missing.join(', ')}`);
    }

    // Integrity Check: Do we actually have clauses?
    const { count, error: countError } = await supabase
        .from('ingestion_clauses')
        .select('id', { count: 'exact', head: true })
        .eq('contract_id', contractId);

    if (countError || (count || 0) === 0) {
        throw new Error("Verification Failure: No extracted clauses found.");
    }

    // Finalize
    const { error: activateError } = await supabase
        .from('contracts')
        .update({ status: 'ready' })
        .eq('id', contractId);

    if (activateError) throw activateError;

    return {
        success: true,
        clauseCount: count
    };
}
