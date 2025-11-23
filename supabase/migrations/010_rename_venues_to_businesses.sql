-- =====================================================
-- MIGRATION: Rename Venues to Businesses
-- =====================================================
-- Description: Corrects architecture - venues should be businesses
-- The original project used "businesses" not "venues"
-- This migration renames all venue-related tables and columns
-- Date: 2025-10-30
-- FAZ: 6 (Correction)
-- =====================================================

-- ============================================
-- 1. RENAME TABLES
-- ============================================

-- Rename venues table to businesses
ALTER TABLE IF EXISTS venues RENAME TO businesses;

-- Rename pass_venues junction table to pass_businesses
ALTER TABLE IF EXISTS pass_venues RENAME TO pass_businesses;

-- ============================================
-- 2. RENAME FOREIGN KEY COLUMN
-- ============================================

-- Rename venue_id to business_id in pass_businesses
ALTER TABLE IF EXISTS pass_businesses
  RENAME COLUMN venue_id TO business_id;

-- ============================================
-- 3. UPDATE INDEXES
-- ============================================

-- Drop old indexes (they will be automatically renamed, but let's be explicit)
DROP INDEX IF EXISTS idx_venues_category;
DROP INDEX IF EXISTS idx_venues_status;
DROP INDEX IF EXISTS idx_venues_name;
DROP INDEX IF EXISTS idx_pass_venues_pass;
DROP INDEX IF EXISTS idx_pass_venues_venue;

-- Create new indexes with correct names
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_name ON businesses(name);
CREATE INDEX idx_pass_businesses_pass ON pass_businesses(pass_id);
CREATE INDEX idx_pass_businesses_business ON pass_businesses(business_id);

-- ============================================
-- 4. UPDATE RLS POLICIES
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Public can view active venues" ON businesses;
DROP POLICY IF EXISTS "Admins can manage venues" ON businesses;
DROP POLICY IF EXISTS "Public can view pass venues" ON pass_businesses;
DROP POLICY IF EXISTS "Admins can manage pass venues" ON pass_businesses;

-- Create new policies with correct names
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

-- ============================================
-- 5. UPDATE TRIGGERS
-- ============================================

-- Drop old trigger
DROP TRIGGER IF EXISTS venues_updated_at ON businesses;

-- Create new trigger with correct name
CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 6. UPDATE FUNCTION: get_pass_details
-- ============================================

-- Recreate function to use businesses instead of venues
CREATE OR REPLACE FUNCTION get_pass_details(pass_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pass', row_to_json(p.*),
    'pricing', (
      SELECT json_agg(row_to_json(pp.*))
      FROM pass_pricing pp
      WHERE pp.pass_id = pass_uuid
    ),
    'businesses', (
      SELECT json_agg(
        json_build_object(
          'business', row_to_json(b.*),
          'discount', pb.discount,
          'usage_type', pb.usage_type,
          'max_usage', pb.max_usage
        )
      )
      FROM pass_businesses pb
      JOIN businesses b ON b.id = pb.business_id
      WHERE pb.pass_id = pass_uuid
    )
  ) INTO result
  FROM passes p
  WHERE p.id = pass_uuid;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. UPDATE COMMENTS
-- ============================================

COMMENT ON TABLE businesses IS 'Business partners (restaurants, museums, etc.) that can be included in passes';
COMMENT ON TABLE pass_businesses IS 'Many-to-many relationship between passes and businesses with usage rules';
COMMENT ON FUNCTION get_pass_details IS 'Gets complete pass details including pricing and businesses';

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON businesses TO authenticated;
GRANT SELECT ON businesses TO anon;
GRANT SELECT ON pass_businesses TO authenticated;
GRANT SELECT ON pass_businesses TO anon;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test queries to verify migration:
-- SELECT * FROM businesses;
-- SELECT * FROM pass_businesses;
-- SELECT get_pass_details('some-pass-uuid');

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Expected results:
-- ✅ venues table renamed to businesses
-- ✅ pass_venues table renamed to pass_businesses
-- ✅ venue_id column renamed to business_id
-- ✅ All indexes updated
-- ✅ All RLS policies updated
-- ✅ All triggers updated
-- ✅ get_pass_details function updated
-- ✅ Comments updated
-- ✅ Permissions granted
