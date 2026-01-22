-- App settings table for global configuration
-- This table stores application-wide settings like login requirements

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(uid) ON DELETE SET NULL
);

-- Insert default settings
INSERT INTO app_settings (key, value) VALUES 
  ('login_required', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- RLS policies for app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can update app settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can insert app settings" ON app_settings;

-- Anyone can read app settings (needed for login page to check if login is required)
CREATE POLICY "Anyone can read app settings"
  ON app_settings
  FOR SELECT
  TO public
  USING (true);

-- Only admins can update app settings
CREATE POLICY "Admins can update app settings"
  ON app_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.uid = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.uid = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can insert app settings
CREATE POLICY "Admins can insert app settings"
  ON app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.uid = auth.uid()
      AND users.role = 'admin'
    )
  );
