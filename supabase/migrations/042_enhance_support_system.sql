-- =====================================================
-- MIGRATION: Enhance Support System Integration
-- Description: Adds admin RLS policies for support tables
--              and updates dashboard stats to count pending support.
-- Date: 2025-11-09
-- =====================================================

-- 1) Admin RLS Policies for support_tickets -------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_tickets'
      AND policyname = 'Admins can read all support tickets'
  ) THEN
    CREATE POLICY "Admins can read all support tickets"
      ON support_tickets FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM admin_profiles ap
          WHERE ap.id = auth.uid()
            AND ap.role IN ('super_admin', 'admin', 'support')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_tickets'
      AND policyname = 'Admins can update support tickets'
  ) THEN
    CREATE POLICY "Admins can update support tickets"
      ON support_tickets FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM admin_profiles ap
          WHERE ap.id = auth.uid()
            AND ap.role IN ('super_admin', 'admin', 'support')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM admin_profiles ap
          WHERE ap.id = auth.uid()
            AND ap.role IN ('super_admin', 'admin', 'support')
        )
      );
  END IF;
END $$;

-- 2) Admin RLS Policies for support_responses -----------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_responses'
      AND policyname = 'Admins can read all support responses'
  ) THEN
    CREATE POLICY "Admins can read all support responses"
      ON support_responses FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM admin_profiles ap
          WHERE ap.id = auth.uid()
            AND ap.role IN ('super_admin', 'admin', 'support')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_responses'
      AND policyname = 'Admins can insert support responses'
  ) THEN
    CREATE POLICY "Admins can insert support responses"
      ON support_responses FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM admin_profiles ap
          WHERE ap.id = auth.uid()
            AND ap.role IN ('super_admin', 'admin', 'support')
        )
      );
  END IF;
END $$;

-- 3) Update dashboard stats pending_support metric ------------------------
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
    (SELECT COUNT(DISTINCT customer_id)
       FROM orders
       WHERE status IN ('completed', 'processing', 'pending')) as total_customers,

    (SELECT COUNT(DISTINCT customer_id)
       FROM orders
       WHERE status = 'completed'
         AND created_at >= NOW() - INTERVAL '30 days') as active_customers,

    (SELECT COUNT(*)
       FROM businesses
       WHERE status = 'active') as total_businesses,

    (SELECT 0) as pending_applications,

    (SELECT COALESCE(SUM(oi.quantity), 0)
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status = 'completed') as total_passes_sold,

    (SELECT COALESCE(SUM(total_amount), 0)
       FROM orders
       WHERE status = 'completed'
         AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
         AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())) as monthly_revenue,

    (SELECT COUNT(*)
       FROM orders
       WHERE status = 'pending') as pending_orders,

    (SELECT COUNT(*)
       FROM support_tickets
       WHERE status IN ('open', 'in_progress')) as pending_support;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
