# ⚡ Quick Deployment Checklist

## 🎯 Fastest Path to Deploy (5 Steps)

### ✅ Step 1: Supabase Setup (5 min)

1. Go to [app.supabase.com](https://app.supabase.com) → **New Project**
2. Create project → Wait for setup
3. Go to **SQL Editor** → Run these migrations:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
4. Go to **Settings** → **API** → Copy:
   - Project URL
   - anon public key

### ✅ Step 2: Push to GitHub (2 min)

```powershell
cd Desktop/aaa1.02
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### ✅ Step 3: Deploy on Vercel (3 min)

1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. **Add New Project** → Import your repo
3. **Settings** → **Environment Variables** → Add:
   ```
   VITE_SUPABASE_URL=your_url_here
   VITE_SUPABASE_ANON_KEY=your_key_here
   ```
4. Click **Deploy** → Wait 2-3 minutes

### ✅ Step 4: Create Admin User

**Option A: Via Supabase Dashboard**
1. Supabase → **Authentication** → **Users** → **Add user**
2. Create user with email/password
3. Copy the UUID
4. Supabase → **Table Editor** → **users** → **Insert row**:
   - `uid`: Paste UUID from step 2
   - `email`: Same email
   - `role`: `admin`
   - `display_name`: Your name
   - `created_at`: Current timestamp (Date.now())

**Option B: Via App** (if initial setup flow exists)
- Visit your deployed URL
- Follow the initial setup flow

### ✅ Step 5: Test & Share

1. Visit your app: `https://your-project.vercel.app`
2. Log in with admin account
3. Create a test contract
4. Share URL with your team!

---

## 🔑 Required Environment Variables

Add these in Vercel → Settings → Environment Variables:

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Dashboard → Settings → API |

**Optional:**
- `VITE_ANTHROPIC_API_KEY` - For AI features

---

## ✅ Pre-Deployment Checklist

- [ ] Supabase project created
- [ ] Database migrations run (001 & 002)
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables added to Vercel
- [ ] Build successful (check Vercel logs)
- [ ] Admin user created
- [ ] Test login works
- [ ] Test contract creation works

---

## 🚀 Your App Will Be Live At:

`https://your-project.vercel.app`

---

## 📚 Full Guide

For detailed instructions, see: `DEPLOYMENT_GUIDE_SUPABASE.md`

---

## 🆘 Quick Troubleshooting

**Build fails?**
- Check environment variables are set in Vercel
- Check Vercel build logs for specific errors

**App shows errors?**
- Open browser console (F12) → Check for error messages
- Verify Supabase URL and key are correct
- Check Supabase project is not paused

**Can't log in?**
- Verify admin user exists in both Authentication and users table
- Check RLS policies are set up correctly

---

**Ready?** Start with Step 1! 🚀
