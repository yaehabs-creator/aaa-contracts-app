# 🚀 AAA Contract Department - Deployment Guide

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **Firebase Account** (free tier works)
3. **Gemini API Key** (for contract analysis)

---

## 🔥 Step 1: Set Up Firebase Project

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name (e.g., `aaa-contract-dept`)
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### 1.2 Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **"Get started"**
3. Enable **Email/Password** sign-in method
4. Click **"Save"**

### 1.3 Create Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Select your preferred location
5. Click **"Enable"**

### 1.4 Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click the **Web** icon (`</>`)
4. Register app name: `AAA Contract Department`
5. Copy the `firebaseConfig` object

---

## 🔧 Step 2: Configure Environment Variables

### 2.1 Update .env.local

Open `Desktop/aaa1.02/.env.local` and fill in your credentials:

```bash
# Gemini API Key (get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Anthropic Claude API Key (optional, get from https://console.anthropic.com/)
# Required for using Claude AI in the AI Assistant bot
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Firebase Configuration (from Step 1.4)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 📦 Step 3: Install Dependencies

```powershell
cd Desktop/aaa1.02
npm install
npm install -g firebase-tools
```

---

## 🔐 Step 4: Deploy Firestore Security Rules

### 4.1 Login to Firebase

```powershell
firebase login
```

### 4.2 Initialize Firebase

```powershell
firebase init
```

Select:
- **Firestore**: Configure security rules and indexes files
- **Hosting**: Configure files for Firebase Hosting
- Use existing project: Select your project
- Firestore rules file: `firestore.rules` (press Enter)
- Firestore indexes file: `firestore.indexes.json` (press Enter)
- Public directory: `dist` (IMPORTANT!)
- Configure as single-page app: **Yes**
- Set up automatic builds: **No**

### 4.3 Deploy Security Rules

```powershell
firebase deploy --only firestore:rules
```

---

## 👤 Step 5: Create Admin Account

### 5.1 Build and Run Locally First

```powershell
npm run build
npm run preview
```

### 5.2 Open in Browser

Navigate to: `http://localhost:4173`

### 5.3 Create Admin User

You should see the **Initial Setup** screen:
1. Enter your admin email
2. Create a strong password
3. Click **"Create Admin Account"**

---

## 🌐 Step 6: Deploy to Firebase Hosting

### 6.1 Build Production Version

```powershell
npm run build
```

### 6.2 Deploy to Firebase

```powershell
firebase deploy
```

### 6.3 Access Your App

Firebase will provide a URL like:
```
https://your-project-id.web.app
```

---

## 👥 Step 7: User Management

### 7.1 Login as Admin

1. Go to your deployed URL
2. Sign in with admin credentials
3. Click **"👥 Users"** button in header

### 7.2 Create Team Members

1. Click **"+ Add User"**
2. Fill in user details:
   - Display Name
   - Email
   - Password (minimum 6 characters)
   - Role: Select from:
     - **Viewer**: Read-only access
     - **Editor**: Can create/edit contracts
     - **Admin**: Full access + user management
3. Click **"Create User"**

### 7.3 Manage Existing Users

- **Change Role**: Select new role from dropdown
- **Delete User**: Click red delete button

---

## 🔒 Security Features

### Role-Based Access Control

| Permission | Viewer | Editor | Admin |
|------------|--------|--------|-------|
| View contracts | ✅ | ✅ | ✅ |
| Create contracts | ❌ | ✅ | ✅ |
| Edit contracts | ❌ | ✅ | ✅ |
| Delete contracts | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

### Firestore Security Rules

All data is protected by server-side security rules:
- Authentication required for all operations
- Role-based permissions enforced at database level
- Admin-only user management
- Activity logging (optional)

---

## 🧪 Testing

### Test Different User Roles

1. **As Admin**: Create test users with different roles
2. **Sign out** and sign in as each user type
3. Verify permissions work correctly

### Test Contract Operations

1. **Upload PDF** or paste text
2. **Save contract** to cloud
3. **View in Archive**
4. **Export backup**
5. Verify data persists across sessions

---

## 🛠️ Troubleshooting

### Issue: "Permission Denied" Errors

**Solution**: 
```powershell
firebase deploy --only firestore:rules
```

### Issue: Environment Variables Not Working

**Solution**: 
1. Ensure `.env.local` exists in project root
2. Restart development server: `npm run dev`
3. For production, rebuild: `npm run build`

### Issue: Can't Create Users

**Solution**:
1. Verify Email/Password authentication is enabled in Firebase Console
2. Check Firestore security rules are deployed
3. Ensure you're logged in as admin

### Issue: Build Errors

**Solution**:
```powershell
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

---

## 📊 Monitoring

### View Activity in Firebase Console

1. **Authentication** → Users: See all registered users
2. **Firestore Database** → Data: View all contracts
3. **Hosting** → Dashboard: See deployment history

---

## 🔄 Updates

### Deploy New Changes

```powershell
# 1. Make your code changes
# 2. Build
npm run build

# 3. Deploy
firebase deploy

# Or deploy only hosting:
firebase deploy --only hosting
```

---

## 💡 Tips

1. **Backup Strategy**: Use the export function regularly
2. **User Onboarding**: Share deployment URL + initial credentials
3. **Password Security**: Use strong passwords for all accounts
4. **Regular Maintenance**: Review and clean up unused contracts
5. **Cost Management**: Firebase free tier is generous, but monitor usage

---

## 📞 Support

If you encounter issues:
1. Check Firebase Console for error logs
2. Review browser console (F12) for client-side errors
3. Verify all environment variables are set correctly

---

## 🎉 Success!

Your multi-user contract analysis system is now live! Team members can:
- ✅ Access from anywhere with internet
- ✅ Collaborate on the same contracts
- ✅ See real-time updates
- ✅ Work securely with role-based access

**Next Steps**: Share the deployment URL with your team and create their accounts!
