-- Migration 067: Add Order Timeline System
-- This migration adds timeline tracking for orders to track: payment → confirmation → pass delivery → usage

-- =====================================================
-- 1. ADD TIMELINE COLUMNS TO ORDERS TABLE
-- =====================================================

DO $$
BEGIN
  -- Add confirmed_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'confirmed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN confirmed_at TIMESTAMPTZ;
    RAISE NOTICE 'Added confirmed_at column to orders';
  END IF;

  -- Add pass_delivered_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pass_delivered_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN pass_delivered_at TIMESTAMPTZ;
    RAISE NOTICE 'Added pass_delivered_at column to orders';
  END IF;

  -- Add first_used_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'first_used_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN first_used_at TIMESTAMPTZ;
    RAISE NOTICE 'Added first_used_at column to orders';
  END IF;

  -- Add cancelled_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN cancelled_at TIMESTAMPTZ;
    RAISE NOTICE 'Added cancelled_at column to orders';
  END IF;

  -- Add paid_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN paid_at TIMESTAMPTZ;
    RAISE NOTICE 'Added paid_at column to orders';
  END IF;
END $$;

-- =====================================================
-- 2. ORDER TIMELINE EVENTS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_timeline_events') THEN
    CREATE TABLE order_timeline_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

      -- Event details
      event_type TEXT NOT NULL CHECK (event_type IN (
        'order_created',
        'payment_pending',
        'payment_completed',
        'payment_failed',
        'order_confirmed',
        'pass_generated',
        'pass_delivered',
        'pass_activated',
        'first_usage',
        'order_completed',
        'order_cancelled',
        'refund_requested',
        'refund_approved',
        'refund_completed',
        'note_added'
      )),
      title TEXT NOT NULL,
      description TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,

      -- Actor (who triggered this event)
      actor_type TEXT CHECK (actor_type IN ('system', 'customer', 'admin', 'payment_gateway')),
      actor_id UUID, -- customer_id or admin_id if applicable

      -- Timestamps
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX idx_timeline_events_order ON order_timeline_events(order_id);
    CREATE INDEX idx_timeline_events_type ON order_timeline_events(event_type);
    CREATE INDEX idx_timeline_events_created ON order_timeline_events(created_at DESC);

    RAISE NOTICE 'Created order_timeline_events table';
  END IF;
END $$;

-- =====================================================
-- 3. AUTO-CREATE TIMELINE EVENTS ON STATUS CHANGES
-- =====================================================

-- Function to automatically create timeline events
CREATE OR REPLACE FUNCTION create_order_timeline_event()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  event_desc TEXT;
  event_type TEXT;
BEGIN
  -- Detect what changed and create appropriate event

  -- Payment status changed to completed
  IF (TG_OP = 'UPDATE' AND OLD.payment_status != NEW.payment_status AND NEW.payment_status = 'completed' AND NEW.paid_at IS NULL) THEN
    NEW.paid_at := NOW();
    event_type := 'payment_completed';
    event_title := 'Payment Completed';
    event_desc := 'Payment has been successfully processed';

    INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
    VALUES (NEW.id, event_type, event_title, event_desc, 'payment_gateway');
  END IF;

  -- Payment status changed to failed
  IF (TG_OP = 'UPDATE' AND OLD.payment_status != NEW.payment_status AND NEW.payment_status = 'failed') THEN
    event_type := 'payment_failed';
    event_title := 'Payment Failed';
    event_desc := 'Payment processing failed';

    INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
    VALUES (NEW.id, event_type, event_title, event_desc, 'payment_gateway');
  END IF;

  -- Order confirmed
  IF (TG_OP = 'UPDATE' AND OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL) THEN
    event_type := 'order_confirmed';
    event_title := 'Order Confirmed';
    event_desc := 'Order has been confirmed and is being processed';

    INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
    VALUES (NEW.id, event_type, event_title, event_desc, 'system');
  END IF;

  -- Pass delivered
  IF (TG_OP = 'UPDATE' AND OLD.pass_delivered_at IS NULL AND NEW.pass_delivered_at IS NOT NULL) THEN
    event_type := 'pass_delivered';
    event_title := 'Pass Delivered';
    event_desc := 'Digital pass has been delivered to customer';

    INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
    VALUES (NEW.id, event_type, event_title, event_desc, 'system');
  END IF;

  -- Order completed
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' AND NEW.completed_at IS NULL) THEN
    NEW.completed_at := NOW();
    event_type := 'order_completed';
    event_title := 'Order Completed';
    event_desc := 'Order has been completed successfully';

    INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
    VALUES (NEW.id, event_type, event_title, event_desc, 'system');
  END IF;

  -- Order cancelled
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL) THEN
    NEW.cancelled_at := NOW();
    event_type := 'order_cancelled';
    event_title := 'Order Cancelled';
    event_desc := 'Order has been cancelled';

    INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
    VALUES (NEW.id, event_type, event_title, event_desc, 'system');
  END IF;

  -- Order refunded
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'refunded' AND NEW.refunded_at IS NULL) THEN
    NEW.refunded_at := NOW();
    event_type := 'refund_completed';
    event_title := 'Refund Completed';
    event_desc := 'Order has been refunded';

    INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
    VALUES (NEW.id, event_type, event_title, event_desc, 'system');
  END IF;

  -- First usage
  IF (TG_OP = 'UPDATE' AND OLD.first_used_at IS NULL AND NEW.first_used_at IS NOT NULL) THEN
    event_type := 'first_usage';
    event_title := 'First Usage';
    event_desc := 'Pass has been used for the first time';

    INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
    VALUES (NEW.id, event_type, event_title, event_desc, 'customer');
  END IF;

  -- Order created
  IF (TG_OP = 'INSERT') THEN
    event_type := 'order_created';
    event_title := 'Order Created';
    event_desc := format('Order %s created', NEW.order_number);

    INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type, actor_id)
    VALUES (NEW.id, event_type, event_title, event_desc, 'customer', NEW.customer_id);

    -- If payment is pending, add that event too
    IF NEW.payment_status = 'pending' THEN
      INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
      VALUES (NEW.id, 'payment_pending', 'Payment Pending', 'Waiting for payment confirmation', 'system');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS order_timeline_trigger ON orders;
