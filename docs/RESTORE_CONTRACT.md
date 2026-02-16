Restore a previously deleted contract into the database

Overview
- This script allows re-importing a contract that was deleted from the database by using the same RPC the app uses to save contracts (save_contract_v2).
- It reads a JSON file that represents a SavedContract, and inserts it back into Supabase.

Prerequisites
- Supabase URL and anon key available as environment variables:
  - VITE_SUPABASE_URL or SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
- A backup JSON file following the SavedContract structure (see types.ts) is available locally.

Usage
- Prepare a backup file, for example, backups/contract-<name>.json containing a SavedContract object.
- Run:
  node scripts/restore_contract.js backups/contract-<name>.json

Notes
- This operation requires authentication/permissions on the Supabase project.
- If the contract had subcollections, the restoration will re-create sections/items due to the RPC path using atomic RPC v2.
