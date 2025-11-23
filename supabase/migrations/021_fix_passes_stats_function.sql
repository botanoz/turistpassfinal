-- =====================================================
-- MIGRATION: Fix Passes Stats Function
-- =====================================================
-- Description: Fixes get_admin_passes_stats() function
-- to use correct aggregate syntax from migration 007
-- Date: 2025-10-31
-- =====================================================

-- Drop and recreate function with correct syntax
DROP FUNCTION IF EXISTS get_admin_passes_stats();

CREATE OR REPLACE FUNCTION get_admin_passes_stats()
RETURNS TABLE (
  total_passes BIGINT,
  active_passes BIGINT,
  draft_passes BIGINT,
  total_sold BIGINT,
  total_revenue NUMERIC
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_passes,
    COUNT(*) FILTER (WHERE status = 'active') as active_passes,
    COUNT(*) FILTER (WHERE status = 'draft') as draft_passes,
    COALESCE(SUM(total_sold), 0) as total_sold,
    COALESCE(SUM(total_revenue), 0) as total_revenue
  FROM passes;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_admin_passes_stats() TO authenticated;

-- =====================================================
