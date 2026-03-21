
import { db } from './dbService';
import { calculateFileHash } from '../utils/fileHasher';
import { 
    SavedContract, 
    IngestionSection, 
    IngestionClause,
    IngestionProgress 
} from '../types';

/**
 * Verified Ingestion Service (LOCAL MODE)
 * Manages the lifecycle of contract ingestion using local IndexedDB.
 */

/**
 * 1. Initialize Root Contract Record
 */
export async function createRootContract(name: string, projectId: string, category: string): Promise<SavedContract> {
    const expectedSections = ["AGREEMENT", "PARTICULAR_CONDITIONS", "GENERAL_CONDITIONS"];

    const contract = {
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
    };

    return await db.contracts.insert(contract);
}

/**
 * 2. Upload a Section Chunk
 */
export async function uploadContractSection(
    contractId: string, 
    sectionKey: string, 
    file: File
): Promise<IngestionSection> {
    if (file.type !== 'application/pdf') {
        throw new Error("Invalid file type. Only PDFs are allowed for contract sections.");
    }

    const fileHash = await calculateFileHash(file);
    
    // Duplicate Detection
    const existing = await db.sections.getByContract(contractId);
    if (existing.some(s => s.file_hash === fileHash)) {
        throw new Error(`This specific file has already been uploaded for this contract.`);
    }

    // Local Storage Mock (In a real app, we might use File System Access API or just keep the Blob in IndexedDB)
    // For this prototype, we'll store the metadata and assume the file is "uploaded" locally.
    const section = {
        contract_id: contractId,
        section_key: sectionKey,
        file_name: file.name,
        file_url: `local://contracts/${contractId}/${file.name}`,
        file_hash: fileHash,
        file_size: file.size,
        status: 'uploaded'
    };

    return await db.sections.insert(section);
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

    await db.clauses.batchInsert(payload);
    
    // Update section status
    await db.sections.update(sectionId, { status: 'completed' });

    // Sync to root progress
    const contract = await db.contracts.get(contractId);
    if (!contract) return false;

    const newProgress: IngestionProgress = contract.ingestion_progress 
        ? { ...contract.ingestion_progress } 
        : { expected_sections: [], completed_sections: [] };

    if (!newProgress.completed_sections.includes(sectionKey)) {
        newProgress.completed_sections.push(sectionKey);
    }

    await db.contracts.update(contractId, { ingestion_progress: newProgress });

    return true;
}

/**
 * 4. Verify and Finalize Contract
 */
export async function verifyAndActivateContract(contractId: string) {
    const contract = await db.contracts.get(contractId);
    if (!contract) throw new Error("Contract not found");

    const { expected_sections = [], completed_sections = [] } = contract.ingestion_progress || {};
    const missing = expected_sections.filter((s: string) => !completed_sections.includes(s));

    if (missing.length > 0) {
        throw new Error(`Incomplete contract. Missing: ${missing.join(', ')}`);
    }

    const count = await db.clauses.countByContract(contractId);
    if (count === 0) {
        throw new Error("Verification Failure: No extracted clauses found.");
    }

    await db.contracts.update(contractId, { status: 'ready' });

    return {
        success: true,
        clauseCount: count
    };
}
