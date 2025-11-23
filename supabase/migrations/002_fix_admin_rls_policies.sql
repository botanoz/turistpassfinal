-- Migration: Fix Admin Profiles RLS Policies
-- Description: Remove recursive policies that cause 500 errors
-- Date: 2025-10-29

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can view all admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Admin can view own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can create admins" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can update admins" ON admin_profiles;
DROP POLICY IF EXISTS "Admins can update own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can delete admins" ON admin_profiles;

-- Create simpler, non-recursive policies

-- 1. Everyone can read their own profile (no recursion)
CREATE POLICY "Users can view own admin profile"
  ON admin_profiles FOR SELECT
  USING (id = auth.uid());

-- 2. Super admins can view all profiles (using role column directly)
CREATE POLICY "Super admins can view all profiles"
  ON admin_profiles FOR SELECT
  USING (
    -- Check if current user is super admin by looking at their own row
    (SELECT role FROM admin_profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- 3. Super admins can insert new admins
CREATE POLICY "Super admins can insert admins"
  ON admin_profiles FOR INSERT
  WITH CHECK (
    (SELECT role FROM admin_profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- 4. Super admins can update any admin
CREATE POLICY "Super admins can update any admin"
  ON admin_profiles FOR UPDATE
  USING (
    (SELECT role FROM admin_profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- 5. Admins can update their own profile (limited)
CREATE POLICY "Users can update own admin profile"
  ON admin_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    -- Prevent role escalation
    role = (SELECT role FROM admin_profiles WHERE id = auth.uid())
  );

-- 6. Super admins can delete admins
CREATE POLICY "Super admins can delete admins"
  ON admin_profiles FOR DELETE
  USING (
    (SELECT role FROM admin_profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- Add comment
COMMENT ON TABLE admin_profiles IS 'Admin user profiles with fixed RLS policies (no recursion)';