CREATE TRIGGER order_timeline_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_order_timeline_event();

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Get order timeline
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

-- Get order current status with timeline info
CREATE OR REPLACE FUNCTION get_order_status_info(p_order_id UUID)
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  status TEXT,
  payment_status TEXT,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  pass_delivered_at TIMESTAMPTZ,
  first_used_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  timeline_completion_percent INTEGER
) AS $$
DECLARE
  completion_count INTEGER := 0;
  total_steps INTEGER := 5; -- payment, confirmation, delivery, usage, completion
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.status,
    o.payment_status,
    o.created_at,
    o.paid_at,
    o.confirmed_at,
    o.pass_delivered_at,
    o.first_used_at,
    o.completed_at,
    o.cancelled_at,
    o.refunded_at,
    -- Calculate completion percentage
    (
      (CASE WHEN o.paid_at IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN o.confirmed_at IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN o.pass_delivered_at IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN o.first_used_at IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN o.completed_at IS NOT NULL THEN 1 ELSE 0 END)
    ) * 100 / total_steps as timeline_completion_percent
  FROM orders o
  WHERE o.id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manually add timeline event (for admin notes, etc.)
CREATE OR REPLACE FUNCTION add_order_timeline_event(
  p_order_id UUID,
  p_event_type TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_actor_type TEXT DEFAULT 'system',
  p_actor_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_event_id UUID;
BEGIN
  INSERT INTO order_timeline_events (
    order_id,
    event_type,
    title,
    description,
    metadata,
    actor_type,
    actor_id
  ) VALUES (
    p_order_id,
    p_event_type,
    p_title,
    p_description,
    p_metadata,
    p_actor_type,
    p_actor_id
  )
  RETURNING id INTO new_event_id;

  RETURN new_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE order_timeline_events ENABLE ROW LEVEL SECURITY;

-- Customers can view timeline for their own orders
DROP POLICY IF EXISTS "Customers can view own order timeline" ON order_timeline_events;
CREATE POLICY "Customers can view own order timeline"
  ON order_timeline_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_timeline_events.order_id
      AND customer_id = auth.uid()
    )
  );

-- Admins can view all timelines
DROP POLICY IF EXISTS "Admins can view all order timelines" ON order_timeline_events;
CREATE POLICY "Admins can view all order timelines"
  ON order_timeline_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

-- Admins can insert timeline events
DROP POLICY IF EXISTS "Admins can insert timeline events" ON order_timeline_events;
CREATE POLICY "Admins can insert timeline events"
  ON order_timeline_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

-- Migration completed
DO $$
BEGIN
  RAISE NOTICE 'Migration 067 completed: Order Timeline System';
END $$;
