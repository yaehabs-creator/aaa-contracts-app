# AAA Contract Department - Setup Instructions

## Quick Setup: Create Admin User

I've created an automated script to set up an admin user. Follow these steps:

### Step 1: Add Service Role Key

You need to add your Supabase service role key to `.env.local`:

1. Go to your Supabase Dashboard: https://zyizsqkifweokkwesqpp.supabase.co
2. Navigate to: **Settings → API**
3. Copy the `service_role` key (it's a secret key, keep it safe!)
4. Add it to your `.env.local` file:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 2: Run the Setup Script

```bash
node scripts/setup-admin-user.js
```

The script will:
- Prompt you for admin email (default: admin@aaa.com)
- Prompt you for password (default: Admin123!)
- Create the user in Supabase Auth
- Set up the user profile with admin role
- Verify everything is working

### Step 3: Sign In

Go to http://localhost:3000/ and sign in with your credentials!

---

## Alternative: Manual Setup

If you prefer to set up manually, see `supabase/setup_test_user.sql` for SQL instructions.

## Security Note

⚠️ **IMPORTANT**: The service role key is a powerful secret key. Never commit it to git or expose it in frontend code. It's only used in this setup script which runs on your local machine.
