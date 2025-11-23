-- Fix dashboard stats function type mismatches
-- Issue: integer vs bigint type mismatch in columns 4 and 8

DROP FUNCTION IF EXISTS get_dashboard_stats();

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
    -- Total customers (users who have made at least one order)
    (SELECT COUNT(DISTINCT customer_id)
     FROM orders
     WHERE status IN ('completed', 'processing', 'pending')) as total_customers,

    -- Active customers (customers who ordered in last 30 days)
    (SELECT COUNT(DISTINCT customer_id)
     FROM orders
     WHERE status = 'completed'
     AND created_at >= NOW() - INTERVAL '30 days') as active_customers,

    -- Total active businesses
    (SELECT COUNT(*)
     FROM businesses
     WHERE status = 'active') as total_businesses,

    -- Pending business applications (cast to BIGINT)
    (SELECT 0::BIGINT) as pending_applications,

    -- Total passes sold (completed orders only)
    (SELECT COALESCE(SUM(oi.quantity), 0)
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.status = 'completed') as total_passes_sold,

    -- Monthly revenue (current month)
    (SELECT COALESCE(SUM(total_amount), 0)
     FROM orders
     WHERE status = 'completed'
     AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
     AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())) as monthly_revenue,

    -- Pending orders
    (SELECT COUNT(*)
     FROM orders
     WHERE status = 'pending') as pending_orders,

    -- Pending support (cast to BIGINT)
    (SELECT 0::BIGINT) as pending_support;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
