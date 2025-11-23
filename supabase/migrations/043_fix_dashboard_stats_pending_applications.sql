-- =====================================================
-- MIGRATION: Fix dashboard stats pending applications type
-- Date: 2025-11-09
-- =====================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_customers BIGINT,
  active_customers BIGINT,
  total_businesses BIGINT,
  pending_applications BIGINT,
  total_passes_sold BIGINT,
  monthly_revenue NUMERIC,
  pending_orders BIGINT,
  pending_support BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT customer_id)
       FROM orders
       WHERE status IN ('completed', 'processing', 'pending')) AS total_customers,

    (SELECT COUNT(DISTINCT customer_id)
       FROM orders
       WHERE status = 'completed'
         AND created_at >= NOW() - INTERVAL '30 days') AS active_customers,

    (SELECT COUNT(*)
       FROM businesses
       WHERE status = 'active') AS total_businesses,

    (SELECT 0::BIGINT) AS pending_applications,

    (SELECT COALESCE(SUM(oi.quantity), 0)
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'completed') AS total_passes_sold,

    (SELECT COALESCE(SUM(total_amount), 0)
       FROM orders
       WHERE status = 'completed'
         AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
         AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())) AS monthly_revenue,

    (SELECT COUNT(*)
       FROM orders
       WHERE status = 'pending') AS pending_orders,

    (SELECT COUNT(*)
       FROM support_tickets
       WHERE status IN ('open', 'in_progress')) AS pending_support;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
