-- =====================================================
-- MIGRATION: Fix Analytics Column Names
-- =====================================================
-- Description: Fixes wrong column names in analytics functions
-- oi.price should be oi.unit_price
-- Date: 2025-10-31
-- =====================================================

-- Drop and recreate get_top_selling_passes with correct column names
DROP FUNCTION IF EXISTS get_top_selling_passes(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_top_selling_passes(
  top_n INTEGER DEFAULT 10,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  pass_id UUID,
  pass_name TEXT,
  total_sold BIGINT,
  total_revenue NUMERIC,
  average_price NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.pass_id,
    oi.pass_name,
    COALESCE(SUM(oi.quantity), 0) as total_sold,
    COALESCE(SUM(oi.total_price), 0) as total_revenue,
    COALESCE(AVG(oi.unit_price), 0) as average_price
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.status = 'completed'
    AND o.created_at >= start_date
    AND o.created_at <= end_date
  GROUP BY oi.pass_id, oi.pass_name
  ORDER BY total_sold DESC
  LIMIT top_n;
END;
$$;

GRANT EXECUTE ON FUNCTION get_top_selling_passes(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =====================================================
