-- Migration: Simplify Admin RLS (Emergency Fix)
-- Description: Use simpler, non-recursive policies to fix 500 error
-- Date: 2025-10-29

-- Drop all existing policies first
DROP POLICY IF EXISTS "Admins can view all admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Admin can view own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can create admins" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can update admins" ON admin_profiles;
DROP POLICY IF EXISTS "Admins can update own profile" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can delete admins" ON admin_profiles;
DROP POLICY IF EXISTS "Users can view own admin profile" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can insert admins" ON admin_profiles;
DROP POLICY IF EXISTS "Super admins can update any admin" ON admin_profiles;
DROP POLICY IF EXISTS "Users can update own admin profile" ON admin_profiles;

-- SIMPLE APPROACH: Just let authenticated users read their own profile
-- No recursion, no complex queries

-- 1. Read own profile (SAFE - no recursion)
CREATE POLICY "read_own_profile"
  ON admin_profiles FOR SELECT
  USING (auth.uid() = id);

-- 2. Update own profile (SAFE - no recursion)
CREATE POLICY "update_own_profile"
  ON admin_profiles FOR UPDATE
  USING (auth.uid() = id);

-- For INSERT/DELETE, we'll use service role key from application code
-- This prevents any RLS recursion issues

-- Verify RLS is still enabled
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE admin_profiles IS 'Admin profiles with simplified RLS (non-recursive)';
