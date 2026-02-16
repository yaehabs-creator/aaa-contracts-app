#!/usr/bin/env node
/*
  Restore a previously deleted contract into Supabase.
  Usage:
    node scripts/restore_contract.js /path/to/contract.json
  The contract.json should match the SavedContract interface used by the app
  (see src/types.ts). It will be inserted using the same RPC used by the app
  (save_contract_v2). Ensure environment variables for Supabase are available:
    - VITE_SUPABASE_URL or SUPABASE_URL
    - VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
*/

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONTRACT_JSON = process.argv[2]
if (!CONTRACT_JSON) {
  console.error('Usage: node scripts/restore_contract.js /path/to/contract.json')
  process.exit(2)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or legacy env vars).')
  process.exit(3)
}

const contractData = JSON.parse(readFileSync(CONTRACT_JSON, 'utf8'))

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  // Basic validation
  if (!contractData || typeof contractData !== 'object') {
    console.error('Invalid contract JSON');
    process.exit(4)
  }

  try {
    // Use the same RPC as the app's save path
    const { data, error } = await supabase.rpc('save_contract_v2', {
      p_contract_data: contractData,
      p_expected_version: contractData.version ?? 1
    })
    if (error) {
      console.error('Restore failed:', error)
      process.exit(1)
    }
    console.log('Contract restored. Server response:', data)
    process.exit(0)
  } catch (err) {
    console.error('Unexpected error during restore:', err)
    process.exit(5)
  }
}

main()
