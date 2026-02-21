/**
 * Vercel Serverless Function: JSON Data Chat
 *
 * Accepts a user question + array of JSON data source IDs.
 * Fetches each source's content from Supabase Storage,
 * injects it as context, and calls Claude.
 */

import { createClient } from '@supabase/supabase-js';

interface JsonChatRequest {
    question: string;
    source_ids: string[];   // IDs from json_data_sources table
    contract_id?: string;
    system_instruction?: string;
    model?: string;
}

const DEFAULT_SYSTEM = `You are a data analyst assistant. The user has attached JSON data sources that you can query and reason about.

When answering:
- Reference specific values from the data
- Present numbers and lists clearly
- If data is tabular (array of objects), treat rows as records and columns as fields
- If asked to calculate, sum, count, or aggregate — do so from the data provided
- Always indicate which data source the information comes from
- If the data doesn't contain the answer, say so clearly`;

const CLAUDE_MODELS = ['claude-sonnet-4-5', 'claude-opus-4-5', 'claude-haiku-4-5'];
const MAX_CONTEXT_CHARS = 80_000;

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { question, source_ids, system_instruction, model } = req.body as JsonChatRequest;

    if (!question || !source_ids?.length) {
        return res.status(400).json({ error: 'Missing required fields: question, source_ids' });
    }

    try {
        const anthropicApiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
        if (!anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not configured');

        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error('Supabase not configured');

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Fetch requested data sources
        const { data: sources, error: fetchError } = await (supabase as any)
            .from('json_data_sources')
            .select('id, name, description, parsed_content, public_url, content_summary, row_count, key_fields')
            .in('id', source_ids)
            .eq('is_active', true);

        if (fetchError) throw new Error(`Failed to fetch data sources: ${fetchError.message}`);
        if (!sources || sources.length === 0) {
            return res.status(404).json({ error: 'No data sources found for the provided IDs' });
        }

        // 2. Build context from sources
        const contextParts: string[] = ['\n=== ATTACHED JSON DATA SOURCES ===\n'];
        let usedChars = contextParts[0].length;

        for (const source of sources) {
            const header = `\n--- [${source.name}]${source.description ? ` — ${source.description}` : ''} ---\n`;
            let body = '';

            // SECURITY: Check file size if it's from storage
            const fileSize = source.size_bytes || 0;
            const isTooLargeForFullParse = fileSize > 5 * 1024 * 1024; // 5MB limit for serverless JSON.parse

            // Try inline content first
            if (source.parsed_content) {
                const content = source.parsed_content;
                if (Array.isArray(content) && content.length > 30) {
                    body = `(${content.length} total rows. Displaying first 30):\n${JSON.stringify(content.slice(0, 30), null, 2)}\n`;
                } else {
                    body = JSON.stringify(content, null, 2) + '\n';
                }
            } else if (source.public_url) {
                if (isTooLargeForFullParse) {
                    body = `[CAUTION: This file is very large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Full scan skipped to prevent memory timeout.]\n`;
                    body += `Summary: ${source.content_summary || 'unavailable'}\n`;
                    body += `Recommendation: This document is too large for a single chat query. Please ask about specific sections or use the main Contract Archive for deep analysis.\n`;
                } else {
                    // Fetch from storage (Safe for < 5MB)
                    try {
                        const storageRes = await fetch(source.public_url);
                        if (storageRes.ok) {
                            const fetched = await storageRes.json();
                            if (Array.isArray(fetched) && fetched.length > 30) {
                                body = `(${fetched.length} total rows. Displaying first 30):\n${JSON.stringify(fetched.slice(0, 30), null, 2)}\n`;
                            } else {
                                body = JSON.stringify(fetched, null, 2) + '\n';
                            }
                        }
                    } catch {
                        body = `[Could not fetch content — Summary: ${source.content_summary || 'unavailable'}]\n`;
                    }
                }
            } else {
                body = `Summary: ${source.content_summary || 'No content available'}\n`;
                if (source.key_fields?.length) body += `Fields: ${source.key_fields.join(', ')}\n`;
            }

            const block = header + body;
            if (usedChars + block.length <= MAX_CONTEXT_CHARS) {
                contextParts.push(block);
                usedChars += block.length;
            } else {
                contextParts.push(`${header}[Content truncated — too large. Summary: ${source.content_summary}]\n`);
            }
        }

        const dataContext = contextParts.join('');

        // 3. Call Claude
        const systemPrompt = (system_instruction || DEFAULT_SYSTEM) + '\n\n' + dataContext;
        const selectedModel = model || CLAUDE_MODELS[0];

        const claudeRes = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': anthropicApiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: selectedModel,
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{ role: 'user', content: question }],
            }),
        });

        if (!claudeRes.ok) {
            const err = await claudeRes.json().catch(() => ({}));
            throw { status: claudeRes.status, message: err.error?.message || `Claude error ${claudeRes.status}` };
        }

        const claudeData = await claudeRes.json();
        const answer = claudeData.content?.find((c: any) => c.type === 'text')?.text || '';

        return res.status(200).json({
            answer,
            sources_used: sources.map((s: any) => ({ id: s.id, name: s.name })),
            model_used: selectedModel,
        });

    } catch (error: any) {
        console.error('JSON Chat Error:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
    }
}

async function fetchWithRetry(url: string, options: any, maxAttempts = 3): Promise<Response> {
    let attempt = 0;
    let backoffMs = 1000;
    while (attempt < maxAttempts) {
        const response = await fetch(url, options);
        if (response.status === 429 || response.status === 529) {
            const waitMs = parseInt(response.headers.get('retry-after') || '0') * 1000 || backoffMs;
            await new Promise(r => setTimeout(r, waitMs));
            attempt++;
            backoffMs = Math.min(backoffMs * 2, 8000);
            continue;
        }
        return response;
    }
    throw { status: 429, message: 'Rate limited after max retries' };
}
