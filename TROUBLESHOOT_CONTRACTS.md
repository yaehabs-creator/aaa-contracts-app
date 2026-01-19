# 🔍 Troubleshooting: Can't Find Contracts

## Quick Diagnostic Steps

### Step 1: Verify Contracts Exist in Database

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Table Editor** → **contracts**
4. Check if there are any rows in the table
5. If empty: Contracts haven't been saved yet
6. If rows exist: Note the count

### Step 2: Check Authentication

1. In your app, open browser DevTools (F12) → Console
2. Look for these messages:
   - "✅ Supabase initialized successfully"
   - "Authenticated user: [user-id]"
3. If you don't see these, authentication might be the issue

### Step 3: Check RLS Policies

1. Go to Supabase Dashboard → **Authentication** → **Policies**
2. Find the **contracts** table
3. Verify these policies exist:
   - "Authenticated users can read contracts" (SELECT)
   - "Authenticated users can create contracts" (INSERT)
   - "Authenticated users can update contracts" (UPDATE)
4. If missing: Run migration `002_rls_policies.sql` and `003_fix_contract_policies.sql`

### Step 4: Check Browser Console for Errors

Open DevTools (F12) → Console and look for:
- "Error fetching contracts"
- "Permission denied"
- "row-level security"
- Any red error messages

### Step 5: Verify User Profile Exists

1. Supabase Dashboard → **Table Editor** → **users**
2. Find your user (by email or UUID)
3. Verify the row exists and has correct `role` field
4. If missing: Create user profile (see below)

---

## Common Issues & Fixes

### Issue 1: No Contracts in Database

**Symptom**: Table Editor shows 0 rows in `contracts` table

**Fix**: 
- Create a new contract in the app
- Try saving it
- Check if it appears in the database

### Issue 2: RLS Policies Not Applied

**Symptom**: Console shows "permission denied" or "row-level security" errors

**Fix**:
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/002_rls_policies.sql`
3. Run `supabase/migrations/003_fix_contract_policies.sql`
4. Refresh your app

### Issue 3: User Not Authenticated

**Symptom**: Console shows "You are not authenticated" or no user session

**Fix**:
1. Log out and log back in
2. Check Supabase Dashboard → Authentication → Users
3. Verify your user exists there

### Issue 4: User Profile Missing

**Symptom**: Can log in but can't access contracts

**Fix**:
1. Supabase Dashboard → Authentication → Users
2. Find your user, copy the UUID
3. Supabase Dashboard → Table Editor → users
4. Insert row:
   - `uid`: Paste UUID from step 2
   - `email`: Your email
   - `role`: `admin` (or `editor`/`viewer`)
   - `display_name`: Your name
   - `created_at`: Current timestamp (Date.now() in milliseconds)

---

## Manual Test Query

You can test if contracts are accessible by running this in Supabase SQL Editor:

```sql
-- Check if you can see contracts (replace with your user UUID)
SELECT COUNT(*) FROM contracts;

-- Check your user
SELECT * FROM users WHERE email = 'your-email@example.com';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'contracts';
```

---

## Still Not Working?

1. **Check Supabase Logs**:
   - Dashboard → Logs → API Logs
   - Look for errors around the time you tried to fetch contracts

2. **Check Browser Network Tab**:
   - DevTools → Network tab
   - Look for requests to `/rest/v1/contracts`
   - Check the response (should show contracts or error)

3. **Share Details**:
   - Screenshot of browser console
   - Screenshot of Supabase Table Editor (contracts table)
   - Any error messages you see
