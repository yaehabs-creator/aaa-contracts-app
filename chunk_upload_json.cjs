
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Config
const CONTRACT_ID = '495d491a-e009-43a2-af19-3cd518fcaa6b';
const USER_ID = '27fd592d-4427-4785-abff-3a29e10625bc';
const FILE_PATH = 'Atrium Full Contract_docling.json';
const BUCKET = 'contract-documents';
const BATCH_SIZE = 10;

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

async function chunkAndUpload() {
    console.log(`Reading ${FILE_PATH}...`);
    const rawData = fs.readFileSync(FILE_PATH);
    const dataArray = JSON.parse(rawData);

    console.log(`Total items: ${dataArray.length}. Creating batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
        const batch = dataArray.slice(i, i + BATCH_SIZE);
        const batchData = JSON.stringify(batch);
        const batchName = `Atrium Docling Part ${batchIndex}`;
        const fileName = `atrium_docling_part_${batchIndex}.json`;
        const storagePath = `json-sources/${USER_ID}/${CONTRACT_ID}/parts/${Date.now()}_${fileName}`;

        console.log(`Uploading ${batchName} (${(batchData.length / 1024 / 1024).toFixed(1)} MB)...`);

        // 1. Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, batchData, {
                contentType: 'application/json',
                upsert: true
            });

        if (uploadError) {
            console.error(`Error uploading part ${batchIndex}:`, uploadError);
            continue;
        }

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);

        // 2. Database
        const summary = `Docling processed contract data (Part ${batchIndex}). Covers items ${i + 1} to ${Math.min(i + BATCH_SIZE, dataArray.length)}.`;

        const { data: record, error: dbError } = await supabase
            .from('json_data_sources')
            .insert({
                contract_id: CONTRACT_ID,
                user_id: USER_ID,
                name: batchName,
                description: `Chunked upload from docling deep scan`,
                source_type: 'json',
                storage_path: uploadData.path,
                public_url: publicUrl,
                parsed_content: batchData.length < 500000 ? batch : null,
                content_summary: summary,
                row_count: batch.length,
                key_fields: ['page_data', 'tables', 'texts'],
                size_bytes: batchData.length,
                is_active: true
            })
            .select()
            .single();

        if (dbError) {
            console.error(`Error saving metadata for part ${batchIndex}:`, dbError);
        } else {
            console.log(`✅ Part ${batchIndex} registered successfully. ID: ${record.id}`);
        }
    }

    console.log('🏁 All chunks uploaded!');
}

chunkAndUpload().catch(console.error);
