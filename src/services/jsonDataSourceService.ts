/**
 * JSON Data Source Service
 *
 * Handles uploading, parsing, and retrieving JSON data sources.
 * These are persistent, contract-linked JSON files users can chat with
 * across multiple sessions via the AI Bot.
 */

import { supabase } from '../supabase/config';
import { cleanNullBytes } from '@/utils/jsonUtils';

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

const STORAGE_BUCKET = 'contract-docs';
const MAX_INLINE_BYTES = 512 * 1024;    // 512 KB — smaller files get inlined into DB
export const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2 MB — files above this skip client-side JSON.parse()

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
    description?: string,
    onProgress?: (phase: string, pct: number) => void,
): Promise<JsonDataSource> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const isLargeFile = file.size > LARGE_FILE_THRESHOLD;

    let parsedContent: any = null;
    let summary = '';
    let keyFields: string[] = [];
    let rowCount: number | undefined;

    if (isLargeFile) {
        // ── LARGE FILE PATH ──────────────────────────────────────────
        // Skip JSON.parse() in the browser entirely.
        // We only read the first ~4KB to build a lightweight summary.
        onProgress?.('Reading file header…', 5);
        const headerChunk = file.slice(0, 4096);
        const headerText = await headerChunk.text();
        summary = `Large JSON file (${(file.size / 1024 / 1024).toFixed(1)} MB). Content available via storage URL.`;
        // Try to detect if it's an array from the first character
        const firstChar = headerText.trimStart()[0];
        if (firstChar === '[') {
            summary = `Large JSON array (${(file.size / 1024 / 1024).toFixed(1)} MB). Content available via storage URL.`;
        } else if (firstChar === '{') {
            summary = `Large JSON object (${(file.size / 1024 / 1024).toFixed(1)} MB). Content available via storage URL.`;
        }
        // No inline content for large files
        parsedContent = null;
    } else {
        // ── SMALL FILE PATH ──────────────────────────────────────────
        // Parse the full JSON client-side (file is small enough)
        onProgress?.('Parsing JSON…', 10);
        const rawText = await file.text();
        try {
            parsedContent = cleanNullBytes(JSON.parse(rawText));
        } catch {
            throw new Error(`Invalid JSON: ${file.name} could not be parsed`);
        }
        summary = buildContentSummary(parsedContent);
        keyFields = getTopLevelKeys(parsedContent);
        rowCount = Array.isArray(parsedContent) ? parsedContent.length : undefined;
    }

    // Upload raw file bytes directly to storage (no re-encoding for large files)
    onProgress?.('Uploading to cloud…', 30);
    const storagePath = `json-sources/${session.user.id}/${contractId || 'global'}/${Date.now()}_${file.name}`;

    // Use the raw File blob directly — this is the key optimisation.
    // For small files we used to re-create a Blob from text; now we skip that.
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'text/plain',
            // @ts-ignore - Some versions of supabase-js support this but types may lag
            onUploadProgress: (progress: { loaded: number; total: number }) => {
                const total = progress.total || file.size;
                const pct = Math.round((progress.loaded / total) * 70) + 15; // 15% to 85%
                onProgress?.('Uploading to cloud…', pct);
            }
        });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    onProgress?.('Saving metadata…', 90);
    const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(uploadData.path);

    // Only inline parsed content if it's small enough to avoid DB bloat
    const inlineContent = !isLargeFile && file.size <= MAX_INLINE_BYTES ? parsedContent : null;

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
    onProgress?.('Done', 100);
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
