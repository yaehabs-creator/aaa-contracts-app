-- ============================================
-- Fix Admin User Profile
-- ============================================
-- The auth user exists but the profile is missing
-- Run this to check and fix the profile
-- ============================================

-- Step 1: Check if profile exists
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  u.uid as profile_uid,
  u.email as profile_email,
  u.role,
  u.display_name
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.uid
WHERE au.email = 'admin@aaa.com';

-- Step 2: If profile is missing, create it manually
-- (The trigger should have done this, but let's do it manually)
INSERT INTO public.users (uid, email, display_name, role, created_at)
SELECT 
  au.id,
  au.email,
  'Admin User',
  'admin',
  EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
FROM auth.users au
WHERE au.email = 'admin@aaa.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE uid = au.id
  );

-- Step 3: If profile exists but role is wrong, update it
UPDATE public.users
SET 
  role = 'admin',
  display_name = 'Admin User'
WHERE email = 'admin@aaa.com';

-- Step 4: Verify the fix
SELECT 
  u.uid,
  u.email,
  u.display_name,
  u.role,
  to_char(to_timestamp(u.created_at / 1000), 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM public.users u
WHERE u.email = 'admin@aaa.com';

-- ============================================
-- After running this, try signing in again!
-- Email: admin@aaa.com
-- Password: Admin123!
-- ============================================
