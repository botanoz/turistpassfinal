-- =====================================================
-- Performance Optimizations
-- =====================================================
-- Description: Optimize slow queries, add missing indexes, and improve functions
-- Date: 2025-01-25
-- =====================================================

-- ============================================
-- 1. ADD MISSING INDEXES
-- ============================================

-- Optimize order queries
CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created ON orders(payment_status, created_at DESC);

-- Optimize order items lookups
CREATE INDEX IF NOT EXISTS idx_order_items_order_pass ON order_items(order_id, pass_name);

-- Optimize purchased passes queries
CREATE INDEX IF NOT EXISTS idx_purchased_passes_customer_status ON purchased_passes(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_purchased_passes_status_expiry ON purchased_passes(status, expiry_date);

-- Optimize venue visits (using business_id instead of venue_id)
CREATE INDEX IF NOT EXISTS idx_venue_visits_customer_date ON venue_visits(customer_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_venue_visits_business_date ON venue_visits(business_id, visit_date DESC);

-- Optimize support tickets for SLA queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority ON support_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_breach ON support_tickets(sla_first_response_breached, sla_resolution_breached)
  WHERE status IN ('open', 'in_progress');

-- Optimize admin alerts
CREATE INDEX IF NOT EXISTS idx_admin_alerts_status_severity ON admin_alerts(status, severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_unread_created ON admin_alerts(created_at DESC)
  WHERE status = 'unread';

-- Optimize notification preferences lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_customer_unique ON notification_preferences(customer_id);

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_passes_active ON passes(id, name) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(id, name) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(code) WHERE status = 'active';

-- ============================================
-- 2. OPTIMIZE DASHBOARD STATS FUNCTION
-- ============================================

-- Original function is slow due to multiple sequential queries
-- Optimize by combining queries and using CTEs

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
  WITH stats AS (
    SELECT
      -- Use single queries with filters instead of multiple queries
      COUNT(DISTINCT CASE WHEN o.status IN ('completed', 'processing', 'pending') THEN o.customer_id END) as total_cust,
      COUNT(DISTINCT CASE WHEN o.status = 'completed' AND o.created_at >= NOW() - INTERVAL '30 days' THEN o.customer_id END) as active_cust,
      COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as pend_orders,
      COALESCE(SUM(CASE WHEN o.status = 'completed'
        AND EXTRACT(MONTH FROM o.created_at) = EXTRACT(MONTH FROM NOW())
        AND EXTRACT(YEAR FROM o.created_at) = EXTRACT(YEAR FROM NOW())
        THEN o.total_amount ELSE 0 END), 0) as month_rev
    FROM orders o
  ),
  pass_stats AS (
    SELECT COALESCE(SUM(oi.quantity), 0) as total_sold
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'completed'
  ),
  business_stats AS (
    SELECT COUNT(*) as total_bus
    FROM businesses
    WHERE status = 'active'
  ),
  support_stats AS (
    SELECT COUNT(*) as pend_supp
    FROM support_tickets
    WHERE status IN ('open', 'in_progress')
  )
  SELECT
    s.total_cust,
    s.active_cust,
    bs.total_bus,
    0::BIGINT as pending_applications,
    ps.total_sold,
    s.month_rev,
    s.pend_orders,
    ss.pend_supp
  FROM stats s
  CROSS JOIN pass_stats ps
  CROSS JOIN business_stats bs
  CROSS JOIN support_stats ss;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;

-- ============================================
-- 3. OPTIMIZE ANALYTICS FUNCTIONS
-- ============================================

-- Optimize get_sales_analytics with better aggregation
CREATE OR REPLACE FUNCTION get_sales_analytics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  period_length INTERVAL;
BEGIN
  period_length := end_date - start_date;

  -- Use single CTE for current and previous period
  WITH current_data AS (
    SELECT
      COALESCE(SUM(o.total_amount), 0) as revenue,
      COUNT(*) as orders,
      COALESCE(AVG(o.total_amount), 0) as avg_order
    FROM orders o
    WHERE o.status = 'completed'
      AND o.created_at >= start_date
      AND o.created_at <= end_date
  ),
  previous_data AS (
    SELECT
      COALESCE(SUM(o.total_amount), 0) as revenue
    FROM orders o
    WHERE o.status = 'completed'
      AND o.created_at >= (start_date - period_length)
      AND o.created_at < start_date
  ),
  pass_data AS (
    SELECT COALESCE(SUM(oi.quantity), 0) as passes_sold
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'completed'
      AND o.created_at >= start_date
      AND o.created_at <= end_date
  )
  SELECT json_build_object(
    'totalRevenue', cd.revenue,
    'totalOrders', cd.orders,
    'totalPassesSold', pd.passes_sold,
    'averageOrderValue', cd.avg_order,
    'revenueChange', CASE
      WHEN prev.revenue > 0 THEN
        ((cd.revenue - prev.revenue) / prev.revenue) * 100
      ELSE 0
    END
  ) INTO result
  FROM current_data cd
  CROSS JOIN previous_data prev
  CROSS JOIN pass_data pd;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. ADD CACHING TABLE FOR FREQUENTLY ACCESSED DATA
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  cache_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_key_expires ON analytics_cache(cache_key, expires_at);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- Function to get or refresh cache
CREATE OR REPLACE FUNCTION get_cached_analytics(
  cache_key_input TEXT,
  refresh_function TEXT,
  cache_duration_minutes INTEGER DEFAULT 15
)
RETURNS JSONB AS $$
DECLARE
  cached_result RECORD;
  fresh_data JSONB;
BEGIN
  -- Try to get from cache
  SELECT * INTO cached_result
  FROM analytics_cache
  WHERE cache_key = cache_key_input
    AND expires_at > NOW();

  -- Return if cache hit
  IF FOUND THEN
    RETURN cached_result.cache_data;
  END IF;

  -- Cache miss or expired - refresh
  EXECUTE 'SELECT ' || refresh_function INTO fresh_data;

  -- Update or insert cache
  INSERT INTO analytics_cache (cache_key, cache_data, expires_at)
  VALUES (cache_key_input, fresh_data, NOW() + (cache_duration_minutes || ' minutes')::INTERVAL)
  ON CONFLICT (cache_key)
  DO UPDATE SET
    cache_data = EXCLUDED.cache_data,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();

  RETURN fresh_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_cache
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. OPTIMIZE NOTIFICATION QUERIES
-- ============================================

-- Add function to get unread notifications efficiently
CREATE OR REPLACE FUNCTION get_admin_notifications_fast(
  admin_id_input UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  read BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    an.id,
    an.title,
    an.message,
    an.type,
    an.read,
    an.created_at
  FROM admin_notifications an
  WHERE (admin_id_input IS NULL OR an.admin_id = admin_id_input)
  ORDER BY an.read ASC, an.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. OPTIMIZE GET_CUSTOMER_ORDERS_SUMMARY
-- ============================================

CREATE OR REPLACE FUNCTION get_customer_orders_summary(customer_uuid UUID)
RETURNS TABLE (
  total_orders BIGINT,
  completed_orders BIGINT,
  pending_orders BIGINT,
  total_spent NUMERIC,
  active_passes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH order_stats AS (
    SELECT
      COUNT(o.id) as total_ord,
      COUNT(o.id) FILTER (WHERE o.status = 'completed') as completed_ord,
      COUNT(o.id) FILTER (WHERE o.status = 'pending') as pending_ord,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'completed'), 0) as spent
    FROM orders o
    WHERE o.customer_id = customer_uuid
  ),
  pass_stats AS (
    SELECT COUNT(pp.id) FILTER (WHERE pp.status = 'active') as active_p
    FROM purchased_passes pp
    WHERE pp.customer_id = customer_uuid
  )
  SELECT
    os.total_ord,
    os.completed_ord,
    os.pending_ord,
    os.spent,
    ps.active_p
  FROM order_stats os
  CROSS JOIN pass_stats ps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. OPTIMIZE PASS DETAILS FUNCTION
-- ============================================

-- Drop existing function if signature changed
DROP FUNCTION IF EXISTS get_pass_details(UUID);

CREATE OR REPLACE FUNCTION get_pass_details(pass_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Use single query with JSON aggregation instead of multiple queries
  SELECT json_build_object(
    'pass', to_jsonb(p.*),
    'pricing', COALESCE(
      (SELECT json_agg(to_jsonb(pp.*))
       FROM pass_pricing pp
       WHERE pp.pass_id = pass_uuid),
      '[]'::json
    ),
    'businesses', COALESCE(
      (SELECT json_agg(
        jsonb_build_object(
          'business', to_jsonb(b.*),
          'discount', pb.discount,
          'usage_type', pb.usage_type,
          'max_usage', pb.max_usage
        )
      )
      FROM pass_businesses pb
      JOIN businesses b ON b.id = pb.business_id
      WHERE pb.pass_id = pass_uuid),
      '[]'::json
    )
  ) INTO result
  FROM passes p
  WHERE p.id = pass_uuid;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. ADD QUERY PERFORMANCE MONITORING
-- ============================================

-- Log slow queries automatically
CREATE TABLE IF NOT EXISTS slow_query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  execution_time_ms NUMERIC NOT NULL,
  user_id UUID,
  endpoint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slow_query_log_created ON slow_query_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slow_query_log_execution ON slow_query_log(execution_time_ms DESC);

-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_query(
  query_text_input TEXT,
  execution_time_ms_input NUMERIC,
  endpoint_input TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Only log if execution time > 1000ms
  IF execution_time_ms_input > 1000 THEN
    INSERT INTO slow_query_log (query_text, execution_time_ms, user_id, endpoint)
    VALUES (query_text_input, execution_time_ms_input, auth.uid(), endpoint_input);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. OPTIMIZE VENUE VISIT STATS
-- ============================================

-- Drop existing function if signature changed
DROP FUNCTION IF EXISTS get_customer_visit_summary(UUID);

CREATE OR REPLACE FUNCTION get_customer_visit_summary(customer_uuid UUID)
RETURNS TABLE (
  total_visits BIGINT,
  unique_venues BIGINT,
  total_savings NUMERIC,
  favorite_category TEXT,
  last_visit_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH visit_stats AS (
    SELECT
      COUNT(*) as visits,
      COUNT(DISTINCT vv.business_id) as venues,
      COALESCE(SUM(vv.discount_amount), 0) as savings,
      MAX(vv.visit_date) as last_visit
    FROM venue_visits vv
    WHERE vv.customer_id = customer_uuid
      AND vv.status = 'completed'
  ),
  category_stats AS (
    SELECT b.category
    FROM venue_visits vv
    JOIN businesses b ON b.id = vv.business_id
    WHERE vv.customer_id = customer_uuid
      AND vv.status = 'completed'
    GROUP BY b.category
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT
    vs.visits,
    vs.venues,
    vs.savings,
    cs.category,
    vs.last_visit
  FROM visit_stats vs
  LEFT JOIN category_stats cs ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. CREATE HELPER FUNCTION FOR BATCH OPERATIONS
-- ============================================

-- Batch update orders (more efficient than individual updates)
CREATE OR REPLACE FUNCTION batch_update_order_status(
  order_ids UUID[],
  new_status TEXT
)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE orders
  SET status = new_status,
      updated_at = NOW()
  WHERE id = ANY(order_ids);

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE analytics_cache IS 'Cache table for expensive analytics queries';
COMMENT ON TABLE slow_query_log IS 'Log of slow queries for performance monitoring';
COMMENT ON FUNCTION get_cached_analytics IS 'Get analytics data with automatic caching';
COMMENT ON FUNCTION get_dashboard_stats IS 'Optimized dashboard statistics (single query)';
COMMENT ON FUNCTION get_sales_analytics IS 'Optimized sales analytics with CTE';
COMMENT ON FUNCTION batch_update_order_status IS 'Batch update order status for better performance';

-- ============================================
-- VACUUM AND ANALYZE
-- ============================================

-- Recommend running these after applying migration:
-- VACUUM ANALYZE orders;
-- VACUUM ANALYZE order_items;
-- VACUUM ANALYZE purchased_passes;
-- VACUUM ANALYZE venue_visits;
-- VACUUM ANALYZE support_tickets;
-- VACUUM ANALYZE admin_alerts;
