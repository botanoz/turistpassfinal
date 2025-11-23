-- =====================================================
-- MIGRATION: Create Business Notifications System
-- Description: Creates business_notifications table for real-time business notifications
-- Date: 2025-11-17
-- =====================================================

-- 1) Create business_notifications table
CREATE TABLE IF NOT EXISTS business_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'alert', 'offer')),
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_business_notifications_business_id ON business_notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_business_notifications_read ON business_notifications(read);
CREATE INDEX IF NOT EXISTS idx_business_notifications_created_at ON business_notifications(created_at DESC);

-- 3) Enable RLS
ALTER TABLE business_notifications ENABLE ROW LEVEL SECURITY;

-- 4) RLS Policies
CREATE POLICY "Businesses can view their own notifications"
  ON business_notifications FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Businesses can update their own notifications"
  ON business_notifications FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert notifications for any business"
  ON business_notifications FOR INSERT
  WITH CHECK (true);

-- 5) Updated_at trigger
CREATE OR REPLACE FUNCTION update_business_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_business_notifications_updated_at
  BEFORE UPDATE ON business_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_business_notifications_updated_at();

-- 6) Function to create notification for a specific business
CREATE OR REPLACE FUNCTION create_business_notification(
  p_business_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_type TEXT,
  p_link TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO business_notifications (business_id, title, content, type, link)
  VALUES (p_business_id, p_title, p_content, p_type, p_link);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7) Trigger to notify business when their status changes to active
CREATE OR REPLACE FUNCTION notify_business_status_active()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    PERFORM create_business_notification(
      NEW.id,
      'Application Approved!',
      'Congratulations! Your business application has been approved. You can now start accepting TuristPass.',
      'success',
      '/business/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_business_active ON businesses;
CREATE TRIGGER trigger_notify_business_active
  AFTER INSERT OR UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION notify_business_status_active();

-- 8) Trigger to notify business when their status changes to rejected
CREATE OR REPLACE FUNCTION notify_business_status_rejected()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    PERFORM create_business_notification(
      NEW.id,
      'Application Not Approved',
      'Unfortunately, your business application was not approved. Please contact support for more information.',
      'alert',
      '/business/support'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_business_rejected ON businesses;
CREATE TRIGGER trigger_notify_business_rejected
  AFTER INSERT OR UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION notify_business_status_rejected();

-- 9) Trigger to notify business when they receive a new review
CREATE OR REPLACE FUNCTION notify_business_new_review()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id UUID;
BEGIN
  -- Get business_id from the review (assuming there's a business_id column)
  -- If reviews table has different structure, adjust accordingly
  v_business_id := NEW.business_id;

  IF v_business_id IS NOT NULL THEN
    PERFORM create_business_notification(
      v_business_id,
      'New Review Received',
      'You have received a new customer review. Check it out!',
      'info',
      '/business/reviews'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if business_reviews table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_reviews') THEN
    DROP TRIGGER IF EXISTS trigger_notify_business_new_review ON business_reviews;
    CREATE TRIGGER trigger_notify_business_new_review
      AFTER INSERT ON business_reviews
      FOR EACH ROW
      EXECUTE FUNCTION notify_business_new_review();
  END IF;
END $$;

-- 10) Trigger to notify business when admin responds to their support ticket
CREATE OR REPLACE FUNCTION notify_business_support_response()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id UUID;
  v_ticket_subject TEXT;
BEGIN
  -- Get business_id from support ticket
  SELECT st.business_id, st.subject
  INTO v_business_id, v_ticket_subject
  FROM support_tickets st
  WHERE st.id = NEW.ticket_id;

  -- Only notify if response is from admin
  IF NEW.sender = 'admin' AND v_business_id IS NOT NULL THEN
    PERFORM create_business_notification(
      v_business_id,
      'Support Ticket Updated',
      'Admin has responded to your support ticket: ' || COALESCE(v_ticket_subject, 'Support Request'),
      'info',
      '/business/support'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_business_support_response ON support_responses;
CREATE TRIGGER trigger_notify_business_support_response
  AFTER INSERT ON support_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_business_support_response();

GRANT EXECUTE ON FUNCTION create_business_notification TO authenticated;
