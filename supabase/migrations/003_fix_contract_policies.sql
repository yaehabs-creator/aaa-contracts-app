-- Fix contract RLS policies to ensure upsert operations work correctly
-- This migration ensures INSERT and UPDATE policies are properly configured

-- Drop existing contract policies
DROP POLICY IF EXISTS "Authenticated users can read contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can create contracts" ON contracts;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON contracts;
DROP POLICY IF EXISTS "Only admins can delete contracts" ON contracts;

-- Recreate contract policies with explicit permissions
-- SELECT: Any authenticated user can read contracts
CREATE POLICY "Authenticated users can read contracts" ON contracts
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- INSERT: Any authenticated user can create contracts
CREATE POLICY "Authenticated users can create contracts" ON contracts
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Any authenticated user can update contracts
CREATE POLICY "Authenticated users can update contracts" ON contracts
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE: Only admins can delete contracts
CREATE POLICY "Only admins can delete contracts" ON contracts
  FOR DELETE 
  USING (is_admin());
