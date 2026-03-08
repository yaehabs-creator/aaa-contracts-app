import { supabase } from '../supabase/config';
import { cleanNullBytes } from '@/utils/jsonUtils';

export interface AIKnowledgeFile {
    id: string;
    name: string;
    description: string | null;
    original_filename: string;
    file_path: string; // The .json content path
    raw_file_path?: string; // The original .pdf or .json file path
    file_type?: 'pdf' | 'json' | 'text';
    file_size: number;
    content: any;
    created_at: string;
    updated_at: string;
}

const STORAGE_BUCKET = 'contract-documents';
const STORAGE_PREFIX = 'ai-knowledge';

/**
 * Structured Contract Data format
 */
export interface StructuredContract {
    title: string;
    sections: Array<{
        id: string;
        title: string;
        intro?: string;
        clauses: Array<{
            id: string;
            title: string;
            content: string;
        }>;
    }>;
    metadata: Record<string, any>;
}

/**
 * Parses raw text into a structured contract format.
 */
export const parseContractText = (text: string): StructuredContract => {
    const lines = text.split('\n');
    const contract: StructuredContract = {
        title: "",
        sections: [],
        metadata: {}
    };

    let currentSection: any = null;
    let currentClause: any = null;

    // Regex for Section headings: "1. DEFINITIONS" or "2A. SUPERVISION..."
    const sectionRegex = /^(\d+[A-Z]?)\.\s+([A-Z\s,']+)$/;
    // Regex for Clause headings: "1.1 Definitions" or "2A.1 Supervision..."
    const clauseRegex = /^(\d+[A-Z]?\.\d+)\s+([A-Z][a-z].*)$/;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Skip TOC-like lines
        if (/\d+$/.test(trimmed) && trimmed.length < 50 && !trimmed.includes('.')) return;

        const sectionMatch = trimmed.match(sectionRegex);
        const clauseMatch = trimmed.match(clauseRegex);

        if (sectionMatch) {
            currentSection = {
                id: sectionMatch[1],
                title: sectionMatch[2].trim(),
                clauses: []
            };
            contract.sections.push(currentSection);
            currentClause = null;
        } else if (clauseMatch && currentSection) {
            currentClause = {
                id: clauseMatch[1],
                title: clauseMatch[2].trim(),
                content: ""
            };
            currentSection.clauses.push(currentClause);
        } else if (currentClause) {
            currentClause.content += trimmed + " ";
        } else if (currentSection) {
            currentSection.intro = (currentSection.intro || "") + trimmed + " ";
        } else {
            if (!contract.title && trimmed.length > 10 && trimmed.toUpperCase() === trimmed) {
                contract.title = trimmed;
            }
        }
    });

    return contract;
};

/**
 * Upload a JSON file to Supabase Storage and persist metadata + content in DB.
 */
export const uploadJsonFile = async (
    file: File,
    name: string,
    description?: string
): Promise<AIKnowledgeFile> => {
    if (!supabase) throw new Error('Supabase not initialized');

    // 1. Validate file is valid JSON
    let parsedContent: any;
    try {
        const text = await file.text();
        parsedContent = cleanNullBytes(JSON.parse(text));
    } catch (e) {
        throw new Error('Invalid JSON file format');
    }

    return saveKnowledgeFileToDB(name, file.name, file.size, parsedContent, description);
};

/**
 * Handle PDF upload: Save original PDF, Run OCR, Parse into Structured JSON, and Save.
 */
export const uploadPdfToKnowledge = async (
    file: File,
    name: string,
    ocrText: string,
    description?: string,
    existingPdfPath?: string
): Promise<AIKnowledgeFile> => {
    if (!supabase) throw new Error('Supabase not initialized');

    let pdfPath = existingPdfPath;

    // 1. If we don't have an existing path, upload the physical PDF first
    if (!pdfPath && file.type === 'application/pdf') {
        const timestamp = Date.now();
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        pdfPath = `${STORAGE_PREFIX}/raw/${timestamp}_${sanitizedFilename}`;

        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(pdfPath, file, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) {
            console.warn('Failed to upload raw PDF, continuing with JSON only:', uploadError);
            pdfPath = undefined;
        }
    }

    // 2. Parse the OCR text into our structured format
    const structuredData = parseContractText(ocrText);

    // 3. Save as JSON record but link to the raw PDF
    return saveKnowledgeFileToDB(
        name,
        file.name,
        file.size,
        structuredData,
        description,
        pdfPath,
        'pdf'
    );
};

/**
 * Internal helper to save metadata + content to DB and Storage.
 */
const saveKnowledgeFileToDB = async (
    name: string,
    originalFilename: string,
    fileSize: number,
    content: any,
    description?: string,
    rawFilePath?: string,
    fileType: 'pdf' | 'json' | 'text' = 'json'
): Promise<AIKnowledgeFile> => {
    if (!supabase) throw new Error('Supabase not initialized');

    const timestamp = Date.now();
    const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${STORAGE_PREFIX}/${timestamp}_${sanitizedFilename}.json`;

    // 1. Upload the structured JSON content to Storage
    const jsonBlob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, jsonBlob, {
            contentType: 'application/json',
            upsert: true
        });

    if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 2. Insert into DB
    const { data: dbData, error: dbError } = await (supabase as any)
        .from('ai_knowledge_files')
        .insert({
            name,
            description: description || null,
            original_filename: originalFilename,
            file_path: storagePath,
            raw_file_path: rawFilePath || null,
            file_type: fileType,
            file_size: fileSize,
            content: content
        })
        .select()
        .single();

    if (dbError) {
        console.error('Database insert error:', dbError);
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        throw new Error(`Database insert failed: ${dbError.message}`);
    }

    return dbData as AIKnowledgeFile;
};

/**
 * Get all available knowledge files (metadata only).
 */
export const getAllKnowledgeFiles = async (): Promise<AIKnowledgeFile[]> => {
    if (!supabase) return [];

    const { data, error } = await (supabase as any)
        .from('ai_knowledge_files')
        .select('id, name, description, original_filename, file_path, raw_file_path, file_type, file_size, created_at, updated_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching knowledge files:', error);
        return [];
    }

    return data as AIKnowledgeFile[];
};

/**
 * Fetch all knowledge file contents and format as a single context string for the AI.
 */
export const fetchKnowledgeContext = async (): Promise<string> => {
    if (!supabase) return '';

    const { data, error } = await (supabase as any)
        .from('ai_knowledge_files')
        .select('name, original_filename, content');

    if (error || !data || data.length === 0) {
        return '';
    }

    let context = '\n=== AI KNOWLEDGE BASE ===\n';

    data.forEach((file: any) => {
        context += `[File: ${file.name || file.original_filename}]\n`;
        context += JSON.stringify(file.content, null, 2);
        context += '\n\n';
    });

    context += '=== END KNOWLEDGE BASE ===\n';

    return context;
};

/**
 * Delete a knowledge file from both storage and database.
 */
export const deleteKnowledgeFile = async (id: string, filePath: string, rawFilePath?: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not initialized');

    // Remove from Storage
    const pathsToRemove = [filePath];
    if (rawFilePath) pathsToRemove.push(rawFilePath);

    const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(pathsToRemove);

    if (storageError) {
        console.warn('Storage removal error (might already be gone):', storageError);
    }

    // Remove from DB
    const { error: dbError } = await (supabase as any)
        .from('ai_knowledge_files')
        .delete()
        .eq('id', id);

    if (dbError) {
        throw new Error(`Database removal failed: ${dbError.message}`);
    }
};
