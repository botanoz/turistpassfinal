-- Analytics System Migration
-- Creates comprehensive analytics functions for sales, revenue, passes, businesses, and customers

-- ============================================
-- 0. Drop Existing Functions (if any)
-- ============================================
DROP FUNCTION IF EXISTS get_sales_analytics(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_revenue_by_date(TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS get_top_selling_passes(INT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_top_businesses(INT);
DROP FUNCTION IF EXISTS get_customer_insights(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_pass_category_distribution();
DROP FUNCTION IF EXISTS get_business_category_stats();
DROP FUNCTION IF EXISTS get_comprehensive_analytics(TIMESTAMPTZ, TIMESTAMPTZ);

-- ============================================
-- 1. Sales Analytics Function
-- ============================================
CREATE OR REPLACE FUNCTION get_sales_analytics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalRevenue', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM orders
      WHERE status = 'completed'
        AND created_at >= start_date
        AND created_at <= end_date
    ),
    'totalOrders', (
      SELECT COUNT(*)
      FROM orders
      WHERE status = 'completed'
        AND created_at >= start_date
        AND created_at <= end_date
    ),
    'totalPassesSold', (
      SELECT COALESCE(SUM(quantity), 0)
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed'
        AND o.created_at >= start_date
        AND o.created_at <= end_date
    ),
    'averageOrderValue', (
      SELECT COALESCE(AVG(total_amount), 0)
      FROM orders
      WHERE status = 'completed'
        AND created_at >= start_date
        AND created_at <= end_date
    ),
    'revenueChange', (
      WITH current_period AS (
        SELECT COALESCE(SUM(total_amount), 0) as current_revenue
        FROM orders
        WHERE status = 'completed'
          AND created_at >= start_date
          AND created_at <= end_date
      ),
      previous_period AS (
        SELECT COALESCE(SUM(total_amount), 0) as previous_revenue
        FROM orders
        WHERE status = 'completed'
          AND created_at >= (start_date - (end_date - start_date))
          AND created_at < start_date
      )
      SELECT CASE
        WHEN previous_period.previous_revenue > 0 THEN
          ((current_period.current_revenue - previous_period.previous_revenue) / previous_period.previous_revenue) * 100
        ELSE 0
      END as percentage
      FROM current_period, previous_period
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Revenue by Date Function
-- ============================================
CREATE OR REPLACE FUNCTION get_revenue_by_date(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW(),
  interval_type TEXT DEFAULT 'day'
)
RETURNS TABLE (
  period TEXT,
  revenue NUMERIC,
  orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN interval_type = 'day' THEN TO_CHAR(o.created_at, 'YYYY-MM-DD')
      WHEN interval_type = 'week' THEN TO_CHAR(DATE_TRUNC('week', o.created_at), 'YYYY-MM-DD')
      WHEN interval_type = 'month' THEN TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM')
      ELSE TO_CHAR(o.created_at, 'YYYY-MM-DD')
    END as period,
    COALESCE(SUM(o.total_amount), 0) as revenue,
    COUNT(o.id) as orders
  FROM orders o
  WHERE o.status = 'completed'
    AND o.created_at >= start_date
    AND o.created_at <= end_date
  GROUP BY period
  ORDER BY period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Top Selling Passes Function
-- ============================================
CREATE OR REPLACE FUNCTION get_top_selling_passes(
  limit_count INT DEFAULT 10,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  pass_id UUID,
  pass_name TEXT,
  total_sold BIGINT,
  total_revenue NUMERIC,
  average_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as pass_id,
    p.name as pass_name,
    COALESCE(SUM(oi.quantity), 0) as total_sold,
    COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
    COALESCE(AVG(oi.price), 0) as average_price
  FROM passes p
  LEFT JOIN order_items oi ON p.id = oi.pass_id
  LEFT JOIN orders o ON oi.order_id = o.id
  WHERE o.status = 'completed'
    AND o.created_at >= start_date
    AND o.created_at <= end_date
  GROUP BY p.id, p.name
  ORDER BY total_revenue DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Top Businesses Function
-- ============================================
CREATE OR REPLACE FUNCTION get_top_businesses(
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  pass_count BIGINT,
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id as business_id,
    b.name as business_name,
    COUNT(DISTINCT pb.pass_id) as pass_count,
    b.category as category
  FROM businesses b
  LEFT JOIN pass_businesses pb ON b.id = pb.business_id
  WHERE b.status = 'active'
  GROUP BY b.id, b.name, b.category
  ORDER BY pass_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Customer Insights Function
-- ============================================
CREATE OR REPLACE FUNCTION get_customer_insights(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'newCustomers', (
      SELECT COUNT(DISTINCT c.id)
      FROM customer_profiles c
      JOIN orders o ON c.id = o.customer_id
      WHERE o.status = 'completed'
        AND c.created_at >= start_date
        AND c.created_at <= end_date
        AND NOT EXISTS (
          SELECT 1 FROM orders o2
          WHERE o2.customer_id = c.id
            AND o2.status = 'completed'
            AND o2.created_at < start_date
        )
    ),
    'repeatCustomers', (
      SELECT COUNT(DISTINCT c.id)
      FROM customer_profiles c
      WHERE EXISTS (
        SELECT 1 FROM orders o
        WHERE o.customer_id = c.id
          AND o.status = 'completed'
          AND o.created_at >= start_date
          AND o.created_at <= end_date
      )
      AND EXISTS (
        SELECT 1 FROM orders o2
        WHERE o2.customer_id = c.id
          AND o2.status = 'completed'
          AND o2.created_at < start_date
      )
    ),
    'topCustomers', (
      SELECT COALESCE(json_agg(customer_data), '[]'::json)
      FROM (
        SELECT
          c.id as customer_id,
          COALESCE(c.full_name, c.email) as customer_name,
          COALESCE(SUM(o.total_amount), 0) as total_spent,
          COUNT(o.id) as order_count
        FROM customer_profiles c
        JOIN orders o ON c.id = o.customer_id
        WHERE o.status = 'completed'
          AND o.created_at >= start_date
          AND o.created_at <= end_date
        GROUP BY c.id, c.full_name, c.email
        ORDER BY total_spent DESC
        LIMIT 10
      ) as customer_data
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Pass Category Distribution Function
-- ============================================
CREATE OR REPLACE FUNCTION get_pass_category_distribution()
RETURNS TABLE (
  category TEXT,
  count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  total_passes BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_passes FROM passes WHERE status = 'active';

  RETURN QUERY
  SELECT
    CASE
      WHEN p.is_featured THEN 'Featured'
      WHEN p.is_popular THEN 'Popular'
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Business Category Stats Function
-- ============================================
CREATE OR REPLACE FUNCTION get_business_category_stats()
RETURNS TABLE (
  category TEXT,
  business_count BIGINT,
  avg_pass_count NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.category as category,
    COUNT(DISTINCT b.id) as business_count,
    COALESCE(AVG(pass_counts.count), 0) as avg_pass_count
  FROM businesses b
  LEFT JOIN (
    SELECT business_id, COUNT(*) as count
    FROM pass_businesses
    GROUP BY business_id
  ) pass_counts ON b.id = pass_counts.business_id
  WHERE b.status = 'active'
  GROUP BY b.category
  ORDER BY business_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Comprehensive Analytics Function
-- ============================================
CREATE OR REPLACE FUNCTION get_comprehensive_analytics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'sales_analytics', get_sales_analytics(start_date, end_date),
    'top_passes', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM get_top_selling_passes(10, start_date, end_date) t
    ),
    'top_businesses', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM get_top_businesses(10) t
    ),
    'customer_insights', get_customer_insights(start_date, end_date),
    'pass_category_distribution', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM get_pass_category_distribution() t
    ),
    'business_category_stats', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM get_business_category_stats() t
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Grant permissions to authenticated users
-- ============================================
GRANT EXECUTE ON FUNCTION get_sales_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_by_date TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_selling_passes TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_businesses TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_insights TO authenticated;
GRANT EXECUTE ON FUNCTION get_pass_category_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_category_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_comprehensive_analytics TO authenticated;
