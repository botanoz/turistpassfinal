-- Migration 066: Refund and Support Requests System
-- This migration creates tables and functions for handling refund requests and order-related support tickets

-- =====================================================
-- 1. REFUND REQUESTS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'refund_requests') THEN
    CREATE TABLE refund_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      -- Request info
      request_number TEXT UNIQUE NOT NULL, -- Format: REF-XXXXXX
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

      -- Refund details
      reason_type TEXT NOT NULL CHECK (reason_type IN (
        'not_as_described',
        'technical_issue',
        'duplicate_purchase',
        'changed_mind',
        'other'
      )),
      reason_text TEXT NOT NULL,
      requested_amount NUMERIC NOT NULL,

      -- Status tracking
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'under_review',
        'approved',
        'rejected',
        'completed',
        'cancelled'
      )),

      -- Admin handling
      assigned_to UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
      assigned_at TIMESTAMPTZ,
      reviewed_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      admin_notes TEXT,
      rejection_reason TEXT,

      -- Refund processing
      refund_method TEXT CHECK (refund_method IN ('original_payment', 'bank_transfer', 'store_credit')),
      refund_amount NUMERIC, -- Actual refund amount (may differ from requested)
      refund_processed_at TIMESTAMPTZ,
      refund_transaction_id TEXT,

      -- Timestamps
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_refund_requests_order ON refund_requests(order_id);
    CREATE INDEX idx_refund_requests_customer ON refund_requests(customer_id);
    CREATE INDEX idx_refund_requests_status ON refund_requests(status);
    CREATE INDEX idx_refund_requests_created ON refund_requests(created_at DESC);
    CREATE INDEX idx_refund_requests_assigned ON refund_requests(assigned_to) WHERE assigned_to IS NOT NULL;

    RAISE NOTICE 'Created refund_requests table';
  END IF;
END $$;

-- =====================================================
-- 2. ORDER SUPPORT TICKETS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_support_tickets') THEN
    CREATE TABLE order_support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      -- Ticket info
      ticket_number TEXT UNIQUE NOT NULL, -- Format: TKT-XXXXXX
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

      -- Issue details
      issue_type TEXT NOT NULL CHECK (issue_type IN (
        'activation_issue',
        'pass_not_working',
        'missing_benefits',
        'billing_question',
        'general_inquiry',
        'other'
      )),
      subject TEXT NOT NULL,
      description TEXT NOT NULL,

      -- Status tracking
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open',
        'in_progress',
        'waiting_customer',
        'resolved',
        'closed'
      )),
      priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

      -- Admin handling
      assigned_to UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
      assigned_at TIMESTAMPTZ,

      -- Resolution
      resolved_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
      resolved_at TIMESTAMPTZ,
      resolution_notes TEXT,

      -- Timestamps
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_reply_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_order_tickets_order ON order_support_tickets(order_id);
    CREATE INDEX idx_order_tickets_customer ON order_support_tickets(customer_id);
    CREATE INDEX idx_order_tickets_status ON order_support_tickets(status);
    CREATE INDEX idx_order_tickets_priority ON order_support_tickets(priority);
    CREATE INDEX idx_order_tickets_created ON order_support_tickets(created_at DESC);
    CREATE INDEX idx_order_tickets_assigned ON order_support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;

    RAISE NOTICE 'Created order_support_tickets table';
  END IF;
END $$;

-- =====================================================
-- 3. TICKET MESSAGES TABLE (for conversation history)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ticket_messages') THEN
    CREATE TABLE ticket_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      ticket_id UUID NOT NULL REFERENCES order_support_tickets(id) ON DELETE CASCADE,

      -- Message details
      sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin')),
      sender_id UUID NOT NULL, -- customer_id or admin_id
      message TEXT NOT NULL,

      -- Metadata
      is_internal BOOLEAN DEFAULT false, -- Internal admin notes
      attachments JSONB DEFAULT '[]'::jsonb,

      -- Timestamps
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id);
    CREATE INDEX idx_ticket_messages_created ON ticket_messages(created_at);

    RAISE NOTICE 'Created ticket_messages table';
  END IF;
END $$;

-- =====================================================
-- 4. FUNCTIONS
-- =====================================================

-- Generate refund request number
CREATE OR REPLACE FUNCTION generate_refund_request_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    new_number := 'REF-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM refund_requests WHERE request_number = new_number) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Generate support ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    new_number := 'TKT-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM order_support_tickets WHERE ticket_number = new_number) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS refund_requests_updated_at ON refund_requests;
CREATE TRIGGER refund_requests_updated_at
  BEFORE UPDATE ON refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS order_support_tickets_updated_at ON order_support_tickets;
CREATE TRIGGER order_support_tickets_updated_at
  BEFORE UPDATE ON order_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update ticket's last_reply_at when new message is added
CREATE OR REPLACE FUNCTION update_ticket_last_reply()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE order_support_tickets
  SET last_reply_at = NEW.created_at
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ticket_message_update_last_reply ON ticket_messages;
CREATE TRIGGER ticket_message_update_last_reply
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_last_reply();

