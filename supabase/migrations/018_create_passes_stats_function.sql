-- =====================================================
-- MIGRATION: Create Passes Stats Function
-- =====================================================
-- Description: Creates get_admin_passes_stats() function
-- for Pass Management page statistics
-- Date: 2025-10-31
-- =====================================================

-- Drop function if exists
DROP FUNCTION IF EXISTS get_admin_passes_stats();

-- Create function to get passes statistics
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
    (SELECT COUNT(*) FROM passes) as total_passes,
    (SELECT COUNT(*) FROM passes WHERE status = 'active') as active_passes,
    (SELECT COUNT(*) FROM passes WHERE status = 'draft') as draft_passes,
    (SELECT COALESCE(SUM(total_sold), 0)::BIGINT FROM passes) as total_sold,
    (SELECT COALESCE(SUM(total_revenue), 0) FROM passes) as total_revenue;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_admin_passes_stats() TO authenticated;

-- =====================================================
