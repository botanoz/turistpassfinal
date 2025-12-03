  -- =====================================================
  -- FIX: Order Timeline Trigger Timing Issue
  -- =====================================================
  -- Purpose: Fix foreign key violation when creating orders
  -- Error: "insert or update on table order_timeline_events violates
  --         foreign key constraint order_timeline_events_order_id_fkey"
  -- Cause: BEFORE INSERT trigger tries to create timeline events before
  --        the order row exists in the database
  -- Solution: Change trigger to AFTER INSERT for new orders
  -- Date: 2025-01-27
  -- =====================================================

  DO $$
  BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIXING ORDER TIMELINE TRIGGER TIMING';
    RAISE NOTICE '========================================';
  END $$;

  -- =====================================================
  -- 1. UPDATE TRIGGER FUNCTION
  -- =====================================================
  -- Split the logic: Use BEFORE for updates (to set timestamps),
  -- but handle INSERT separately to avoid FK violations

  CREATE OR REPLACE FUNCTION create_order_timeline_event()
  RETURNS TRIGGER AS $$
  DECLARE
    event_title TEXT;
    event_desc TEXT;
    event_type TEXT;
  BEGIN
    -- For INSERT operations, we'll handle this in the AFTER INSERT trigger
    -- to ensure the order exists before creating timeline events
    IF (TG_OP = 'INSERT') THEN
      RETURN NEW;
    END IF;

    -- For UPDATE operations, detect what changed and create appropriate event

    -- Payment status changed to completed
    IF (OLD.payment_status != NEW.payment_status AND NEW.payment_status = 'completed' AND NEW.paid_at IS NULL) THEN
      NEW.paid_at := NOW();
      event_type := 'payment_completed';
      event_title := 'Payment Completed';
      event_desc := 'Payment has been successfully processed';

      INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
      VALUES (NEW.id, event_type, event_title, event_desc, 'payment_gateway');
    END IF;

    -- Payment status changed to failed
    IF (OLD.payment_status != NEW.payment_status AND NEW.payment_status = 'failed') THEN
      event_type := 'payment_failed';
      event_title := 'Payment Failed';
      event_desc := 'Payment processing failed';

      INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
      VALUES (NEW.id, event_type, event_title, event_desc, 'payment_gateway');
    END IF;

    -- Order confirmed
    IF (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL) THEN
      event_type := 'order_confirmed';
      event_title := 'Order Confirmed';
      event_desc := 'Order has been confirmed and is being processed';

      INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
      VALUES (NEW.id, event_type, event_title, event_desc, 'system');
    END IF;

    -- Pass delivered
    IF (OLD.pass_delivered_at IS NULL AND NEW.pass_delivered_at IS NOT NULL) THEN
      event_type := 'pass_delivered';
      event_title := 'Pass Delivered';
      event_desc := 'Digital pass has been delivered to customer';

      INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
      VALUES (NEW.id, event_type, event_title, event_desc, 'system');
    END IF;

    -- Order completed
    IF (OLD.status != NEW.status AND NEW.status = 'completed' AND NEW.completed_at IS NULL) THEN
      NEW.completed_at := NOW();
      event_type := 'order_completed';
      event_title := 'Order Completed';
      event_desc := 'Order has been completed successfully';

      INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
      VALUES (NEW.id, event_type, event_title, event_desc, 'system');
    END IF;

    -- Order cancelled
    IF (OLD.status != NEW.status AND NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL) THEN
      NEW.cancelled_at := NOW();
      event_type := 'order_cancelled';
      event_title := 'Order Cancelled';
      event_desc := 'Order has been cancelled';

      INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
      VALUES (NEW.id, event_type, event_title, event_desc, 'system');
    END IF;

    -- Order refunded
    IF (OLD.status != NEW.status AND NEW.status = 'refunded' AND NEW.refunded_at IS NULL) THEN
      NEW.refunded_at := NOW();
      event_type := 'refund_completed';
      event_title := 'Refund Completed';
      event_desc := 'Order has been refunded';

      INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
      VALUES (NEW.id, event_type, event_title, event_desc, 'system');
    END IF;

    -- First usage
    IF (OLD.first_used_at IS NULL AND NEW.first_used_at IS NOT NULL) THEN
      event_type := 'first_usage';
      event_title := 'First Usage';
      event_desc := 'Pass has been used for the first time';

      INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
      VALUES (NEW.id, event_type, event_title, event_desc, 'customer');
    END IF;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- =====================================================
  -- 2. CREATE SEPARATE FUNCTION FOR INSERT EVENTS
  -- =====================================================
  -- This function runs AFTER INSERT to ensure the order exists

  CREATE OR REPLACE FUNCTION create_order_timeline_event_on_insert()
  RETURNS TRIGGER AS $$
  DECLARE
    event_title TEXT;
    event_desc TEXT;
  BEGIN
    -- Order created event
    event_title := 'Order Created';
    event_desc := format('Order %s created', NEW.order_number);

    INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type, actor_id)
    VALUES (NEW.id, 'order_created', event_title, event_desc, 'customer', NEW.customer_id);

    -- If payment is pending, add that event too
    IF NEW.payment_status = 'pending' THEN
      INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
      VALUES (NEW.id, 'payment_pending', 'Payment Pending', 'Waiting for payment confirmation', 'system');
    END IF;

    -- If payment is already completed (shouldn't happen, but handle it)
    IF NEW.payment_status = 'completed' THEN
      INSERT INTO order_timeline_events (order_id, event_type, title, description, actor_type)
      VALUES (NEW.id, 'payment_completed', 'Payment Completed', 'Payment has been successfully processed', 'payment_gateway');
    END IF;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- =====================================================
  -- 3. RECREATE TRIGGERS WITH CORRECT TIMING
  -- =====================================================

  -- Drop existing triggers
  DROP TRIGGER IF EXISTS order_timeline_trigger ON orders;
  DROP TRIGGER IF EXISTS order_timeline_insert_trigger ON orders;

  -- BEFORE trigger for UPDATE operations only (to set timestamps before saving)
  CREATE TRIGGER order_timeline_trigger
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_order_timeline_event();

  -- AFTER trigger for INSERT operations (to create timeline events after order exists)
  CREATE TRIGGER order_timeline_insert_trigger
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_order_timeline_event_on_insert();

  -- =====================================================
  -- 4. VERIFICATION
  -- =====================================================

  DO $$
  BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 074 COMPLETED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '- Split timeline trigger into two separate triggers';
    RAISE NOTICE '- BEFORE UPDATE trigger: Sets timestamps and creates events for updates';
    RAISE NOTICE '- AFTER INSERT trigger: Creates initial timeline events after order exists';
    RAISE NOTICE '- This prevents foreign key violations on order creation';
    RAISE NOTICE '';
    RAISE NOTICE 'Timeline event creation flow:';
    RAISE NOTICE '1. Order INSERT → Order saved to DB';
    RAISE NOTICE '2. AFTER INSERT trigger → Timeline events created (order exists)';
    RAISE NOTICE '3. Order UPDATE → BEFORE UPDATE trigger → Events created';
    RAISE NOTICE '';
    RAISE NOTICE 'The error "violates foreign key constraint" should now be fixed!';
    RAISE NOTICE '========================================';
  END $$;
