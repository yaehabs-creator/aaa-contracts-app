import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Vercel Serverless Function: Native PDF Analysis with Cache
 * 
 * Flow:
 * 1. Check if document analysis is in cache for this prompt.
 * 2. If MISS:
 *    a. Fetch PDF from Supabase Storage.
 *    b. Send to Claude Native PDF API.
 *    c. Store result in cache.
 * 3. Return analysis.
 */

interface PDFAnalysisRequest {
    document_id: string;
    prompt: string;
    model?: string;
    force_refresh?: boolean;
}

const CLAUDE_MODELS = [
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-latest'
];

export default async function handler(req: any, res: any) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).json({ ok: true });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { document_id, prompt, model, force_refresh } = req.body as PDFAnalysisRequest;

    if (!document_id || !prompt) {
        return res.status(400).json({ error: 'Missing required fields: document_id, prompt' });
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Supabase configuration missing on server');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Generate prompt hash
        const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');

        // 2. Check Cache
        if (!force_refresh) {
            const { data: cacheEntry, error: cacheError } = await supabase
                .from('pdf_analysis_cache')
                .select('*')
                .eq('document_id', document_id)
                .eq('prompt_hash', promptHash)
                .maybeSingle();

            if (cacheEntry && (!cacheEntry.expires_at || new Date(cacheEntry.expires_at) > new Date())) {
                return res.status(200).json({
                    cached: true,
                    analysis: cacheEntry.analysis_json,
                    document_id,
                    model_used: cacheEntry.model_used
                });
            }
        }

        // 3. Cache MISS - Get Document Info
        const { data: document, error: docError } = await supabase
            .from('contract_documents')
            .select('file_path, name')
            .eq('id', document_id)
            .single();

        if (docError || !document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // 4. Download PDF from Storage
        const { data: pdfData, error: storageError } = await supabase.storage
            .from('contract-docs')
            .download(document.file_path);

        if (storageError || !pdfData) {
            console.error('Storage Error:', storageError);
            return res.status(500).json({ error: 'Failed to download PDF from storage' });
        }

        // 5. Convert to Base64
        const base64PDF = Buffer.from(await pdfData.arrayBuffer()).toString('base64');

        // 6. Call Claude Native PDF API
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
        if (!anthropicApiKey) {
            throw new Error('ANTHROPIC_API_KEY not configured on server');
        }

        const selectedModel = model || CLAUDE_MODELS[0];

        const response = await fetchWithRetry(
            'https://api.anthropic.com/v1/messages',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicApiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    max_tokens: 4096,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'document',
                                    source: {
                                        type: 'base64',
                                        media_type: 'application/pdf',
                                        data: base64PDF,
                                    },
                                },
                                {
                                    type: 'text',
                                    text: prompt,
                                },
                            ],
                        },
                    ],
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw { status: response.status, message: errorData.error?.message || `Claude API error ${response.status}` };
        }

        const claudeResult = await response.json();
        const textBlock = claudeResult.content.find((c: any) => c.type === 'text');
        const analysis = textBlock?.text || '';

        // 7. Store in Cache
        const { error: saveError } = await supabase
            .from('pdf_analysis_cache')
            .upsert({
                document_id,
                prompt_hash: promptHash,
                prompt_text: prompt,
                analysis_json: { response: analysis }, // Storing as object for flexibility
                model_used: selectedModel
            }, { onConflict: 'document_id, prompt_hash' });

        if (saveError) {
            console.warn('Failed to save to cache:', saveError);
        }

        return res.status(200).json({
            cached: false,
            analysis: { response: analysis },
            document_id,
            document_name: document.name,
            model_used: selectedModel
        });

    } catch (error: any) {
        console.error('PDF Analysis Proxy Error:', error);
        return res.status(error.status || 500).json({
            error: error.message || 'Internal server error',
        });
    }
}

/**
 * Fetch with exponential backoff retry for rate limits
 */
async function fetchWithRetry(url: string, options: any, maxAttempts = 3): Promise<Response> {
    let attempt = 0;
    let backoffMs = 1000;

    while (attempt < maxAttempts) {
        const response = await fetch(url, options);

        if (response.status === 429 || response.status === 529) {
            const retryAfter = response.headers.get('retry-after');
            const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : backoffMs;

            console.warn(`Rate limited (attempt ${attempt + 1}/${maxAttempts}). Retrying in ${waitMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));

            attempt++;
            backoffMs = Math.min(backoffMs * 2, 8000);
            continue;
        }

        return response;
    }

    throw { status: 429, message: 'Rate limited after max retries' };
}
