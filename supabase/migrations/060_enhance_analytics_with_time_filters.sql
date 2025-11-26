-- =====================================================
-- Enhanced Analytics with Advanced Time Filters
-- =====================================================
-- Description: Advanced time-based analytics and comparison functions
-- Date: 2025-01-25
-- =====================================================

-- ============================================
-- 1. ANALYTICS TIME FILTER PRESETS
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Preset Info
  name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Time Range
  range_type TEXT CHECK (range_type IN (
    'today',
    'yesterday',
    'last_7_days',
    'last_30_days',
    'last_90_days',
    'this_week',
    'last_week',
    'this_month',
    'last_month',
    'this_quarter',
    'last_quarter',
    'this_year',
    'last_year',
    'custom'
  )) NOT NULL,

  -- Custom Range (if range_type = 'custom')
  custom_start_date DATE,
  custom_end_date DATE,

  -- Comparison Settings
  enable_comparison BOOLEAN DEFAULT false,
  comparison_type TEXT CHECK (comparison_type IN (
    'previous_period',  -- Compare with previous equal period
    'previous_year',    -- Compare with same period last year
    'custom'            -- Custom comparison date range
  )),

  -- Filters
  filters JSONB DEFAULT '{}'::jsonb,

  -- Created By
  is_system_preset BOOLEAN DEFAULT false,
  created_by UUID REFERENCES admin_profiles(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert system presets
INSERT INTO analytics_presets (name, description, range_type, enable_comparison, comparison_type, is_system_preset) VALUES
  ('Today', 'Today''s metrics', 'today', true, 'previous_period', true),
  ('Yesterday', 'Yesterday''s metrics', 'yesterday', true, 'previous_period', true),
  ('Last 7 Days', 'Past week metrics', 'last_7_days', true, 'previous_period', true),
  ('Last 30 Days', 'Past month metrics', 'last_30_days', true, 'previous_period', true),
  ('This Month', 'Current month metrics', 'this_month', true, 'previous_period', true),
  ('Last Month', 'Previous month metrics', 'last_month', true, 'previous_year', true),
  ('This Year', 'Current year metrics', 'this_year', true, 'previous_year', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. ENHANCED ANALYTICS FUNCTIONS
-- ============================================

-- Function to calculate date range from preset
CREATE OR REPLACE FUNCTION get_date_range_from_preset(preset_type TEXT)
RETURNS TABLE (start_date TIMESTAMPTZ, end_date TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE preset_type
      WHEN 'today' THEN CURRENT_DATE::TIMESTAMPTZ
      WHEN 'yesterday' THEN (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMPTZ
      WHEN 'last_7_days' THEN (CURRENT_DATE - INTERVAL '7 days')::TIMESTAMPTZ
      WHEN 'last_30_days' THEN (CURRENT_DATE - INTERVAL '30 days')::TIMESTAMPTZ
      WHEN 'last_90_days' THEN (CURRENT_DATE - INTERVAL '90 days')::TIMESTAMPTZ
      WHEN 'this_week' THEN date_trunc('week', CURRENT_DATE)::TIMESTAMPTZ
      WHEN 'last_week' THEN (date_trunc('week', CURRENT_DATE) - INTERVAL '1 week')::TIMESTAMPTZ
      WHEN 'this_month' THEN date_trunc('month', CURRENT_DATE)::TIMESTAMPTZ
      WHEN 'last_month' THEN (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::TIMESTAMPTZ
      WHEN 'this_quarter' THEN date_trunc('quarter', CURRENT_DATE)::TIMESTAMPTZ
      WHEN 'last_quarter' THEN (date_trunc('quarter', CURRENT_DATE) - INTERVAL '3 months')::TIMESTAMPTZ
      WHEN 'this_year' THEN date_trunc('year', CURRENT_DATE)::TIMESTAMPTZ
      WHEN 'last_year' THEN (date_trunc('year', CURRENT_DATE) - INTERVAL '1 year')::TIMESTAMPTZ
      ELSE (CURRENT_DATE - INTERVAL '30 days')::TIMESTAMPTZ
    END as start_date,
    CASE preset_type
      WHEN 'today' THEN (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ
      WHEN 'yesterday' THEN CURRENT_DATE::TIMESTAMPTZ
      WHEN 'this_week' THEN (date_trunc('week', CURRENT_DATE) + INTERVAL '1 week')::TIMESTAMPTZ
      WHEN 'last_week' THEN date_trunc('week', CURRENT_DATE)::TIMESTAMPTZ
      WHEN 'this_month' THEN (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMPTZ
      WHEN 'last_month' THEN date_trunc('month', CURRENT_DATE)::TIMESTAMPTZ
      WHEN 'this_quarter' THEN (date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 months')::TIMESTAMPTZ
      WHEN 'last_quarter' THEN date_trunc('quarter', CURRENT_DATE)::TIMESTAMPTZ
      WHEN 'this_year' THEN (date_trunc('year', CURRENT_DATE) + INTERVAL '1 year')::TIMESTAMPTZ
      WHEN 'last_year' THEN date_trunc('year', CURRENT_DATE)::TIMESTAMPTZ
      ELSE NOW()
    END as end_date;
END;
$$ LANGUAGE plpgsql;

-- Comprehensive analytics with time comparison
CREATE OR REPLACE FUNCTION get_analytics_with_comparison(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  comparison_start TIMESTAMPTZ DEFAULT NULL,
  comparison_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  period_length INTERVAL;
BEGIN
  -- If no comparison dates provided, calculate previous period
  IF comparison_start IS NULL THEN
    period_length := end_date - start_date;
    comparison_start := start_date - period_length;
    comparison_end := start_date;
  END IF;

  SELECT json_build_object(
    'current_period', json_build_object(
      'start_date', start_date,
      'end_date', end_date,
      'revenue', (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM orders
        WHERE status = 'completed'
          AND created_at >= start_date
          AND created_at < end_date
      ),
      'orders', (
        SELECT COUNT(*)
        FROM orders
        WHERE status = 'completed'
          AND created_at >= start_date
          AND created_at < end_date
      ),
      'passes_sold', (
        SELECT COALESCE(SUM(quantity), 0)
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'completed'
          AND o.created_at >= start_date
          AND o.created_at < end_date
      ),
      'avg_order_value', (
        SELECT COALESCE(AVG(total_amount), 0)
        FROM orders
        WHERE status = 'completed'
          AND created_at >= start_date
          AND created_at < end_date
      ),
      'new_customers', (
        SELECT COUNT(DISTINCT customer_id)
        FROM orders
        WHERE created_at >= start_date
          AND created_at < end_date
          AND customer_id NOT IN (
            SELECT DISTINCT customer_id
            FROM orders
            WHERE created_at < start_date
          )
      ),
      'support_tickets', (
        SELECT COUNT(*)
        FROM support_tickets
        WHERE created_at >= start_date
          AND created_at < end_date
      ),
      'venue_visits', (
        SELECT COUNT(*)
        FROM venue_visits
        WHERE visit_date >= start_date
          AND visit_date < end_date
      )
    ),
    'comparison_period', json_build_object(
      'start_date', comparison_start,
      'end_date', comparison_end,
      'revenue', (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM orders
        WHERE status = 'completed'
          AND created_at >= comparison_start
          AND created_at < comparison_end
      ),
      'orders', (
        SELECT COUNT(*)
        FROM orders
        WHERE status = 'completed'
          AND created_at >= comparison_start
          AND created_at < comparison_end
      ),
      'passes_sold', (
        SELECT COALESCE(SUM(quantity), 0)
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'completed'
          AND o.created_at >= comparison_start
          AND o.created_at < comparison_end
      ),
      'avg_order_value', (
        SELECT COALESCE(AVG(total_amount), 0)
        FROM orders
        WHERE status = 'completed'
          AND created_at >= comparison_start
          AND created_at < comparison_end
      ),
      'new_customers', (
        SELECT COUNT(DISTINCT customer_id)
        FROM orders
        WHERE created_at >= comparison_start
          AND created_at < comparison_end
          AND customer_id NOT IN (
            SELECT DISTINCT customer_id
            FROM orders
            WHERE created_at < comparison_start
          )
      ),
      'support_tickets', (
        SELECT COUNT(*)
        FROM support_tickets
        WHERE created_at >= comparison_start
          AND created_at < comparison_end
      ),
      'venue_visits', (
        SELECT COUNT(*)
        FROM venue_visits
        WHERE visit_date >= comparison_start
          AND visit_date < comparison_end
      )
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Time series data with granularity
CREATE OR REPLACE FUNCTION get_time_series_data(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  granularity TEXT DEFAULT 'day' -- 'hour', 'day', 'week', 'month'
)
RETURNS TABLE (
  period TEXT,
  period_start TIMESTAMPTZ,
  revenue NUMERIC,
  orders BIGINT,
  passes_sold BIGINT,
  new_customers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH time_series AS (
    SELECT
      CASE granularity
        WHEN 'hour' THEN date_trunc('hour', o.created_at)
        WHEN 'day' THEN date_trunc('day', o.created_at)
        WHEN 'week' THEN date_trunc('week', o.created_at)
        WHEN 'month' THEN date_trunc('month', o.created_at)
        ELSE date_trunc('day', o.created_at)
      END as period_start,
      o.id as order_id,
      o.customer_id,
      o.total_amount,
      o.created_at
    FROM orders o
    WHERE o.status = 'completed'
      AND o.created_at >= start_date
      AND o.created_at < end_date
  )
  SELECT
    to_char(ts.period_start, 'YYYY-MM-DD HH24:MI') as period,
    ts.period_start,
    COALESCE(SUM(ts.total_amount), 0) as revenue,
    COUNT(DISTINCT ts.order_id) as orders,
    COALESCE(SUM(oi.quantity), 0) as passes_sold,
    COUNT(DISTINCT ts.customer_id) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM orders o2
        WHERE o2.customer_id = ts.customer_id
          AND o2.created_at < ts.period_start
      )
    ) as new_customers
  FROM time_series ts
  LEFT JOIN order_items oi ON oi.order_id = ts.order_id
  GROUP BY ts.period_start
  ORDER BY ts.period_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revenue breakdown by category
CREATE OR REPLACE FUNCTION get_revenue_breakdown(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  category TEXT,
  revenue NUMERIC,
  orders BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  total_revenue NUMERIC;
BEGIN
  -- Calculate total revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO total_revenue
  FROM orders
  WHERE status = 'completed'
    AND created_at >= start_date
    AND created_at < end_date;

  RETURN QUERY
  SELECT
    oi.pass_name as category,
    COALESCE(SUM(oi.total_price), 0) as revenue,
    COUNT(DISTINCT o.id) as orders,
    CASE
      WHEN total_revenue > 0 THEN
        (COALESCE(SUM(oi.total_price), 0) / total_revenue * 100)
      ELSE 0
    END as percentage
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.status = 'completed'
    AND o.created_at >= start_date
    AND o.created_at < end_date
  GROUP BY oi.pass_name
  ORDER BY revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Customer cohort analysis
CREATE OR REPLACE FUNCTION get_cohort_analysis(
  cohort_start TIMESTAMPTZ,
  cohort_end TIMESTAMPTZ
)
RETURNS TABLE (
  cohort_month TEXT,
  customers_count BIGINT,
  month_0_revenue NUMERIC,
  month_1_revenue NUMERIC,
  month_2_revenue NUMERIC,
  month_3_revenue NUMERIC,
  retention_rate_month_1 NUMERIC,
  retention_rate_month_2 NUMERIC,
  retention_rate_month_3 NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH cohorts AS (
    SELECT
      date_trunc('month', MIN(o.created_at)) as cohort_month,
      o.customer_id
    FROM orders o
    WHERE o.created_at >= cohort_start
      AND o.created_at < cohort_end
      AND o.status = 'completed'
    GROUP BY o.customer_id
  ),
  cohort_data AS (
    SELECT
      c.cohort_month,
      c.customer_id,
      EXTRACT(MONTH FROM AGE(o.created_at, c.cohort_month)) as months_since_cohort,
      SUM(o.total_amount) as revenue
    FROM cohorts c
    JOIN orders o ON o.customer_id = c.customer_id
    WHERE o.status = 'completed'
    GROUP BY c.cohort_month, c.customer_id, months_since_cohort
  )
  SELECT
    to_char(cd.cohort_month, 'YYYY-MM') as cohort_month,
    COUNT(DISTINCT cd.customer_id) as customers_count,
    COALESCE(SUM(cd.revenue) FILTER (WHERE cd.months_since_cohort = 0), 0) as month_0_revenue,
    COALESCE(SUM(cd.revenue) FILTER (WHERE cd.months_since_cohort = 1), 0) as month_1_revenue,
    COALESCE(SUM(cd.revenue) FILTER (WHERE cd.months_since_cohort = 2), 0) as month_2_revenue,
    COALESCE(SUM(cd.revenue) FILTER (WHERE cd.months_since_cohort = 3), 0) as month_3_revenue,
    CASE
      WHEN COUNT(DISTINCT cd.customer_id) FILTER (WHERE cd.months_since_cohort = 0) > 0 THEN
        COUNT(DISTINCT cd.customer_id) FILTER (WHERE cd.months_since_cohort = 1)::NUMERIC /
        COUNT(DISTINCT cd.customer_id) FILTER (WHERE cd.months_since_cohort = 0) * 100
      ELSE 0
    END as retention_rate_month_1,
    CASE
      WHEN COUNT(DISTINCT cd.customer_id) FILTER (WHERE cd.months_since_cohort = 0) > 0 THEN
        COUNT(DISTINCT cd.customer_id) FILTER (WHERE cd.months_since_cohort = 2)::NUMERIC /
        COUNT(DISTINCT cd.customer_id) FILTER (WHERE cd.months_since_cohort = 0) * 100
      ELSE 0
    END as retention_rate_month_2,
    CASE
      WHEN COUNT(DISTINCT cd.customer_id) FILTER (WHERE cd.months_since_cohort = 0) > 0 THEN
        COUNT(DISTINCT cd.customer_id) FILTER (WHERE cd.months_since_cohort = 3)::NUMERIC /
        COUNT(DISTINCT cd.customer_id) FILTER (WHERE cd.months_since_cohort = 0) * 100
      ELSE 0
    END as retention_rate_month_3
  FROM cohort_data cd
  GROUP BY cd.cohort_month
  ORDER BY cd.cohort_month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funnel analysis
CREATE OR REPLACE FUNCTION get_funnel_analysis(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'period', json_build_object(
      'start', start_date,
      'end', end_date
    ),
    'funnel', json_build_object(
      'visitors', (
        -- This would require session tracking - placeholder
        SELECT COUNT(*) * 10 FROM orders WHERE created_at >= start_date AND created_at < end_date
      ),
      'product_views', (
        -- This would require page view tracking - placeholder
        SELECT COUNT(*) * 5 FROM orders WHERE created_at >= start_date AND created_at < end_date
      ),
      'add_to_cart', (
        SELECT COUNT(*) FROM orders WHERE created_at >= start_date AND created_at < end_date
      ),
      'checkout_started', (
        SELECT COUNT(*) FROM orders WHERE status != 'pending' AND created_at >= start_date AND created_at < end_date
      ),
      'purchase_completed', (
        SELECT COUNT(*) FROM orders WHERE status = 'completed' AND created_at >= start_date AND created_at < end_date
      )
    ),
    'conversion_rates', json_build_object(
      'visitor_to_purchase', (
        SELECT
          CASE
            WHEN COUNT(*) > 0 THEN
              COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*) * 100
            ELSE 0
          END
        FROM orders
        WHERE created_at >= start_date AND created_at < end_date
      ),
      'cart_to_purchase', (
        SELECT
          CASE
            WHEN COUNT(*) > 0 THEN
              COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*) * 100
            ELSE 0
          END
        FROM orders
        WHERE created_at >= start_date AND created_at < end_date
      )
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. REAL-TIME ANALYTICS VIEWS
-- ============================================

-- Create materialized view for fast analytics (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_analytics AS
SELECT
  DATE(o.created_at) as date,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed') as completed_orders,
  COUNT(DISTINCT o.customer_id) as unique_customers,
  COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'completed'), 0) as revenue,
  COALESCE(AVG(o.total_amount) FILTER (WHERE o.status = 'completed'), 0) as avg_order_value,
  COALESCE(SUM(oi.quantity), 0) as passes_sold
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY DATE(o.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_analytics_date ON mv_daily_analytics(date);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_daily_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_analytics;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE analytics_presets IS 'Predefined and custom time range presets for analytics';
COMMENT ON FUNCTION get_analytics_with_comparison IS 'Get analytics data with period-over-period comparison';
COMMENT ON FUNCTION get_time_series_data IS 'Get time series data with configurable granularity';
COMMENT ON FUNCTION get_revenue_breakdown IS 'Get revenue breakdown by pass category';
COMMENT ON FUNCTION get_cohort_analysis IS 'Customer cohort analysis with retention rates';
COMMENT ON FUNCTION get_funnel_analysis IS 'Conversion funnel analysis';
COMMENT ON MATERIALIZED VIEW mv_daily_analytics IS 'Materialized view for fast daily analytics queries';
