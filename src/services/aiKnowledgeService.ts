import { supabase } from '../supabase/config';

export interface AIKnowledgeFile {
    id: string;
    name: string;
    description: string | null;
    original_filename: string;
    file_path: string;
    file_size: number;
    content: any;
    created_at: string;
    updated_at: string;
}

const STORAGE_BUCKET = 'contract-documents';
const STORAGE_PREFIX = 'ai-knowledge';

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
        parsedContent = JSON.parse(text);
    } catch (e) {
        throw new Error('Invalid JSON file format');
    }

    // 2. Upload raw file to Supabase Storage
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${STORAGE_PREFIX}/${timestamp}_${sanitizedFilename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
            contentType: 'application/json',
            upsert: true
        });

    if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 3. Insert metadata and parsed content into DB
    const { data: dbData, error: dbError } = await (supabase as any)
        .from('ai_knowledge_files')
        .insert({
            name,
            description: description || null,
            original_filename: file.name,
            file_path: storagePath,
            file_size: file.size,
            content: parsedContent
        })
        .select()
        .single();

    if (dbError) {
        console.error('Database insert error:', dbError);
        // Attempt to clean up the stored file if DB insertion fails
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
        .select('id, name, description, original_filename, file_path, file_size, created_at, updated_at')
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
export const deleteKnowledgeFile = async (id: string, filePath: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not initialized');

    // Remove from Storage
    const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

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
