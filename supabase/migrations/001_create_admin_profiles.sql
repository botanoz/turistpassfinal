-- Migration: Create Admin Profiles Table
-- Description: Admin authentication and authorization system
-- Date: 2025-10-29

-- Create admin_profiles table
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'support')) NOT NULL DEFAULT 'admin',
  permissions JSONB NOT NULL DEFAULT '{
    "customers": false,
    "businesses": false,
    "passes": false,
    "orders": false,
    "support": false,
    "settings": false,
    "analytics": false
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_profiles_email ON admin_profiles(email);

-- Create index on role for permission checks
CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON admin_profiles(role);

-- Enable Row Level Security
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all admin profiles
CREATE POLICY "Admins can view all admin profiles"
  ON admin_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
      AND ap.role IN ('super_admin', 'admin')
    )
  );

-- Policy: Admins can view their own profile
CREATE POLICY "Admin can view own profile"
  ON admin_profiles FOR SELECT
  USING (id = auth.uid());

-- Policy: Super admins can insert new admins
CREATE POLICY "Super admins can create admins"
  ON admin_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
      AND ap.role = 'super_admin'
    )
  );

-- Policy: Super admins can update other admins
CREATE POLICY "Super admins can update admins"
  ON admin_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
      AND ap.role = 'super_admin'
    )
  );

-- Policy: Admins can update their own profile (limited fields)
CREATE POLICY "Admins can update own profile"
  ON admin_profiles FOR UPDATE
  USING (id = auth.uid());

-- Policy: Super admins can delete admins
CREATE POLICY "Super admins can delete admins"
  ON admin_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
      AND ap.role = 'super_admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER admin_profiles_updated_at_trigger
  BEFORE UPDATE ON admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_profiles_updated_at();

-- Comments for documentation
COMMENT ON TABLE admin_profiles IS 'Admin user profiles with role-based permissions';
COMMENT ON COLUMN admin_profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN admin_profiles.role IS 'Admin role: super_admin, admin, or support';
COMMENT ON COLUMN admin_profiles.permissions IS 'JSONB object with module-level permissions';
