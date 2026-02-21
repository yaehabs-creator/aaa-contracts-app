
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Config
const CONTRACT_ID = '495d491a-e009-43a2-af19-3cd518fcaa6b';
const USER_ID = '27fd592d-4427-4785-abff-3a29e10625bc';
const FILE_PATH = 'Atrium Full Contract_docling.json';
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

async function importLargeJson() {
    console.log(`Starting LARGE import for ${FILE_PATH}...`);

    if (!fs.existsSync(FILE_PATH)) {
        console.error(`File not found: ${FILE_PATH}`);
        return;
    }

    const stats = fs.statSync(FILE_PATH);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    console.log(`File size: ${fileSizeMB} MB`);

    const fileStream = fs.createReadStream(FILE_PATH);
    const fileName = path.basename(FILE_PATH);
    const storagePath = `json-sources/${USER_ID}/${CONTRACT_ID}/${Date.now()}_${fileName}`;

    // 1. Upload to Storage
    console.log('Uploading large file to storage (this may take a minute)...');
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileStream, {
            contentType: 'application/json',
            upsert: true,
            duplex: 'half'
        });

    if (uploadError) {
        console.error('Storage error:', uploadError);
        return;
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);

    // 2. Head-only summary for large file
    const summary = `Large Docling-processed JSON (${fileSizeMB} MB). Contains structured document layout, text, and tables. Use for deep contextual analysis.`;

    // 3. Insert Database Record
    console.log('Saving metadata to database...');
    const { data: record, error: dbError } = await supabase
        .from('json_data_sources')
        .insert({
            contract_id: CONTRACT_ID,
            user_id: USER_ID,
            name: 'Atrium Contract (Docling Deep Scan)',
            description: 'Full structured JSON from Docling (Large)',
            source_type: 'json',
            storage_path: uploadData.path,
            public_url: publicUrl,
            parsed_content: null, // DO NOT inline large files (prevents DB crash)
            content_summary: summary,
            row_count: null,
            key_fields: ['document', 'pages', 'tables', 'metadata'],
            size_bytes: stats.size,
            is_active: true
        })
        .select()
        .single();

    if (dbError) {
        console.error('Database error:', dbError);
        return;
    }

    console.log('✅ Successfully imported Large JSON Data Source!');
    console.log('ID:', record.id);
}

importLargeJson().catch(console.error);
