/**
 * JSON Data Source Service
 *
 * Handles uploading, parsing, and retrieving JSON data sources.
 * These are persistent, contract-linked JSON files users can chat with
 * across multiple sessions via the AI Bot.
 */

import { supabase } from '../supabase/config';

export interface JsonDataSource {
    id: string;
    contract_id: string | null;
    user_id: string;
    name: string;
    description?: string;
    source_type: 'json' | 'csv_as_json' | 'excel_as_json';
    storage_path: string;
    public_url?: string;
    parsed_content?: any;
    content_summary?: string;
    row_count?: number;
    key_fields?: string[];
    size_bytes?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

const STORAGE_BUCKET = 'contract-documents';
const MAX_INLINE_BYTES = 512 * 1024; // 512 KB — larger goes URL-only

// ============================================================
// UPLOAD
// ============================================================

/**
 * Upload a JSON file to Supabase Storage and persist metadata + parsed content.
 */
export async function uploadJsonDataSource(
    file: File,
    contractId: string | null,
    label?: string,
    description?: string
): Promise<JsonDataSource> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    // 1. Parse the JSON client-side
    const rawText = await file.text();
    let parsedContent: any;

    try {
        parsedContent = JSON.parse(rawText);
    } catch {
        throw new Error(`Invalid JSON: ${file.name} could not be parsed`);
    }

    // 2. Build content summary (top-level keys + value snippets)
    const summary = buildContentSummary(parsedContent);
    const keyFields = getTopLevelKeys(parsedContent);
    const rowCount = Array.isArray(parsedContent) ? parsedContent.length : undefined;

    // 3. Upload to storage — upload as text/plain to avoid MIME type restrictions
    //    on the contract-documents bucket (which blocks application/json).
    const storagePath = `json-sources/${session.user.id}/${contractId || 'global'}/${Date.now()}_${file.name}`;
    const uploadBlob = new Blob([rawText], { type: 'text/plain' });
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, uploadBlob, { cacheControl: '3600', upsert: true, contentType: 'text/plain' });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(uploadData.path);

    // 4. Only inline content if small enough (avoid bloating the DB)
    const inlineContent = file.size <= MAX_INLINE_BYTES ? parsedContent : null;

    // 5. Insert record
    const record = {
        contract_id: contractId,
        user_id: session.user.id,
        name: label || file.name.replace(/\.[^.]+$/, ''),
        description: description || null,
        source_type: 'json' as const,
        storage_path: uploadData.path,
        public_url: publicUrl,
        parsed_content: inlineContent,
        content_summary: summary,
        row_count: rowCount ?? null,
        key_fields: keyFields,
        size_bytes: file.size,
        is_active: true,
    };

    const { data, error } = await (supabase as any)
        .from('json_data_sources')
        .insert(record)
        .select()
        .single();

    if (error) throw new Error(`Failed to save metadata: ${error.message}`);
    return data as JsonDataSource;
}

// ============================================================
// FETCH
// ============================================================

/**
 * Get all active JSON data sources for a contract (and global ones for the user).
 */
export async function getJsonDataSources(contractId: string | null): Promise<JsonDataSource[]> {
    if (!supabase) return [];

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    const { data, error } = await (supabase as any)
        .from('json_data_sources')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Could not fetch JSON data sources:', error);
        return [];
    }

    return (data || []).filter((d: JsonDataSource) =>
        !d.contract_id || d.contract_id === contractId
    );
}

/**
 * Fetch the full parsed content for a data source.
 * If too large to be inline, downloads from storage.
 */
export async function getJsonSourceContent(source: JsonDataSource): Promise<any> {
    // If content was inlined at upload time, return immediately
    if (source.parsed_content) return source.parsed_content;

    // Otherwise fetch from storage
    if (!source.public_url) throw new Error('No URL available for this data source');

    const response = await fetch(source.public_url);
    if (!response.ok) throw new Error(`Failed to fetch JSON: ${response.status}`);
    return response.json();
}

/**
 * Delete (soft-delete) a data source.
 */
export async function deleteJsonDataSource(id: string): Promise<void> {
    if (!supabase) return;
    await (supabase as any)
        .from('json_data_sources')
        .update({ is_active: false })
        .eq('id', id);
}

// ============================================================
// CONTEXT INJECTION
// ============================================================

/**
 * Build a context string from selected JSON data sources for AI injection.
 * Keeps content within the token budget.
 */
export async function buildJsonContext(
    sources: JsonDataSource[],
    maxChars = 60_000
): Promise<string> {
    if (sources.length === 0) return '';

    const parts: string[] = ['\n=== ATTACHED JSON DATA SOURCES ===\n'];
    let used = parts[0].length;

    for (const source of sources) {
        try {
            const content = await getJsonSourceContent(source);
            const header = `\n--- [${source.name}] ---\n`;

            // For large arrays, summarize intelligently
            let body: string;
            if (Array.isArray(content) && content.length > 20) {
                const sample = content.slice(0, 20);
                body = `(${content.length} rows total. Showing first 20):\n${JSON.stringify(sample, null, 2)}\n`;
            } else {
                body = JSON.stringify(content, null, 2) + '\n';
            }

            const block = header + body;
            if (used + block.length <= maxChars) {
                parts.push(block);
                used += block.length;
            } else {
                // Add truncated summary
                parts.push(`${header}${source.content_summary || '[content too large to include]'}\n`);
                used += header.length + 100;
            }
        } catch (err) {
            console.warn(`Failed to load content for ${source.name}:`, err);
        }
    }

    return parts.join('');
}

// ============================================================
// HELPERS
// ============================================================

function buildContentSummary(data: any): string {
    try {
        if (Array.isArray(data)) {
            const keys = data.length > 0 ? Object.keys(data[0]).join(', ') : '';
            return `Array of ${data.length} items. Fields: ${keys}`;
        }
        if (typeof data === 'object' && data !== null) {
            const keys = Object.keys(data).slice(0, 15).join(', ');
            return `Object with keys: ${keys}`;
        }
        return String(data).slice(0, 200);
    } catch {
        return 'JSON data (summary unavailable)';
    }
}

function getTopLevelKeys(data: any): string[] {
    try {
        if (Array.isArray(data) && data.length > 0) return Object.keys(data[0]).slice(0, 20);
        if (typeof data === 'object' && data !== null) return Object.keys(data).slice(0, 20);
        return [];
    } catch {
        return [];
    }
}
