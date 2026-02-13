import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST use service role for migrations

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables (Service Role Key required)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration(filePath) {
    console.log(`Applying migration: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Supabase JS client doesn't have a direct 'query' method for raw SQL
    // unless we use an RPC or a specialized extension.
    // However, we can use the REST API to execute SQL if we have the service role key and a 'sql' RPC,
    // OR we can just use the 'postgres' library directly if we had the connection string.

    // Since we are an agent, we can also suggest the user to run it in Supabase SQL Editor.
    // But let's try to use the 'exec_sql' RPC if it exists (common pattern in this project).

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(e => ({ error: e }));

    if (error) {
        if (error.message?.includes('exec_sql')) {
            console.error('Error: "exec_sql" RPC not found. Please run the SQL in the Supabase SQL Editor manually.');
            console.log('\n--- SQL TO RUN ---\n');
            console.log(sql);
            console.log('\n------------------\n');
        } else {
            console.error('Migration failed:', error);
        }
        process.exit(1);
    }

    console.log('Migration applied successfully!');
}

const migrationFile = process.argv[2];
if (!migrationFile) {
    console.error('Please provide a migration file path');
    process.exit(1);
}

applyMigration(migrationFile);
