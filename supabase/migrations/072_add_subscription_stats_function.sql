-- =====================================================
-- Add Subscription Stats Function
-- =====================================================
-- Purpose: Get subscription statistics for admin dashboard
-- Date: 2025-01-26
-- =====================================================

CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_subs INTEGER;
  active_subs INTEGER;
  trial_subs INTEGER;
  cancelled_subs INTEGER;
  expired_subs INTEGER;
  mrr_total NUMERIC;
  by_plan_data JSON;
BEGIN
  -- Get basic stats
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*) FILTER (WHERE status = 'trial'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'expired'),
    COALESCE(SUM(price) FILTER (WHERE status = 'active'), 0)
  INTO total_subs, active_subs, trial_subs, cancelled_subs, expired_subs, mrr_total
  FROM business_subscriptions;

  -- Get by plan stats separately
  SELECT json_object_agg(
    bsp.name,
    json_build_object(
      'count', COUNT(bs.id),
      'revenue', COALESCE(SUM(bs.price), 0)
    )
  ) INTO by_plan_data
  FROM business_subscription_plans bsp
  LEFT JOIN business_subscriptions bs ON bs.plan_id = bsp.id AND bs.status = 'active'
  GROUP BY bsp.id, bsp.name;

  -- Build final result
  result := json_build_object(
    'total_subscriptions', total_subs,
    'active_subscriptions', active_subs,
    'trial_subscriptions', trial_subs,
    'cancelled_subscriptions', cancelled_subs,
    'expired_subscriptions', expired_subs,
    'total_mrr', mrr_total,
    'by_plan', COALESCE(by_plan_data, '{}'::json)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_subscription_stats IS 'Get subscription statistics for admin dashboard';
