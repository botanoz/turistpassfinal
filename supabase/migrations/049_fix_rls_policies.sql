-- =====================================================
-- MIGRATION: Fix RLS Policies for Public Access
-- =====================================================
-- Description: Ensure all necessary tables have proper RLS policies
-- Date: 2025-01-19
-- =====================================================

-- =====================================================
-- PASSES TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view active passes" ON passes;
DROP POLICY IF EXISTS "Admins can manage passes" ON passes;

-- Recreate policies
CREATE POLICY "Public can view active passes"
  ON passes FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage passes"
  ON passes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- =====================================================
-- PASS_BUSINESSES TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view pass businesses" ON pass_businesses;
DROP POLICY IF EXISTS "Admins can manage pass businesses" ON pass_businesses;

-- Recreate policies
CREATE POLICY "Public can view pass businesses"
  ON pass_businesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM passes p
      WHERE p.id = pass_businesses.pass_id
        AND p.status = 'active'
    )
  );

CREATE POLICY "Admins can manage pass businesses"
  ON pass_businesses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- =====================================================
-- BUSINESSES TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view active businesses" ON businesses;
DROP POLICY IF EXISTS "Admins can manage businesses" ON businesses;

-- Recreate policies
CREATE POLICY "Public can view active businesses"
  ON businesses FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage businesses"
  ON businesses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- =====================================================
-- PASS_PRICING TABLE
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view pass pricing" ON pass_pricing;
DROP POLICY IF EXISTS "Admins can manage pass pricing" ON pass_pricing;

-- Recreate policies
CREATE POLICY "Public can view pass pricing"
  ON pass_pricing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM passes p
      WHERE p.id = pass_pricing.pass_id
        AND p.status = 'active'
    )
  );

CREATE POLICY "Admins can manage pass pricing"
  ON pass_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant SELECT to anonymous and authenticated users
GRANT SELECT ON passes TO anon, authenticated;
GRANT SELECT ON pass_businesses TO anon, authenticated;
GRANT SELECT ON businesses TO anon, authenticated;
GRANT SELECT ON pass_pricing TO anon, authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test queries (commented out):
-- SELECT * FROM passes WHERE status = 'active';
-- SELECT * FROM pass_businesses pb JOIN passes p ON p.id = pb.pass_id WHERE p.status = 'active';
-- SELECT * FROM businesses WHERE status = 'active';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
