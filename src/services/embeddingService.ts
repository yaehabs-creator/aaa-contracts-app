
import { SupabaseClient } from '@supabase/supabase-js';

// Open AI model for embeddings
const EMBEDDING_MODEL = 'text-embedding-3-small';

export class EmbeddingService {
    private apiKey: string | null = null;

    constructor() {
        // Try to get API key from environment
        this.apiKey = import.meta.env.VITE_OPENAI_API_KEY ||
            process.env.OPENAI_API_KEY ||
            import.meta.env.OPENAI_API_KEY || null;

        if (!this.apiKey) {
            console.warn('OpenAI API key not found. Embeddings generation will not work.');
        } else {
            console.log('OpenAI API key found (length: ' + this.apiKey.length + ')');
        }
    }

    /**
     * input can be a string or an array of strings
     */
    async generateEmbeddings(input: string | string[]): Promise<number[][]> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to your .env file.');
        }

        try {
            // OpenAI API endpoint
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: EMBEDDING_MODEL,
                    input: input
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            // Sort by index to ensure order is preserved (though OpenAI usually preserves it)
            return data.data
                .sort((a: any, b: any) => a.index - b.index)
                .map((item: any) => item.embedding);

        } catch (error) {
            console.error('Failed to generate embeddings:', error);
            throw error;
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

let embeddingServiceInstance: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
    if (!embeddingServiceInstance) {
        embeddingServiceInstance = new EmbeddingService();
    }
    return embeddingServiceInstance;
}
