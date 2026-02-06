# 🚨 Fix: "Forbidden use of secret API key in browser"

## Problem
You're seeing the error: **"Forbidden use of secret API key in browser"**

This means you've accidentally set the **service_role** key (secret key) in your Vercel environment variables instead of the **anon** key (public key).

## ⚠️ Why This Is Critical
- **Service role key** = Secret key that bypasses all security (like admin access)
- **Anon key** = Public key that respects Row Level Security policies
- **Service role keys MUST NEVER be exposed in browser code** - anyone can see it and access your entire database!

---

## ✅ How to Fix (2 Steps)

### Step 1: Get the Correct Key from Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Find the **"anon public"** key (NOT the service_role key!)
5. Copy it - it should start with `eyJ` and be shorter than the service_role key

### Step 2: Update Vercel Environment Variable

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project: **`aaa-contract-app-deployment`**
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_SUPABASE_ANON_KEY`
5. Click **Edit**
6. **Delete the current value** (it's probably the service_role key)
7. **Paste the anon public key** from Step 1
8. Click **Save**
9. **Redeploy** your app (or wait for next deployment)

---

## 🔍 How to Tell Which Key You Have

### ✅ Anon Key (CORRECT - Use This)
- Starts with `eyJ`
- Shorter (usually ~150-200 characters)
- Labeled as **"anon public"** in Supabase dashboard
- Safe to use in browser

### ❌ Service Role Key (WRONG - Never Use This)
- Starts with `eyJ`
- Longer (usually ~250+ characters)
- Labeled as **"service_role"** in Supabase dashboard
- **NEVER expose in browser!**

---

## 📋 Quick Fix Checklist

- [ ] Opened Supabase Dashboard → Settings → API
- [ ] Copied the **"anon public"** key (NOT service_role)
- [ ] Went to Vercel → Settings → Environment Variables
- [ ] Updated `VITE_SUPABASE_ANON_KEY` with the anon key
- [ ] Redeployed the app
- [ ] Verified error is gone

---

## 🛡️ Security Best Practices

1. ✅ **Always use anon key** in frontend code
2. ✅ **Never commit** service_role key to git
3. ✅ **Never expose** service_role key in browser
4. ✅ **Only use service_role key** in backend scripts (like `scripts/import-to-supabase.js`)

---

## 🔄 After Fixing

1. The error should disappear immediately after redeploy
2. Your app will work correctly with RLS policies
3. Your database will be secure

---

## ❓ Still Having Issues?

If you're still seeing the error after updating:

1. **Double-check** you copied the anon key (not service_role)
2. **Verify** the environment variable name is exactly: `VITE_SUPABASE_ANON_KEY`
3. **Redeploy** the app (Vercel → Deployments → Redeploy)
4. **Clear browser cache** and hard refresh (Ctrl+Shift+R)

---

**The fix is simple: Replace the service_role key with the anon key in Vercel!** 🔒
