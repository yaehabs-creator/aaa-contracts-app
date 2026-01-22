-- ============================================
-- AAA Contract Department - Create Admin User
-- ============================================
-- Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query
--
-- Creates: admin@aaa.com / Admin123!
-- ============================================

-- Check if user already exists
DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Try to find existing user
  SELECT id INTO user_id FROM auth.users WHERE email = 'admin@aaa.com';
  
  -- If user doesn't exist, create it
  IF user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@aaa.com',
      crypt('Admin123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Admin User"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO user_id;
    
    RAISE NOTICE 'Created auth user with ID: %', user_id;
  ELSE
    RAISE NOTICE 'User already exists with ID: %', user_id;
  END IF;
END $$;

-- Wait for trigger to create profile, then update to admin
-- Run this after a second or two:
UPDATE public.users
SET role = 'admin', display_name = 'Admin User'
WHERE email = 'admin@aaa.com';

-- Verify the user
SELECT 
  u.uid,
  u.email,
  u.display_name,
  u.role,
  to_char(to_timestamp(u.created_at / 1000), 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM public.users u
WHERE u.email = 'admin@aaa.com';

-- ============================================
-- SUCCESS! Sign in at http://localhost:3000/
-- Email: admin@aaa.com
-- Password: Admin123!
-- ============================================
