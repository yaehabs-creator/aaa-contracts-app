
/**
 * AI Knowledge Service — Supabase Cloud
 * Knowledge items are now stored in Supabase `knowledge_items` table.
 */

import { supabase } from '@/lib/supabase';

export interface AIKnowledgeFile {
    id: string;
    name: string;
    description: string | null;
    original_filename: string;
    file_path: string;
    raw_file_path?: string;
    file_type?: 'pdf' | 'json' | 'text';
    file_size: number;
    content: any;
    created_at: string;
    updated_at: string;
}

export const uploadJsonFile = async (_file: File, _name: string, _description?: string): Promise<AIKnowledgeFile> => {
    throw new Error('Use "Digest New" in the Knowledge Hub instead.');
};

export const uploadPdfToKnowledge = async (_file: File, _name: string, _ocrText: string, _description?: string): Promise<AIKnowledgeFile> => {
    throw new Error('Use "Digest New" in the Knowledge Hub instead.');
};

export const getAllKnowledgeFiles = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('knowledge_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Failed to get knowledge files:', error);
        return [];
    }
};

/**
 * Fetches all digested knowledge from Supabase to include in AI context
 */
export const fetchKnowledgeContext = async (): Promise<string> => {
    try {
        const files = await getAllKnowledgeFiles();
        if (files.length === 0) return '';

        let context = '\n=== AI KNOWLEDGE HUB: DIGESTED DATA ===\n';
        
        // LIMIT: Take top 5 items to be safe with context windows
        const topFiles = files.slice(0, 5);

        for (const file of topFiles) {
            try {
                context += `\n[Source: ${file.name}]\n`;
                
                const content = file.data;
                if (content) {
                    if (typeof content === 'string') {
                        context += content.slice(0, 5000) + '\n';
                    } else if (content.text) {
                        context += content.text.slice(0, 5000) + '\n';
                    } else {
                        context += JSON.stringify(content).slice(0, 5000) + '\n';
                    }
                }
                context += '---\n';
            } catch (e) {
                console.warn(`Failed to process knowledge item ${file.id}`);
            }
        }
        
        return context;
    } catch (error) {
        console.error('fetchKnowledgeContext error:', error);
        return '';
    }
};

export const deleteKnowledgeFile = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('knowledge_items')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Failed to delete knowledge file:', error);
        throw error;
    }
};
