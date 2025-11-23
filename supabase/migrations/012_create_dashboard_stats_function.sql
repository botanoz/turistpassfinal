-- Dashboard Stats Function
-- Creates function to get all dashboard statistics

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

    -- Pending business applications (if you have an applications table, otherwise 0)
    (SELECT 0) as pending_applications,

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

    -- Pending support (if you have a support_tickets table, otherwise 0)
    (SELECT 0) as pending_support;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;

-- Create activity_logs table if it doesn't exist (for recent activity)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'order', 'business', 'support', 'customer', 'system'
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all activity logs
CREATE POLICY activity_logs_admin_select ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

-- Policy: System can insert activity logs
CREATE POLICY activity_logs_insert ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
