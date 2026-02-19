import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Vercel Serverless Function: Native PDF Analysis with Claude
 *
 * Accepts a PDF as base64 directly from the client.
 * No Supabase Storage lookup required — works out of the box.
 *
 * Flow:
 * 1. Check cache (by hash of pdf_base64 + prompt).
 * 2. If MISS: send PDF + prompt to Claude Native PDF API.
 * 3. Store result in Supabase cache.
 * 4. Return analysis.
 */

interface PDFAnalysisRequest {
    pdf_base64: string;       // Base64-encoded PDF data
    document_name?: string;   // Original filename for reference
    prompt: string;
    model?: string;
    cache_key?: string;        // Optional override for cache key
    force_refresh?: boolean;
}

const CLAUDE_MODELS = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-latest',
    'claude-3-7-sonnet-20250219',
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

    const { pdf_base64, document_name, prompt, model, cache_key, force_refresh } = req.body as PDFAnalysisRequest;

    if (!pdf_base64 || !prompt) {
        return res.status(400).json({ error: 'Missing required fields: pdf_base64, prompt' });
    }

    try {
        // 1. Check for Claude API key (required)
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
        if (!anthropicApiKey) {
            throw new Error('ANTHROPIC_API_KEY not configured on server');
        }

        // 2. Optional: try to use Supabase cache (gracefully skip if not configured)
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const cacheEnabled = !!(supabaseUrl && supabaseServiceKey);

        let supabase: ReturnType<typeof createClient> | null = null;
        if (cacheEnabled) {
            supabase = createClient(supabaseUrl!, supabaseServiceKey!);
        }

        // 3. Compute cache key
        const cacheHash = crypto
            .createHash('sha256')
            .update(cache_key || pdf_base64.slice(0, 2048)) // Hash first 2KB of PDF + prompt for perf
            .update(prompt)
            .digest('hex');

        // 4. Check cache
        if (cacheEnabled && supabase && !force_refresh) {
            try {
                const { data: cached } = await (supabase as any)
                    .from('pdf_analysis_cache')
                    .select('*')
                    .eq('prompt_hash', cacheHash)
                    .maybeSingle();

                if (cached && (!cached.expires_at || new Date(cached.expires_at) > new Date())) {
                    return res.status(200).json({
                        cached: true,
                        analysis: cached.analysis_json,
                        document_name: document_name || 'Document',
                        model_used: cached.model_used,
                    });
                }
            } catch (cacheErr) {
                console.warn('Cache lookup failed (non-fatal):', cacheErr);
            }
        }

        // 5. Call Claude Native PDF API
        const selectedModel = model || CLAUDE_MODELS[0];

        const response = await fetchWithRetry(
            'https://api.anthropic.com/v1/messages',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicApiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-beta': 'pdfs-2024-09-25',
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
                                        data: pdf_base64,
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
        const textBlock = claudeResult.content?.find((c: any) => c.type === 'text');
        const analysis = textBlock?.text || '';

        // 6. Store in cache (non-fatal if it fails)
        if (cacheEnabled && supabase) {
            try {
                await (supabase as any)
                    .from('pdf_analysis_cache')
                    .upsert({
                        document_id: cacheHash, // Use hash as a synthetic document_id if no real one
                        prompt_hash: cacheHash,
                        prompt_text: prompt,
                        analysis_json: { response: analysis },
                        model_used: selectedModel,
                    }, { onConflict: 'document_id,prompt_hash' });
            } catch (saveErr) {
                console.warn('Failed to save to cache (non-fatal):', saveErr);
            }
        }

        return res.status(200).json({
            cached: false,
            analysis: { response: analysis },
            document_name: document_name || 'Document',
            model_used: selectedModel,
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
