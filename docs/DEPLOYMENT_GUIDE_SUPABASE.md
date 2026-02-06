# 🚀 AAA Contract Department - Supabase Deployment Guide

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **Supabase Account** (free tier works)
3. **Vercel Account** (free - for hosting)
4. **GitHub Account** (for version control and auto-deploy)

---

## 🎯 Quick Deployment (Recommended: Vercel)

### Step 1: Set Up Supabase Database

#### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click **"New Project"**
3. Enter project details:
   - **Name**: `aaa-contract-department` (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait ~2 minutes for project setup

#### 1.2 Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Run migrations in order:
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and click **"Run"**
   - Copy contents of `supabase/migrations/002_rls_policies.sql`
   - Paste and click **"Run"**
3. Verify tables were created:
   - Go to **Table Editor**
   - You should see: `users`, `contracts`, `contract_sections`, `contract_items`, `activity_logs`

#### 1.3 Get Supabase Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - (Optional) **service_role** key → Keep secret! Only for admin scripts

---

### Step 2: Push Code to GitHub

```powershell
cd Desktop/aaa1.02

# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Ready for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

### Step 3: Deploy on Vercel

#### 3.1 Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** → Sign in with GitHub
3. Click **"Add New..."** → **"Project"**
4. **Import** your GitHub repository
5. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
   - **Install Command**: `npm install` (default)

#### 3.2 Add Environment Variables

In Vercel dashboard → Your Project → **Settings** → **Environment Variables**

Add these variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key (optional, for AI features)
```

**Important**: 
- Add to **Production**, **Preview**, and **Development** environments
- Use the exact variable names (case-sensitive)

#### 3.3 Deploy! 🎉

1. Click **"Deploy"**
2. Wait ~2-3 minutes for build to complete
3. Your app will be live at: `https://your-project.vercel.app`

---

## 🔄 Alternative Deployment Methods

### Option 2: Vercel CLI (Quick Deploy)

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd Desktop/aaa1.02
vercel

# Follow prompts:
# - Set up and deploy: Yes
# - Link to existing project: No
# - Project name: aaa-contract-department
# - Directory: ./
# - Override settings: No

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_ANTHROPIC_API_KEY

# Deploy to production
vercel --prod
```

### Option 3: Netlify

1. Go to [netlify.com](https://netlify.com)
2. Connect GitHub repository
3. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Add environment variables in **Site settings** → **Environment variables**
5. Deploy!

### Option 4: Other Static Hosting

Any static hosting service works (GitHub Pages, Cloudflare Pages, etc.):

1. Build the app: `npm run build`
2. Upload `dist` folder contents to your hosting service
3. Configure environment variables (if supported)

---

## ✅ Post-Deployment Checklist

### 1. Verify Database Connection

1. Visit your deployed app URL
2. Try to log in or create an account
3. Check browser console (F12) for any errors
4. Verify data is being saved to Supabase

### 2. Create First Admin User

1. Go to Supabase Dashboard → **Table Editor** → **users**
2. Click **"Insert row"**
3. Fill in:
   - `uid`: Generate UUID (use online UUID generator)
   - `email`: Your email
   - `display_name`: Your name
   - `role`: `admin`
   - `created_at`: Current timestamp (milliseconds)
4. Go to **Authentication** → **Users** → **Add user**
5. Create auth user with same email and password
6. Copy the UUID from auth user → use same UUID in users table

**OR** use the app's initial setup flow (if implemented)

### 3. Test Key Features

- ✅ User authentication (login/logout)
- ✅ Create a contract
- ✅ Save contract to database
- ✅ Load contracts from database
- ✅ User management (if admin)

### 4. Configure Custom Domain (Optional)

1. In Vercel dashboard → **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

---

## 🔧 Environment Variables Reference

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |

### Optional Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VITE_ANTHROPIC_API_KEY` | Anthropic Claude API key | [console.anthropic.com](https://console.anthropic.com/) |

---

## 🐛 Troubleshooting

### Build Fails

**Error**: Missing environment variables
- **Solution**: Add all required variables in Vercel project settings

**Error**: Build timeout
- **Solution**: Check build logs, may need to optimize dependencies

### App Doesn't Load

**Error**: Blank page or errors
- **Solution**: 
  1. Check browser console (F12) for errors
  2. Verify environment variables are set correctly
  3. Check Supabase project is active and migrations ran successfully

### Database Connection Issues

**Error**: "Failed to fetch" or authentication errors
- **Solution**:
  1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
  2. Check Supabase project is not paused
  3. Verify RLS policies are set up correctly (run migration 002)

### Contracts Not Showing

**Error**: "No contracts found" but contracts exist in database
- **Solution**:
  1. Check browser console for RLS errors
  2. Verify user is authenticated
  3. Check RLS policies allow authenticated users to read contracts
  4. Run migration `002_rls_policies.sql` if not already done

---

## 🔄 Updating Your Deployment

### Automatic Updates (Recommended)

If connected to GitHub:
1. Make changes to your code
2. Commit and push: `git push`
3. Vercel automatically builds and deploys!

### Manual Update

```powershell
# Make your changes, then:
git add .
git commit -m "Update description"
git push

# Vercel will auto-deploy
```

### Rollback

1. Go to Vercel dashboard → **Deployments**
2. Find previous successful deployment
3. Click **"..."** → **"Promote to Production"**

---

## 📊 Monitoring

### Vercel Analytics

- View deployment history
- Check build logs
- Monitor performance

### Supabase Dashboard

- **Table Editor**: View your data
- **SQL Editor**: Run queries
- **Authentication**: Manage users
- **Logs**: View API requests and errors

---

## 🔒 Security Best Practices

1. ✅ **Never commit** `.env.local` or environment variables to git
2. ✅ Use **RLS policies** to secure your database
3. ✅ Keep **service_role** key secret (never expose in frontend)
4. ✅ Use **strong passwords** for Supabase project
5. ✅ Enable **2FA** on Supabase and Vercel accounts
6. ✅ Regularly **review RLS policies** and user permissions

---

## 💰 Cost Estimates

### Free Tier Limits

**Supabase Free Tier**:
- ✅ 500 MB database
- ✅ 2 GB bandwidth
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests

**Vercel Free Tier**:
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS

**For most use cases, free tier is sufficient!**

---

## 📞 Support

### Common Issues

1. **Database migration errors**: Check SQL syntax, ensure migrations run in order
2. **RLS policy errors**: Verify `is_admin()` function exists and has proper permissions
3. **Build errors**: Check Vercel build logs for specific error messages

### Getting Help

1. Check Supabase documentation: https://supabase.com/docs
2. Check Vercel documentation: https://vercel.com/docs
3. Review browser console errors (F12)
4. Check Supabase logs in dashboard

---

## 🎉 Success!

Your AAA Contract Department app is now live! 

**Next Steps**:
1. Share the URL with your team
2. Create user accounts
3. Start creating contracts!

**Your app URL**: `https://your-project.vercel.app`

---

## 📝 Quick Reference Commands

```powershell
# Build locally
npm run build

# Preview build locally
npm run preview

# Deploy to Vercel (if using CLI)
vercel --prod

# Check environment variables
# (In Vercel dashboard → Settings → Environment Variables)
```

---

**Need help?** Check the troubleshooting section or review the error messages in your browser console and Vercel build logs.
