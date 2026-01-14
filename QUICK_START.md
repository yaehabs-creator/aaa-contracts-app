# 🚀 Quick Start Guide

## ✅ Setup Complete!

Your multi-user contract analysis system is ready to deploy!

---

## 📝 What You Need

1. **Firebase Account** (free): https://console.firebase.google.com/
2. **Gemini API Key** (free): https://aistudio.google.com/app/apikey
3. **10 minutes** of your time

---

## ⚡ Quick Deploy (3 Steps)

### Step 1: Create Firebase Project (5 min)

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Name it (e.g., "AAA-Contracts")
4. Enable **Authentication** → Email/Password
5. Create **Firestore Database** (production mode)
6. Copy your Firebase config from Project Settings

### Step 2: Configure Environment (2 min)

Open `Desktop/aaa1.02/.env.local` and add your keys:

```bash
# Gemini API Key
GEMINI_API_KEY=your_gemini_key_here

# Firebase Config (from Step 1)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Step 3: Deploy (3 min)

```powershell
cd Desktop/aaa1.02

# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize (select Firestore + Hosting)
firebase init

# Deploy
firebase deploy
```

**Done!** 🎉 Firebase will give you a URL like: `https://your-project.web.app`

---

## 👤 First Login

1. Visit your deployed URL
2. You'll see **"Initial Setup"** screen
3. Create your admin account
4. Start analyzing contracts!

---

## 👥 Add Team Members

1. Click **"👥 Users"** in the header
2. Click **"+ Add User"**
3. Fill in:
   - Name
   - Email
   - Password
   - Role (Viewer/Editor/Admin)
4. Share the URL with them

---

## 🎯 User Roles

| Role | Can View | Can Create | Can Edit | Can Delete | Manage Users |
|------|----------|------------|----------|------------|--------------|
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Editor** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🆘 Troubleshooting

### Build Failed?
```powershell
rm -rf node_modules
npm install
npm run build
```

### Can't Login?
- Check Firebase Authentication is enabled
- Verify .env.local has correct values
- Redeploy: `firebase deploy`

### Permission Denied?
```powershell
firebase deploy --only firestore:rules
```

---

## 📚 Full Documentation

- **Detailed Guide**: See `DEPLOYMENT_GUIDE.md`
- **Setup Summary**: See `SETUP_SUMMARY.md`

---

## 🎉 You're Ready!

Your app now has:
- ✅ Cloud storage (Firestore)
- ✅ User authentication
- ✅ Role-based permissions
- ✅ Real-time sync
- ✅ Multi-user access

**Questions?** Check the detailed guides or Firebase documentation.

**Happy analyzing! 📄✨**
