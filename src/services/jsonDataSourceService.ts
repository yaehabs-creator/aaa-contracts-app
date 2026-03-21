
/**
 * JSON Data Source Service (Local Mock)
 * Supabase has been removed. Use local Knowledge Hub for data management.
 */

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

export async function uploadJsonDataSource(..._args: any[]): Promise<JsonDataSource> {
    throw new Error('Supabase disabled. Use "Digest New" in the Knowledge Hub.');
}

export async function getJsonDataSources(..._args: any[]): Promise<JsonDataSource[]> {
    return [];
}

export async function getJsonSourceContent(..._args: any[]): Promise<any> {
    return null;
}

export async function deleteJsonDataSource(..._args: any[]): Promise<void> {
    return;
}

export async function buildJsonContext(..._args: any[]): Promise<string> {
    return '';
}
