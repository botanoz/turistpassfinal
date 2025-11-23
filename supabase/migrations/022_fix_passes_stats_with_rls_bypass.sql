-- =====================================================
-- MIGRATION: Fix Passes Stats Function with RLS Bypass
-- =====================================================
-- Description: Fixes get_admin_passes_stats() to bypass RLS
-- The function needs to count all passes regardless of status
-- SECURITY DEFINER should run with elevated privileges
-- Date: 2025-10-31
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_admin_passes_stats();

-- Recreate with proper SECURITY DEFINER that bypasses RLS
CREATE OR REPLACE FUNCTION get_admin_passes_stats()
RETURNS TABLE (
  total_passes BIGINT,
  active_passes BIGINT,
  draft_passes BIGINT,
  total_sold BIGINT,
  total_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_passes BIGINT;
  v_active_passes BIGINT;
  v_draft_passes BIGINT;
  v_total_sold BIGINT;
  v_total_revenue NUMERIC;
BEGIN
  -- Count total passes
  SELECT COUNT(*) INTO v_total_passes FROM public.passes;

  -- Count active passes
  SELECT COUNT(*) INTO v_active_passes FROM public.passes WHERE status = 'active';

  -- Count draft passes
  SELECT COUNT(*) INTO v_draft_passes FROM public.passes WHERE status = 'draft';

  -- Sum total sold
  SELECT COALESCE(SUM(public.passes.total_sold), 0) INTO v_total_sold FROM public.passes;

  -- Sum total revenue
  SELECT COALESCE(SUM(public.passes.total_revenue), 0) INTO v_total_revenue FROM public.passes;

  -- Return results
  RETURN QUERY SELECT
    v_total_passes,
    v_active_passes,
    v_draft_passes,
    v_total_sold,
    v_total_revenue;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_passes_stats() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_admin_passes_stats() IS 'Gets pass statistics for admin dashboard - bypasses RLS with SECURITY DEFINER';

-- =====================================================
