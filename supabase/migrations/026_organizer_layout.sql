-- Migration: 026_organizer_layout.sql
-- Infrastructure for customizable organizer layouts (visibility and ordering).

-- 1. Organizer Layouts Table
CREATE TABLE IF NOT EXISTS organizer_layouts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  UUID REFERENCES contracts(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  layout       JSONB NOT NULL,        -- OrganizerFolderLayout[]
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id)
);

-- 2. RLS Policies
ALTER TABLE organizer_layouts ENABLE ROW LEVEL SECURITY;

-- READ: any authenticated user who can see the contract
CREATE POLICY "layout_read"
  ON organizer_layouts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- WRITE (INSERT): only the contract owner
CREATE POLICY "layout_write"
  ON organizer_layouts FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND auth.uid() = (SELECT created_by FROM contracts WHERE id = contract_id)
  );

-- UPDATE: only the layout creator (owner)
CREATE POLICY "layout_update"
  ON organizer_layouts FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- DELETE: only the layout creator (owner)
CREATE POLICY "layout_delete"
  ON organizer_layouts FOR DELETE
  USING (auth.uid() = created_by);

-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizer_layouts_updated_at
    BEFORE UPDATE ON organizer_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