-- Notify admins of new refund request
CREATE OR REPLACE FUNCTION notify_admins_new_refund()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Create notification for all admins with orders permission
  FOR admin_record IN
    SELECT id FROM admin_profiles
    WHERE (permissions->>'orders' = 'true' OR role = 'super_admin')
    AND is_active = true
  LOOP
    INSERT INTO admin_notifications (admin_id, type, title, message, metadata)
    VALUES (
      admin_record.id,
      'warning',
      'New Refund Request',
      format('New refund request %s for order %s', NEW.request_number,
        (SELECT order_number FROM orders WHERE id = NEW.order_id)),
      jsonb_build_object('refund_request_id', NEW.id, 'order_id', NEW.order_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_admins_new_refund_trigger ON refund_requests;
CREATE TRIGGER notify_admins_new_refund_trigger
  AFTER INSERT ON refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_refund();

-- Notify admins of new support ticket
CREATE OR REPLACE FUNCTION notify_admins_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Create notification for all admins with support permission
  FOR admin_record IN
    SELECT id FROM admin_profiles
    WHERE (permissions->>'support' = 'true' OR role = 'super_admin')
    AND is_active = true
  LOOP
    INSERT INTO admin_notifications (admin_id, type, title, message, metadata)
    VALUES (
      admin_record.id,
      'info',
      'New Support Ticket',
      format('New ticket %s: %s', NEW.ticket_number, NEW.subject),
      jsonb_build_object('ticket_id', NEW.id, 'order_id', NEW.order_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_admins_new_ticket_trigger ON order_support_tickets;
CREATE TRIGGER notify_admins_new_ticket_trigger
  AFTER INSERT ON order_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_ticket();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Refund Requests Policies
DROP POLICY IF EXISTS "Customers can view own refund requests" ON refund_requests;
CREATE POLICY "Customers can view own refund requests"
  ON refund_requests FOR SELECT
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can create refund requests" ON refund_requests;
CREATE POLICY "Customers can create refund requests"
  ON refund_requests FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Support Tickets Policies
DROP POLICY IF EXISTS "Customers can view own support tickets" ON order_support_tickets;
CREATE POLICY "Customers can view own support tickets"
  ON order_support_tickets FOR SELECT
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can create support tickets" ON order_support_tickets;
CREATE POLICY "Customers can create support tickets"
  ON order_support_tickets FOR INSERT
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own tickets (status only)" ON order_support_tickets;
CREATE POLICY "Customers can update own tickets (status only)"
  ON order_support_tickets FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Ticket Messages Policies
DROP POLICY IF EXISTS "Customers can view messages for own tickets" ON ticket_messages;
CREATE POLICY "Customers can view messages for own tickets"
  ON ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_support_tickets
      WHERE id = ticket_messages.ticket_id
      AND customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Customers can add messages to own tickets" ON ticket_messages;
CREATE POLICY "Customers can add messages to own tickets"
  ON ticket_messages FOR INSERT
  WITH CHECK (
    sender_type = 'customer'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM order_support_tickets
      WHERE id = ticket_messages.ticket_id
      AND customer_id = auth.uid()
    )
  );

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Get customer's refund requests with order details
CREATE OR REPLACE FUNCTION get_customer_refund_requests(p_customer_id UUID)
RETURNS TABLE (
  id UUID,
  request_number TEXT,
  order_number TEXT,
  reason_type TEXT,
  reason_text TEXT,
  requested_amount NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  refund_amount NUMERIC,
  refund_processed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rr.id,
    rr.request_number,
    o.order_number,
    rr.reason_type,
    rr.reason_text,
    rr.requested_amount,
    rr.status,
    rr.created_at,
    rr.reviewed_at,
    rr.rejection_reason,
    rr.refund_amount,
    rr.refund_processed_at
  FROM refund_requests rr
  JOIN orders o ON o.id = rr.order_id
  WHERE rr.customer_id = p_customer_id
  ORDER BY rr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer's support tickets
CREATE OR REPLACE FUNCTION get_customer_support_tickets(p_customer_id UUID)
RETURNS TABLE (
  id UUID,
  ticket_number TEXT,
  order_number TEXT,
  issue_type TEXT,
  subject TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  created_at TIMESTAMPTZ,
  last_reply_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  message_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ost.id,
    ost.ticket_number,
    o.order_number,
    ost.issue_type,
    ost.subject,
    ost.description,
    ost.status,
    ost.priority,
    ost.created_at,
    ost.last_reply_at,
    ost.resolved_at,
    (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = ost.id) as message_count
  FROM order_support_tickets ost
  JOIN orders o ON o.id = ost.order_id
  WHERE ost.customer_id = p_customer_id
  ORDER BY ost.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get ticket messages
CREATE OR REPLACE FUNCTION get_ticket_messages(p_ticket_id UUID, p_customer_id UUID)
RETURNS TABLE (
  id UUID,
  sender_type TEXT,
  sender_name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verify customer owns this ticket
  IF NOT EXISTS (
    SELECT 1 FROM order_support_tickets
    WHERE id = p_ticket_id AND customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    tm.id,
    tm.sender_type,
    CASE
      WHEN tm.sender_type = 'customer' THEN
        (SELECT first_name || ' ' || last_name FROM customer_profiles WHERE id = tm.sender_id)
      ELSE
        (SELECT name FROM admin_profiles WHERE id = tm.sender_id)
    END as sender_name,
    tm.message,
    tm.created_at
  FROM ticket_messages tm
  WHERE tm.ticket_id = p_ticket_id
  AND tm.is_internal = false
  ORDER BY tm.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration completed
DO $$
BEGIN
  RAISE NOTICE 'Migration 066 completed: Refund and Support Requests System';
END $$;
