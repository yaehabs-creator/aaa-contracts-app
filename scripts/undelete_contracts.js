#!/usr/bin/env node
/**
 * Undelete all contracts currently marked as is_deleted = true.
 * This is a local, manual recovery helper. It reconnects to your Supabase
 * project using environment-provided keys.
 *
 * Prerequisites:
 * - Supabase URL and anon key available in env vars:
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or legacy SUPABASE_URL/SUPABASE_ANON_KEY).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function main() {
  try {
    // Fetch all deleted contracts
    const { data: deleted, error: fetchError } = await supabase
      .from('contracts')
      .select('id')
      .eq('is_deleted', true)

    if (fetchError) {
      console.error('Error fetching deleted contracts:', fetchError)
      process.exit(2)
    }

    if (!deleted || deleted.length === 0) {
      console.log('No deleted contracts found.')
      process.exit(0)
    }

    console.log(`Found ${deleted.length} deleted contract(s). Restoring...`)

    for (const row of deleted) {
      const id = row.id
      const { error: updError } = await supabase
        .from('contracts')
        .update({ is_deleted: false })
        .eq('id', id)
      if (updError) {
        console.error(`Failed to undelete contract ${id}:`, updError)
      } else {
        console.log(`Undeleted contract ${id}`)
      }
    }
  } catch (err) {
    console.error('Unexpected error during undelete:', err)
    process.exit(3)
  }
}

main()
