-- =====================================================
-- Update analytics & admin stats to be currency-aware
-- Adds target_currency parameter and converts mixed-currency
-- order amounts using currency_settings exchange rates.
-- Base currency = TRY (exchange_rate field is TRY per 1 unit)
-- =====================================================

-- Helper to resolve an order's currency code safely
-- (uses new currency_code column if exists, falls back to legacy currency)
CREATE OR REPLACE FUNCTION get_order_currency(p_currency_code TEXT, p_currency TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(NULLIF(p_currency_code, ''), NULLIF(p_currency, ''), 'TRY');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 1) Sales Analytics (with currency)
-- =====================================================
DROP FUNCTION IF EXISTS get_sales_analytics(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_sales_analytics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION get_sales_analytics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW(),
  target_currency TEXT DEFAULT 'TRY'
)
RETURNS JSON AS $$
DECLARE
  v_target TEXT := COALESCE(target_currency, 'TRY');
  v_total_revenue_try NUMERIC;
  v_total_orders BIGINT;
  v_total_passes BIGINT;
  v_prev_revenue_try NUMERIC;
BEGIN
  -- Aggregate revenue in base (TRY)
  SELECT COALESCE(SUM(convert_to_base(o.total_amount, get_order_currency(o.currency_code, o.currency))), 0)
  INTO v_total_revenue_try
  FROM orders o
  WHERE o.status = 'completed'
    AND o.created_at >= start_date
    AND o.created_at <= end_date;

  -- Order & pass counts
  SELECT COUNT(*) INTO v_total_orders
  FROM orders o
  WHERE o.status = 'completed'
    AND o.created_at >= start_date
    AND o.created_at <= end_date;

  SELECT COALESCE(SUM(oi.quantity), 0) INTO v_total_passes
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.status = 'completed'
    AND o.created_at >= start_date
    AND o.created_at <= end_date;

  -- Previous period revenue (TRY) for percentage change
  SELECT COALESCE(SUM(convert_to_base(o.total_amount, get_order_currency(o.currency_code, o.currency))), 0)
  INTO v_prev_revenue_try
  FROM orders o
  WHERE o.status = 'completed'
    AND o.created_at >= (start_date - (end_date - start_date))
    AND o.created_at < start_date;

  RETURN json_build_object(
    'totalRevenue', convert_price(v_total_revenue_try, v_target),
    'totalOrders', v_total_orders,
    'totalPassesSold', v_total_passes,
    'averageOrderValue', CASE WHEN v_total_orders > 0
      THEN convert_price(v_total_revenue_try, v_target) / v_total_orders
      ELSE 0 END,
    'revenueChange', CASE WHEN v_prev_revenue_try > 0
      THEN ((v_total_revenue_try - v_prev_revenue_try) / v_prev_revenue_try) * 100
      ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2) Revenue by date (with currency)
-- =====================================================
DROP FUNCTION IF EXISTS get_revenue_by_date(TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS get_revenue_by_date(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_revenue_by_date(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW(),
  interval_type TEXT DEFAULT 'day',
  target_currency TEXT DEFAULT 'TRY'
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
    END AS period,
    convert_price(COALESCE(SUM(convert_to_base(o.total_amount, get_order_currency(o.currency_code, o.currency))), 0), target_currency) AS revenue,
    COUNT(o.id) AS orders
  FROM orders o
  WHERE o.status = 'completed'
    AND o.created_at >= start_date
    AND o.created_at <= end_date
  GROUP BY period
  ORDER BY period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3) Top selling passes (currency-aware)
-- =====================================================
DROP FUNCTION IF EXISTS get_top_selling_passes(INT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_top_selling_passes(INT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION get_top_selling_passes(
  limit_count INT DEFAULT 10,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW(),
  target_currency TEXT DEFAULT 'TRY'
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
    p.id AS pass_id,
    p.name AS pass_name,
    COALESCE(SUM(oi.quantity), 0) AS total_sold,
    convert_price(
      COALESCE(SUM(convert_to_base(oi.unit_price * oi.quantity, get_order_currency(o.currency_code, o.currency))), 0),
      target_currency
    ) AS total_revenue,
    convert_price(
      COALESCE(AVG(convert_to_base(oi.unit_price, get_order_currency(o.currency_code, o.currency))), 0),
      target_currency
    ) AS average_price
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

-- =====================================================
-- 4) Customer insights (currency-aware totals)
-- =====================================================
DROP FUNCTION IF EXISTS get_customer_insights(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_customer_insights(TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION get_customer_insights(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW(),
  target_currency TEXT DEFAULT 'TRY'
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
        AND o.created_at >= start_date
        AND o.created_at <= end_date
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
          c.id AS customer_id,
          COALESCE(NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''), c.email, c.id::TEXT) AS customer_name,
          convert_price(COALESCE(SUM(convert_to_base(o.total_amount, get_order_currency(o.currency_code, o.currency))), 0), target_currency) AS total_spent,
          COUNT(o.id) AS order_count
        FROM customer_profiles c
        JOIN orders o ON c.id = o.customer_id
        WHERE o.status = 'completed'
          AND o.created_at >= start_date
          AND o.created_at <= end_date
        GROUP BY c.id, c.first_name, c.last_name, c.email
        ORDER BY total_spent DESC
        LIMIT 10
      ) AS customer_data
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5) Comprehensive analytics (currency-aware)
-- =====================================================
DROP FUNCTION IF EXISTS get_comprehensive_analytics(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS get_comprehensive_analytics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION get_comprehensive_analytics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW(),
  target_currency TEXT DEFAULT 'TRY'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'sales_analytics', get_sales_analytics(start_date, end_date, target_currency),
    'top_passes', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM get_top_selling_passes(10, start_date, end_date, target_currency) t
    ),
    'top_businesses', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM get_top_businesses(10) t
    ),
    'customer_insights', get_customer_insights(start_date, end_date, target_currency),
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

-- =====================================================
-- 6) Admin orders stats (currency-aware)
-- =====================================================
DROP FUNCTION IF EXISTS get_admin_orders_stats();
DROP FUNCTION IF EXISTS get_admin_orders_stats(TEXT);

CREATE OR REPLACE FUNCTION get_admin_orders_stats(
  target_currency TEXT DEFAULT 'TRY'
)
RETURNS TABLE (
  total_orders BIGINT,
  completed_orders BIGINT,
  pending_orders BIGINT,
  total_revenue NUMERIC,
  today_orders BIGINT,
  today_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH base_orders AS (
    SELECT
      o.*,
      get_order_currency(o.currency_code, o.currency) AS cur
    FROM orders o
  )
  SELECT
    COUNT(*) AS total_orders,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
    convert_price(COALESCE(SUM(convert_to_base(total_amount, cur)) FILTER (WHERE payment_status = 'completed'), 0), target_currency) AS total_revenue,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS today_orders,
    convert_price(COALESCE(SUM(convert_to_base(total_amount, cur)) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND payment_status = 'completed'), 0), target_currency) AS today_revenue
  FROM base_orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7) Grants
-- =====================================================
GRANT EXECUTE ON FUNCTION get_sales_analytics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_by_date(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_selling_passes(INT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_insights(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_comprehensive_analytics(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_orders_stats(TEXT) TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
