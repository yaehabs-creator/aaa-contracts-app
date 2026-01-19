# Supabase Migration Guide

This document outlines the migration from Firebase (Firestore + Auth) to Supabase (PostgreSQL + Auth).

## Migration Status

✅ **Completed**: All code has been migrated to use Supabase instead of Firebase.

## What Changed

### Database
- **Before**: Firebase Firestore (NoSQL document database)
- **After**: Supabase PostgreSQL (Relational database with JSONB support)

### Authentication
- **Before**: Firebase Authentication
- **After**: Supabase Authentication

### Data Structure
- Contracts are stored in PostgreSQL tables
- Large contracts (>1MB) use relational tables (`contract_sections`, `contract_items`)
- Small contracts are stored as JSONB in the `contracts` table

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install `@supabase/supabase-js` which was added to `package.json`.

### 2. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql` - Creates all tables
   - `supabase/migrations/002_rls_policies.sql` - Sets up Row Level Security

### 3. Configure Environment Variables

Create or update `.env.local` with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from: Supabase Dashboard → Settings → API

### 4. Migrate Existing Data (Optional)

If you have existing Firestore data to migrate:

1. **Export from Firestore**:
   ```bash
   # Set Firebase Admin SDK credentials
   export GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
   export FIREBASE_PROJECT_ID=your-project-id
   
   # Run export script
   node scripts/export-firestore-data.js
   ```

2. **Import to Supabase**:
   ```bash
   # Set Supabase credentials
   export SUPABASE_URL=your_supabase_project_url
   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Run import script
   node scripts/import-to-supabase.js
   ```

**Note**: Service role key should NEVER be exposed in frontend code. Only use in backend scripts.

## Key Files Changed

### New Files Created
- `src/supabase/config.ts` - Supabase client initialization
- `src/services/supabaseService.ts` - Supabase database operations
- `supabase/migrations/001_initial_schema.sql` - Database schema
- `supabase/migrations/002_rls_policies.sql` - Security policies
- `scripts/export-firestore-data.js` - Data export script
- `scripts/import-to-supabase.js` - Data import script
- `ENV_EXAMPLE.md` - Environment variables documentation

### Files Modified
- `src/contexts/AuthContext.tsx` - Migrated to Supabase Auth
- `src/components/LoginPage.tsx` - Updated error handling for Supabase
- `src/services/userService.ts` - Migrated to Supabase queries
- `services/dbService.ts` - Updated to use Supabase service
- `App.tsx` - Updated imports
- `package.json` - Added @supabase/supabase-js dependency
- `index.tsx` - Updated error boundary for Supabase errors

### Files Kept (Legacy)
- `src/firebase/config.ts` - Kept for reference (can be removed after migration verified)
- `src/services/firestoreService.ts` - Kept for reference (can be removed after migration verified)
- `firestore.rules` - No longer needed (replaced by RLS policies)

## Database Schema

### Tables

1. **users** - User profiles with roles
2. **contracts** - Contract metadata and small contracts (JSONB)
3. **contract_sections** - Sections for large contracts
4. **contract_items** - Items within sections for large contracts
5. **activity_logs** - Audit trail (optional)

## Important Notes

### User Creation Limitation

The `createUser` function in `userService.ts` uses `supabase.auth.signUp()` which requires email confirmation. For production, user creation should be done via a backend API with Supabase Admin API access.

### Authentication Flow

- Supabase Auth handles session management automatically
- User profiles are stored in the `users` table
- RLS policies enforce access control based on user roles

### Large Contracts

Contracts larger than 1MB are automatically split into relational tables:
- Main contract → `contracts` table (metadata only)
- Sections → `contract_sections` table
- Items → `contract_items` table

This avoids PostgreSQL row size limits.

## Testing Checklist

After migration, test:

- [ ] User login/logout
- [ ] User profile loading
- [ ] Create new contract
- [ ] Load existing contracts
- [ ] Update contract
- [ ] Delete contract
- [ ] Create user (admin)
- [ ] Update user role
- [ ] Delete user
- [ ] Large contract handling (>1MB)
- [ ] Contract with subcollections

## Rollback Plan

If you need to rollback to Firebase:

1. Keep Firebase project active
2. Revert code changes (git)
3. Update environment variables back to Firebase
4. Redeploy

## Support

For issues:
1. Check browser console for errors
2. Verify Supabase credentials in `.env.local`
3. Check Supabase dashboard for database errors
4. Verify RLS policies are correctly set up
