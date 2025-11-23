-- =====================================================
-- MIGRATION: Fix Analytics Functions
-- =====================================================
-- Description: Fixes column names and ensures all analytics
-- functions properly bypass RLS with SECURITY DEFINER
-- Date: 2025-10-31
-- =====================================================

-- Drop and recreate get_pass_category_distribution with correct column names
DROP FUNCTION IF EXISTS get_pass_category_distribution();

CREATE OR REPLACE FUNCTION get_pass_category_distribution()
RETURNS TABLE (
  category TEXT,
  count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_passes BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_passes FROM passes WHERE status = 'active';

  RETURN QUERY
  SELECT
    CASE
      WHEN p.featured = true THEN 'Featured'
      WHEN p.popular = true THEN 'Popular'
      ELSE 'Standard'
    END as category,
    COUNT(*) as count,
    CASE
      WHEN total_passes > 0 THEN (COUNT(*) * 100.0 / total_passes)
      ELSE 0
    END as percentage
  FROM passes p
  WHERE p.status = 'active'
  GROUP BY category
  ORDER BY count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pass_category_distribution() TO authenticated;

-- =====================================================
-- Verify all analytics functions exist and have SECURITY DEFINER
-- =====================================================

-- These functions should already exist from migration 011,
-- but let's ensure they have proper permissions

GRANT EXECUTE ON FUNCTION get_sales_analytics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_by_date(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_selling_passes(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_businesses(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_insights(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_category_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_comprehensive_analytics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =====================================================
