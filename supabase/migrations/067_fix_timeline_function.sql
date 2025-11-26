-- Fix for ambiguous column reference in get_order_timeline function
-- Run this if you already applied migration 067 and got the "column reference 'id' is ambiguous" error

CREATE OR REPLACE FUNCTION get_order_timeline(p_order_id UUID)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  title TEXT,
  description TEXT,
  metadata JSONB,
  actor_type TEXT,
  actor_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ote.id,
    ote.event_type,
    ote.title,
    ote.description,
    ote.metadata,
    ote.actor_type,
    CASE
      WHEN ote.actor_type = 'customer' AND ote.actor_id IS NOT NULL THEN
        (SELECT cp.first_name || ' ' || cp.last_name FROM customer_profiles cp WHERE cp.id = ote.actor_id)
      WHEN ote.actor_type = 'admin' AND ote.actor_id IS NOT NULL THEN
        (SELECT ap.name FROM admin_profiles ap WHERE ap.id = ote.actor_id)
      ELSE
        ote.actor_type
    END as actor_name,
    ote.created_at
  FROM order_timeline_events ote
  WHERE ote.order_id = p_order_id
  ORDER BY ote.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
