
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Config
const CONTRACT_ID = '495d491a-e009-43a2-af19-3cd518fcaa6b';
const USER_ID = '27fd592d-4427-4785-abff-3a29e10625bc';
const FILE_PATH = 'Atrium Full Contract.json';
const BUCKET = 'contract-documents';

// Read env
const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.startsWith(`${key}=`)) return line.split('=')[1].trim();
    }
    return null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function importJson() {
    console.log(`Starting import for ${FILE_PATH}...`);

    if (!fs.existsSync(FILE_PATH)) {
        console.error(`File not found: ${FILE_PATH}`);
        return;
    }

    const fileBuffer = fs.readFileSync(FILE_PATH);
    const fileName = path.basename(FILE_PATH);
    const storagePath = `json-sources/${USER_ID}/${CONTRACT_ID}/${Date.now()}_${fileName}`;

    // 1. Upload to Storage
    console.log('Uploading to storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, {
            contentType: 'application/json',
            upsert: true
        });

    if (uploadError) {
        console.error('Storage error:', uploadError);
        return;
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);

    // 2. Parse and build summary (Simulate service logic)
    const json = JSON.parse(fileBuffer.toString());
    const rowCount = Array.isArray(json) ? json.length : null;
    const keyFields = Array.isArray(json) && json.length > 0 ? Object.keys(json[0]) : Object.keys(json);
    const summary = Array.isArray(json)
        ? `Array of ${json.length} items. Fields: ${keyFields.slice(0, 10).join(', ')}`
        : `Object with keys: ${keyFields.slice(0, 15).join(', ')}`;

    // 3. Insert Database Record
    console.log('Saving metadata to database...');
    const { data: record, error: dbError } = await supabase
        .from('json_data_sources')
        .insert({
            contract_id: CONTRACT_ID,
            user_id: USER_ID,
            name: 'Atrium Full Contract Data',
            description: 'Imported via AI Agent from project root',
            source_type: 'json',
            storage_path: uploadData.path,
            public_url: publicUrl,
            parsed_content: fileBuffer.length < 500000 ? json : null, // Only inline if < 500KB
            content_summary: summary,
            row_count: rowCount,
            key_fields: keyFields.slice(0, 50),
            size_bytes: fileBuffer.length,
            is_active: true
        })
        .select()
        .single();

    if (dbError) {
        console.error('Database error:', dbError);
        return;
    }

    console.log('✅ Successfully imported JSON Data Source!');
    console.log('ID:', record.id);
}

importJson().catch(console.error);
