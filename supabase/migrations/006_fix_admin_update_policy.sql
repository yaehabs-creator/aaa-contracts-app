-- Fix admin update policy for users table
-- The issue is that the is_admin() function might not work correctly in UPDATE context

-- Drop existing update policies
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;

-- Create a single unified update policy
-- Admins can update any user, regular users can only update their own non-role fields
CREATE POLICY "Users can update profiles" ON users
  FOR UPDATE 
  USING (
    auth.uid() = uid  -- User can update their own profile
    OR 
    (SELECT role FROM users WHERE uid = auth.uid()) = 'admin'  -- Admin can update any profile
  )
  WITH CHECK (
    auth.uid() = uid  -- User updating own profile
    OR 
    (SELECT role FROM users WHERE uid = auth.uid()) = 'admin'  -- Admin updating any profile
  );

-- Also update the is_admin function to be more robust
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM users WHERE uid = auth.uid()),
    FALSE
  );
$$;
