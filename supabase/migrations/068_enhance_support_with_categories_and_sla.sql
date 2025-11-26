-- Migration 068: Enhanced Support System with Categories and SLA Tracking
-- Adds category filtering and Response SLA tracking to both business and customer support systems

-- =====================================================
-- 1. ADD CATEGORY TO BUSINESS SUPPORT_TICKETS
-- =====================================================

DO $$
BEGIN
  -- Add category column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_tickets' AND column_name = 'category'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN category TEXT CHECK (category IN ('technical', 'business', 'customer')) DEFAULT 'business';
    RAISE NOTICE 'Added category column to support_tickets';
  END IF;

  -- Add SLA tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_tickets' AND column_name = 'first_response_at'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN first_response_at TIMESTAMPTZ;
    RAISE NOTICE 'Added first_response_at column to support_tickets';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_tickets' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN resolved_at TIMESTAMPTZ;
    RAISE NOTICE 'Added resolved_at column to support_tickets';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_tickets' AND column_name = 'response_sla_minutes'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN response_sla_minutes INTEGER;
    RAISE NOTICE 'Added response_sla_minutes column to support_tickets';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_tickets' AND column_name = 'resolution_sla_minutes'
  ) THEN
    ALTER TABLE support_tickets ADD COLUMN resolution_sla_minutes INTEGER;
    RAISE NOTICE 'Added resolution_sla_minutes column to support_tickets';
  END IF;
END $$;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);

-- =====================================================
-- 2. ADD CATEGORY TO ORDER_SUPPORT_TICKETS
-- =====================================================

DO $$
BEGIN
  -- Add category column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_support_tickets' AND column_name = 'category'
  ) THEN
    ALTER TABLE order_support_tickets ADD COLUMN category TEXT CHECK (category IN ('technical', 'business', 'customer')) DEFAULT 'customer';
    RAISE NOTICE 'Added category column to order_support_tickets';
  END IF;

  -- Add first_response_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_support_tickets' AND column_name = 'first_response_at'
  ) THEN
    ALTER TABLE order_support_tickets ADD COLUMN first_response_at TIMESTAMPTZ;
    RAISE NOTICE 'Added first_response_at column to order_support_tickets';
  END IF;

  -- Add resolved_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_support_tickets' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE order_support_tickets ADD COLUMN resolved_at TIMESTAMPTZ;
    RAISE NOTICE 'Added resolved_at column to order_support_tickets';
  END IF;

  -- Add SLA tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_support_tickets' AND column_name = 'response_sla_minutes'
  ) THEN
    ALTER TABLE order_support_tickets ADD COLUMN response_sla_minutes INTEGER;
    RAISE NOTICE 'Added response_sla_minutes column to order_support_tickets';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_support_tickets' AND column_name = 'resolution_sla_minutes'
  ) THEN
    ALTER TABLE order_support_tickets ADD COLUMN resolution_sla_minutes INTEGER;
    RAISE NOTICE 'Added resolution_sla_minutes column to order_support_tickets';
  END IF;
END $$;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_order_support_tickets_category ON order_support_tickets(category);

-- =====================================================
-- 3. AUTO-UPDATE FIRST_RESPONSE_AT TRIGGER
-- =====================================================

-- Function to set first_response_at when admin responds (business support)
CREATE OR REPLACE FUNCTION set_business_support_first_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender = 'admin' THEN
    UPDATE support_tickets
    SET first_response_at = COALESCE(first_response_at, NOW())
    WHERE id = NEW.ticket_id AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set first_response_at when admin responds (customer support)
CREATE OR REPLACE FUNCTION set_customer_support_first_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'admin' THEN
    UPDATE order_support_tickets
    SET first_response_at = COALESCE(first_response_at, NOW())
    WHERE id = NEW.ticket_id AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on support_responses (business support)
DROP TRIGGER IF EXISTS support_responses_first_response ON support_responses;
CREATE TRIGGER support_responses_first_response
  AFTER INSERT ON support_responses
  FOR EACH ROW
  EXECUTE FUNCTION set_business_support_first_response();

-- Trigger on ticket_messages (customer support)
DROP TRIGGER IF EXISTS ticket_messages_first_response ON ticket_messages;
CREATE TRIGGER ticket_messages_first_response
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_support_first_response();

-- =====================================================
-- 4. AUTO-UPDATE RESOLVED_AT TRIGGER
-- =====================================================

-- Function to set resolved_at when ticket status changes to resolved
CREATE OR REPLACE FUNCTION set_support_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'support_tickets' AND NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, NOW());
  END IF;

  IF TG_TABLE_NAME = 'order_support_tickets' AND NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on support_tickets (business support)
