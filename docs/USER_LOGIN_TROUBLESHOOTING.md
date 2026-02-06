# User Login Troubleshooting Guide

## Why Can't Team Members Login?

### Common Issues and Solutions:

#### 1. **User Account Not Created**
**Problem**: Team members try to login but get "user not found" error.

**Solution**: 
- Users MUST be created by an admin first
- Admin needs to:
  1. Login to the app
  2. Click "👥 Users" button in the header
  3. Click "+ Add User"
  4. Fill in:
     - Display Name
     - Email (must be valid email address)
     - Password (minimum 6 characters)
     - Role (Viewer/Editor/Admin)
  5. Click "Create User"
  6. Share the email and password with the team member

#### 2. **Incorrect Credentials**
**Problem**: "Invalid email or password" error.

**Solutions**:
- Verify the email address is correct (case-sensitive)
- Verify the password is correct
- Ask admin to reset the password (delete and recreate user if needed)

#### 3. **User Profile Missing in Firestore**
**Problem**: User can authenticate but gets signed out immediately.

**Solution**:
- This happens if user was created in Firebase Auth but profile wasn't created in Firestore
- Admin should delete and recreate the user through User Management

#### 4. **Network Issues**
**Problem**: "Network error" or connection timeout.

**Solutions**:
- Check internet connection
- Try again in a few moments
- Check if Firebase services are operational

#### 5. **Email Already in Use**
**Problem**: Admin gets "Email is already in use" when creating user.

**Solution**:
- User already exists in Firebase Authentication
- Admin should check User Management to see if user exists
- If user exists but can't login, verify their profile exists in Firestore

## Step-by-Step: Creating a New User (For Admins)

1. **Login as Admin**
   - Use your admin email and password

2. **Navigate to User Management**
   - Click the "👥 Users" button in the header

3. **Create New User**
   - Click "+ Add User" button
   - Fill in the form:
     - **Display Name**: Full name (e.g., "John Doe")
     - **Email**: Valid email address (e.g., "john@company.com")
     - **Password**: At least 6 characters (share securely!)
     - **Role**: 
       - **Viewer**: Read-only access
       - **Editor**: Can create/edit contracts
       - **Admin**: Full access + user management
   - Click "Create User"

4. **Share Credentials**
   - Send the email and password to the team member securely
   - They can now login at: https://aaa-contract-department-f5a18.web.app

5. **Note**: After creating a user, you'll be signed out (this is normal)
   - Just sign back in with your admin credentials

## Verification Checklist

Before team members try to login, verify:
- ✅ User was created by admin through User Management
- ✅ Email address is correct
- ✅ Password is at least 6 characters
- ✅ User profile exists in Firestore (check User Management list)
- ✅ Internet connection is working
- ✅ Using correct login URL: https://aaa-contract-department-f5a18.web.app

## Still Having Issues?

1. Check browser console (F12) for error messages
2. Verify Firebase Authentication is enabled in Firebase Console
3. Check Firestore security rules are deployed
4. Contact the system administrator
