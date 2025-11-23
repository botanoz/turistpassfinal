-- =====================================================
-- MIGRATION: Fix Customer Name in Analytics
-- =====================================================
-- Description: Fixes c.full_name to use first_name + last_name
-- Date: 2025-10-31
-- =====================================================

-- Drop and recreate get_customer_insights with correct column names
DROP FUNCTION IF EXISTS get_customer_insights(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_customer_insights(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'newCustomers', (
      SELECT COUNT(DISTINCT c.id)
      FROM customer_profiles c
      WHERE EXISTS (
        SELECT 1 FROM orders o
        WHERE o.customer_id = c.id
          AND o.status = 'completed'
          AND o.created_at >= start_date
          AND o.created_at <= end_date
      )
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
          COALESCE(
            NULLIF(CONCAT(c.first_name, ' ', c.last_name), ' '),
            c.email,
            'Unknown'
          ) as customer_name,
          COALESCE(SUM(o.total_amount), 0) as total_spent,
          COUNT(o.id) as order_count
        FROM customer_profiles c
        JOIN orders o ON c.id = o.customer_id
        WHERE o.status = 'completed'
          AND o.created_at >= start_date
          AND o.created_at <= end_date
        GROUP BY c.id, c.first_name, c.last_name, c.email
        ORDER BY total_spent DESC
        LIMIT 10
      ) as customer_data
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_customer_insights(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =====================================================