DROP TRIGGER IF EXISTS support_tickets_resolved ON support_tickets;
CREATE TRIGGER support_tickets_resolved
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  WHEN (NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved')
  EXECUTE FUNCTION set_support_resolved_at();

-- Trigger on order_support_tickets (customer support)
DROP TRIGGER IF EXISTS order_support_tickets_resolved ON order_support_tickets;
CREATE TRIGGER order_support_tickets_resolved
  BEFORE UPDATE ON order_support_tickets
  FOR EACH ROW
  WHEN (NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved')
  EXECUTE FUNCTION set_support_resolved_at();

-- =====================================================
-- 5. SLA CALCULATION FUNCTIONS
-- =====================================================

-- Calculate Response SLA (time to first admin response)
CREATE OR REPLACE FUNCTION calculate_response_sla(
  p_created_at TIMESTAMPTZ,
  p_first_response_at TIMESTAMPTZ
)
RETURNS INTEGER AS $$
BEGIN
  IF p_first_response_at IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN EXTRACT(EPOCH FROM (p_first_response_at - p_created_at)) / 60;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate Resolution SLA (time to resolution)
CREATE OR REPLACE FUNCTION calculate_resolution_sla(
  p_created_at TIMESTAMPTZ,
  p_resolved_at TIMESTAMPTZ
)
RETURNS INTEGER AS $$
BEGIN
  IF p_resolved_at IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN EXTRACT(EPOCH FROM (p_resolved_at - p_created_at)) / 60;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 6. AUTO-UPDATE SLA METRICS TRIGGER
-- =====================================================

-- Function to calculate and store SLA metrics
CREATE OR REPLACE FUNCTION update_support_sla_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate response SLA
  IF NEW.first_response_at IS NOT NULL THEN
    NEW.response_sla_minutes := calculate_response_sla(NEW.created_at, NEW.first_response_at);
  END IF;

  -- Calculate resolution SLA
  IF NEW.resolved_at IS NOT NULL THEN
    NEW.resolution_sla_minutes := calculate_resolution_sla(NEW.created_at, NEW.resolved_at);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on support_tickets (business support)
DROP TRIGGER IF EXISTS support_tickets_sla_metrics ON support_tickets;
CREATE TRIGGER support_tickets_sla_metrics
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  WHEN (
    NEW.first_response_at IS DISTINCT FROM OLD.first_response_at OR
    NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
  )
  EXECUTE FUNCTION update_support_sla_metrics();

-- Trigger on order_support_tickets (customer support)
DROP TRIGGER IF EXISTS order_support_tickets_sla_metrics ON order_support_tickets;
CREATE TRIGGER order_support_tickets_sla_metrics
  BEFORE UPDATE ON order_support_tickets
  FOR EACH ROW
  WHEN (
    NEW.first_response_at IS DISTINCT FROM OLD.first_response_at OR
    NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
  )
  EXECUTE FUNCTION update_support_sla_metrics();

-- =====================================================
-- 7. SLA STATISTICS HELPER FUNCTIONS
-- =====================================================

-- Get average SLA metrics for business support
CREATE OR REPLACE FUNCTION get_business_support_sla_stats(
  p_category TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_tickets BIGINT,
  avg_response_time_minutes NUMERIC,
  avg_resolution_time_minutes NUMERIC,
  tickets_with_first_response BIGINT,
  tickets_resolved BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_tickets,
    AVG(st.response_sla_minutes) as avg_response_time_minutes,
    AVG(st.resolution_sla_minutes) as avg_resolution_time_minutes,
    COUNT(st.first_response_at) as tickets_with_first_response,
    COUNT(st.resolved_at) as tickets_resolved
  FROM support_tickets st
  WHERE
    st.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    AND (p_category IS NULL OR st.category = p_category)
    AND (p_priority IS NULL OR st.priority = p_priority);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get average SLA metrics for customer support
CREATE OR REPLACE FUNCTION get_customer_support_sla_stats(
  p_category TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_tickets BIGINT,
  avg_response_time_minutes NUMERIC,
  avg_resolution_time_minutes NUMERIC,
  tickets_with_first_response BIGINT,
  tickets_resolved BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_tickets,
    AVG(ost.response_sla_minutes) as avg_response_time_minutes,
    AVG(ost.resolution_sla_minutes) as avg_resolution_time_minutes,
    COUNT(ost.first_response_at) as tickets_with_first_response,
    COUNT(ost.resolved_at) as tickets_resolved
  FROM order_support_tickets ost
  WHERE
    ost.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    AND (p_category IS NULL OR ost.category = p_category)
    AND (p_priority IS NULL OR ost.priority = p_priority);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. UPDATE EXISTING TICKETS WITH DEFAULT CATEGORIES
-- =====================================================

-- Categorize existing business support tickets based on subject/priority
UPDATE support_tickets
SET category = CASE
  WHEN priority = 'high' THEN 'technical'
  WHEN subject ILIKE '%business%' OR subject ILIKE '%partnership%' THEN 'business'
  ELSE 'customer'
END
WHERE category IS NULL;

-- Categorize existing order support tickets based on issue_type
UPDATE order_support_tickets
SET category = CASE
  WHEN issue_type IN ('activation_issue', 'pass_not_working') THEN 'technical'
  WHEN issue_type IN ('billing_question') THEN 'business'
  ELSE 'customer'
END
WHERE category IS NULL;

-- Migration completed
DO $$
BEGIN
  RAISE NOTICE 'Migration 068 completed: Support System with Categories and SLA Tracking';
END $$;
