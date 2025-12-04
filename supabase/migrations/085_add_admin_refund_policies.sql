-- Migration 085: Add Admin RLS Policies for Refund Management
-- Allows admins to view and manage all refund requests

-- =====================================================
-- Admin policies for refund_requests
-- =====================================================

-- Admins can view all refund requests
DROP POLICY IF EXISTS "Admins can view all refund requests" ON refund_requests;
CREATE POLICY "Admins can view all refund requests"
  ON refund_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

-- Admins can update refund requests (approve, reject, complete)
DROP POLICY IF EXISTS "Admins can update refund requests" ON refund_requests;
CREATE POLICY "Admins can update refund requests"
  ON refund_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

-- =====================================================
-- Admin policies for order_support_tickets
-- =====================================================

-- Admins can view all support tickets
DROP POLICY IF EXISTS "Admins can view all support tickets" ON order_support_tickets;
CREATE POLICY "Admins can view all support tickets"
  ON order_support_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

-- Admins can update support tickets
DROP POLICY IF EXISTS "Admins can update support tickets" ON order_support_tickets;
CREATE POLICY "Admins can update support tickets"
  ON order_support_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

-- =====================================================
-- Admin policies for ticket_messages
-- =====================================================

-- Admins can view all ticket messages
DROP POLICY IF EXISTS "Admins can view all ticket messages" ON ticket_messages;
CREATE POLICY "Admins can view all ticket messages"
  ON ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

-- Admins can create ticket messages
DROP POLICY IF EXISTS "Admins can create ticket messages" ON ticket_messages;
CREATE POLICY "Admins can create ticket messages"
  ON ticket_messages FOR INSERT
  WITH CHECK (
    sender_type = 'admin'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

-- =====================================================
-- Verification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 085 completed: Admin RLS policies added';
  RAISE NOTICE 'Admins can now view and manage refund requests';
  RAISE NOTICE 'Admins can now view and manage support tickets';
END $$;
