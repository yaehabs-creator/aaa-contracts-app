-- Migration: 017_organizer_rls_policies.sql
-- Enables RLS and adds policies for the contract organizer tables.

-- 1. Enable RLS on all organizer tables
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_subfolders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_folder_schema ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_extracted_data ENABLE ROW LEVEL SECURITY;

-- 2. Templates Policies (Read-only for users, managed by admins or seeds)
DROP POLICY IF EXISTS "Anyone can read templates" ON contract_templates;
CREATE POLICY "Anyone can read templates" ON contract_templates
  FOR SELECT USING (TRUE);

-- 3. Subfolders Policies (Manageable by authenticated users)
DROP POLICY IF EXISTS "Users can manage subfolders" ON contract_subfolders;
CREATE POLICY "Users can manage subfolders" ON contract_subfolders
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Schema Policies (Manageable by authenticated users)
DROP POLICY IF EXISTS "Users can manage folder schemas" ON contract_folder_schema;
CREATE POLICY "Users can manage folder schemas" ON contract_folder_schema
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Extracted Data Policies (Manageable by authenticated users)
DROP POLICY IF EXISTS "Users can manage extracted data" ON contract_extracted_data;
CREATE POLICY "Users can manage extracted data" ON contract_extracted_data
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Note: In a production environment, you would restrict these by contract_id/project_id ownership.
-- For this phase, we align with the existing project's flat "authenticated user" access model.
