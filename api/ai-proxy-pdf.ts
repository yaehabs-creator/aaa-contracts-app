import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Vercel Serverless Function: Native PDF Analysis with Claude
 *
 * Receives a public Supabase Storage URL, fetches the PDF server-side,
 * and sends it to Claude's Native PDF API.
 *
 * This avoids the HTTP 413 payload limit from sending large base64 PDFs.
 */

interface PDFAnalysisRequest {
    pdf_url: string;          // Public URL to the PDF in Supabase Storage
    document_name?: string;
    prompt: string;
    model?: string;
    cache_key?: string;
    force_refresh?: boolean;
}

const CLAUDE_MODELS = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-latest',
    'claude-3-7-sonnet-20250219',
];

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { pdf_url, document_name, prompt, model, cache_key, force_refresh } = req.body as PDFAnalysisRequest;

    if (!pdf_url || !prompt) {
        return res.status(400).json({ error: 'Missing required fields: pdf_url, prompt' });
    }

    try {
        // 1. Claude API key (required)
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
        if (!anthropicApiKey) {
            throw new Error('ANTHROPIC_API_KEY not configured on server');
        }

        // 2. Optional Supabase cache
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const cacheEnabled = !!(supabaseUrl && supabaseServiceKey);
        const supabaseClient = cacheEnabled ? createClient(supabaseUrl!, supabaseServiceKey!) : null;

        // 3. Compute cache hash
        const cacheHash = crypto
            .createHash('sha256')
            .update(cache_key || pdf_url)
            .update(prompt)
            .digest('hex');

        // 4. Check cache
        if (cacheEnabled && supabaseClient && !force_refresh) {
            try {
                const { data: cached } = await (supabaseClient as any)
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

        // 5. Fetch PDF from Supabase Storage URL
        console.log(`Fetching PDF from: ${pdf_url}`);
        const pdfResponse = await fetch(pdf_url);

        if (!pdfResponse.ok) {
            return res.status(400).json({
                error: `Failed to fetch PDF from storage URL (${pdfResponse.status}). Make sure the bucket is public.`
            });
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();
        const base64PDF = Buffer.from(pdfBuffer).toString('base64');
        console.log(`PDF fetched: ${Math.round(pdfBuffer.byteLength / 1024)}KB, ${base64PDF.length} base64 chars`);

        // 6. Call Claude Native PDF API
        const selectedModel = model || CLAUDE_MODELS[0];

        const claudeResponse = await fetchWithRetry(
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
                    messages: [{
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
                    }],
                }),
            }
        );

        if (!claudeResponse.ok) {
            const errorData = await claudeResponse.json().catch(() => ({}));
            throw { status: claudeResponse.status, message: errorData.error?.message || `Claude API error ${claudeResponse.status}` };
        }

        const claudeResult = await claudeResponse.json();
        const textBlock = claudeResult.content?.find((c: any) => c.type === 'text');
        const analysis = textBlock?.text || '';

        // 7. Store in cache (non-fatal)
        if (cacheEnabled && supabaseClient) {
            try {
                await (supabaseClient as any)
                    .from('pdf_analysis_cache')
                    .upsert({
                        document_id: cacheHash,
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
