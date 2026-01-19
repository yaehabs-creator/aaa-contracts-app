# 🚀 Deployment Checklist

## ✅ Pre-Deployment Steps

### 1. Database Migrations (CRITICAL!)
Before deploying, make sure you've run these migrations in Supabase:

- [ ] **Migration 001**: `supabase/migrations/001_initial_schema.sql`
  - Creates all tables (users, contracts, contract_sections, contract_items, activity_logs)
  
- [ ] **Migration 002**: `supabase/migrations/002_rls_policies.sql`
  - Sets up Row Level Security policies
  - Creates `is_admin()` function
  
- [ ] **Migration 003**: `supabase/migrations/003_fix_contract_policies.sql`
  - Fixes contract RLS policies for upsert operations

**How to run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste each migration file content
3. Click "Run"
4. Verify success message

### 2. Environment Variables in Vercel
Make sure these are set in Vercel Dashboard → Settings → Environment Variables:

- [ ] `VITE_SUPABASE_URL` - Your Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
- [ ] `VITE_ANTHROPIC_API_KEY` - (Optional) For AI features

### 3. Code Deployment
- [ ] All changes committed to git
- [ ] Pushed to GitHub
- [ ] Vercel auto-deploys (or manually trigger deployment)

---

## 🚀 Quick Deploy Commands

```powershell
# 1. Stage all changes
git add .

# 2. Commit changes
git commit -m "Deploy: Add auto-save, fix contract save, update RLS policies"

# 3. Push to GitHub (triggers Vercel auto-deploy)
git push origin master
```

---

## 📋 Post-Deployment Verification

After deployment, verify:

- [ ] App loads at `https://aaa-contract-app-deployment.vercel.app`
- [ ] Can log in successfully
- [ ] Can create contracts
- [ ] Can save contracts (no "Failed to save" errors)
- [ ] Can edit clauses
- [ ] Auto-save works when editing clauses
- [ ] Manual save button works
- [ ] Contracts appear in the list after saving

---

## 🐛 If Deployment Fails

### Check Vercel Build Logs:
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on failed deployment
3. Check "Build Logs" tab
4. Look for error messages

### Common Issues:

**Build Error: Missing environment variables**
- Solution: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel settings

**Runtime Error: "Supabase is not configured"**
- Solution: Verify environment variables are set correctly

**Database Error: "Permission denied"**
- Solution: Run migration `003_fix_contract_policies.sql` in Supabase

**Contracts not saving**
- Solution: Check browser console (F12) for detailed error messages
- Verify RLS policies are set up correctly

---

## ✅ Ready to Deploy!

Run these commands to deploy:

```powershell
cd Desktop/aaa1.02
git add .
git commit -m "Deploy: Add auto-save, fix contract save, update RLS policies"
git push
```

Then check Vercel dashboard for deployment status! 🎉
