-- Row Level Security (RLS) policies for Supabase
-- Replicates Firestore security rules functionality

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check if current user is admin
-- This function bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Return false if no authenticated user
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Query users table with RLS bypassed (SECURITY DEFINER)
  -- Use a direct query that bypasses RLS
  SELECT role INTO user_role
  FROM users
  WHERE uid = auth.uid();
  
  RETURN user_role = 'admin';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Authenticated users can create profile" ON users;
DROP POLICY IF EXISTS "Only admins can delete users" ON users;

DROP POLICY IF EXISTS "Authenticated users can read contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can create contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON contracts;
DROP POLICY IF EXISTS "Only admins can delete contracts" ON contracts;

DROP POLICY IF EXISTS "Users can read contract sections" ON contract_sections;
DROP POLICY IF EXISTS "Users can manage contract sections" ON contract_sections;

DROP POLICY IF EXISTS "Users can read contract items" ON contract_items;
DROP POLICY IF EXISTS "Users can manage contract items" ON contract_items;

DROP POLICY IF EXISTS "Admins can read activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;

-- Users policies
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = uid);

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = uid)
  WITH CHECK (auth.uid() = uid);

CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can create profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = uid);

CREATE POLICY "Only admins can delete users" ON users
  FOR DELETE USING (is_admin());

-- Contracts policies
CREATE POLICY "Authenticated users can read contracts" ON contracts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create contracts" ON contracts
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update contracts" ON contracts
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete contracts" ON contracts
  FOR DELETE USING (is_admin());

-- Contract sections policies (inherit from contracts)
CREATE POLICY "Users can read contract sections" ON contract_sections
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage contract sections" ON contract_sections
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Contract items policies
CREATE POLICY "Users can read contract items" ON contract_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage contract items" ON contract_items
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Activity logs policies
CREATE POLICY "Admins can read activity logs" ON activity_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "Authenticated users can create activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
