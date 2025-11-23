-- Debug: Check businesses count issue
-- Dashboard shows 4 but database has 16

-- Create a temporary debug function
CREATE OR REPLACE FUNCTION debug_businesses_count()
RETURNS TABLE (
  check_name TEXT,
  count_value BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Total businesses in DB'::TEXT,
    COUNT(*)
  FROM businesses

  UNION ALL

  SELECT
    'Active businesses (status=active)'::TEXT,
    COUNT(*)
  FROM businesses
  WHERE status = 'active'

  UNION ALL

  SELECT
    'Pending businesses (status=pending)'::TEXT,
    COUNT(*)
  FROM businesses
  WHERE status = 'pending'

  UNION ALL

  SELECT
    'Suspended businesses (status=suspended)'::TEXT,
    COUNT(*)
  FROM businesses
  WHERE status = 'suspended'

  UNION ALL

  SELECT
    'Other status businesses'::TEXT,
    COUNT(*)
  FROM businesses
  WHERE status NOT IN ('active', 'pending', 'suspended');
END;
$$ LANGUAGE plpgsql;

-- Run the debug function
SELECT * FROM debug_businesses_count();

-- Also test the get_dashboard_stats function directly
DO $$
DECLARE
  result RECORD;
BEGIN
  SELECT * INTO result FROM get_dashboard_stats();
  RAISE NOTICE 'Dashboard Stats - total_businesses: %', result.total_businesses;
  RAISE NOTICE 'Dashboard Stats - pending_applications: %', result.pending_applications;
END $$;
