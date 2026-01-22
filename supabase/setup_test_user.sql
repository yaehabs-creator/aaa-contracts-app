-- Quick Setup: Create Test Admin User for AAA Contract Department
-- Run this script in your Supabase SQL Editor

-- Step 1: Create auth user (this will automatically create a profile via trigger)
-- Note: You need to do this via Supabase Dashboard → Authentication → Add User
-- OR use the Supabase API/Dashboard to create:
-- Email: admin@aaa.com
-- Password: Admin123!
-- Then the trigger will auto-create the profile

-- Step 2: Update the auto-created profile to admin role
-- Replace 'admin@aaa.com' with the email you used
UPDATE users
SET role = 'admin',
    display_name = 'Admin User'
WHERE email = 'admin@aaa.com';

-- Step 3: Verify the user was created
SELECT uid, email, display_name, role, created_at
FROM users
WHERE email = 'admin@aaa.com';

-- Alternative: If you want to create additional users programmatically
-- First create them in Supabase Auth Dashboard, then run:
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
