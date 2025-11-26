-- =====================================================
-- Notification Preferences System
-- =====================================================
-- Description: Customer notification settings and delivery tracking
-- Date: 2025-01-25
-- =====================================================

-- ============================================
-- 1. NOTIFICATION PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Email Notifications
  email_marketing BOOLEAN DEFAULT true, -- Promotional emails
  email_pass_updates BOOLEAN DEFAULT true, -- Pass expiration, renewals
  email_order_updates BOOLEAN DEFAULT true, -- Order confirmations, receipts
  email_venue_recommendations BOOLEAN DEFAULT true, -- Personalized venue suggestions
  email_special_offers BOOLEAN DEFAULT true, -- Special discounts and offers

  -- Push Notifications (for future mobile app)
  push_enabled BOOLEAN DEFAULT false,
  push_pass_reminders BOOLEAN DEFAULT true,
  push_nearby_venues BOOLEAN DEFAULT false,
  push_special_offers BOOLEAN DEFAULT true,

  -- SMS Notifications
  sms_enabled BOOLEAN DEFAULT false,
  sms_pass_expiry BOOLEAN DEFAULT false,
  sms_special_offers BOOLEAN DEFAULT false,

  -- In-App Notifications
  inapp_enabled BOOLEAN DEFAULT true,
  inapp_messages BOOLEAN DEFAULT true,
  inapp_announcements BOOLEAN DEFAULT true,

  -- Frequency Settings
  digest_frequency TEXT CHECK (digest_frequency IN ('realtime', 'daily', 'weekly', 'never')) DEFAULT 'weekly',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_customer ON notification_preferences(customer_id);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Customers can view their own preferences
CREATE POLICY "Customers can view own preferences"
  ON notification_preferences FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can update their own preferences
CREATE POLICY "Customers can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (customer_id = auth.uid());

-- Customers can insert their own preferences
CREATE POLICY "Customers can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Admins can view all preferences
CREATE POLICY "Admins can view all preferences"
  ON notification_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 2. NOTIFICATION LOG TABLE
-- ============================================
-- Track all notifications sent to customers

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Notification Details
  type TEXT CHECK (type IN ('email', 'sms', 'push', 'inapp')) NOT NULL,
  category TEXT CHECK (category IN ('marketing', 'transactional', 'reminder', 'recommendation', 'announcement')) NOT NULL,

  -- Content
  subject TEXT,
  message TEXT NOT NULL,

  -- Delivery
  status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'read')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Error Tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Related Entity (optional)
  related_entity_type TEXT, -- e.g., 'order', 'pass', 'venue'
  related_entity_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_customer ON notification_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(type);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_category ON notification_log(category);

-- RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Customers can view their own notification history
CREATE POLICY "Customers can view own notifications"
  ON notification_log FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can view all notification logs
CREATE POLICY "Admins can view all notification logs"
  ON notification_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- System can insert notifications (via service role)
CREATE POLICY "System can insert notifications"
  ON notification_log FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 3. AUTO-CREATE PREFERENCES ON CUSTOMER SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default notification preferences for new customer
  INSERT INTO notification_preferences (customer_id)
  VALUES (NEW.id)
  ON CONFLICT (customer_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_default_preferences_on_signup
  AFTER INSERT ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Get customer notification preferences
CREATE OR REPLACE FUNCTION get_notification_preferences(customer_uuid UUID)
RETURNS TABLE (
  email_marketing BOOLEAN,
  email_pass_updates BOOLEAN,
  email_order_updates BOOLEAN,
  email_venue_recommendations BOOLEAN,
  email_special_offers BOOLEAN,
  push_enabled BOOLEAN,
  push_pass_reminders BOOLEAN,
  push_nearby_venues BOOLEAN,
  push_special_offers BOOLEAN,
  sms_enabled BOOLEAN,
  sms_pass_expiry BOOLEAN,
  sms_special_offers BOOLEAN,
  inapp_enabled BOOLEAN,
  inapp_messages BOOLEAN,
  inapp_announcements BOOLEAN,
  digest_frequency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    np.email_marketing,
    np.email_pass_updates,
    np.email_order_updates,
    np.email_venue_recommendations,
    np.email_special_offers,
    np.push_enabled,
    np.push_pass_reminders,
    np.push_nearby_venues,
    np.push_special_offers,
    np.sms_enabled,
    np.sms_pass_expiry,
    np.sms_special_offers,
    np.inapp_enabled,
    np.inapp_messages,
    np.inapp_announcements,
    np.digest_frequency
  FROM notification_preferences np
  WHERE np.customer_id = customer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if customer should receive notification
CREATE OR REPLACE FUNCTION can_send_notification(
  customer_uuid UUID,
  notification_type TEXT, -- 'email', 'sms', 'push', 'inapp'
  notification_category TEXT -- 'marketing', 'transactional', etc.
)
RETURNS BOOLEAN AS $$
DECLARE
  can_send BOOLEAN := false;
BEGIN
  -- Transactional notifications always go through
  IF notification_category = 'transactional' THEN
    RETURN true;
  END IF;

  -- Check preferences based on type and category
  SELECT
    CASE
      WHEN notification_type = 'email' THEN
        CASE notification_category
          WHEN 'marketing' THEN email_marketing
          WHEN 'reminder' THEN email_pass_updates
          WHEN 'recommendation' THEN email_venue_recommendations
          ELSE email_special_offers
        END
      WHEN notification_type = 'sms' THEN
        sms_enabled AND (
          CASE notification_category
            WHEN 'reminder' THEN sms_pass_expiry
            ELSE sms_special_offers
          END
        )
      WHEN notification_type = 'push' THEN
        push_enabled AND (
          CASE notification_category
            WHEN 'reminder' THEN push_pass_reminders
            WHEN 'recommendation' THEN push_nearby_venues
            ELSE push_special_offers
          END
        )
      WHEN notification_type = 'inapp' THEN
        inapp_enabled AND (
          CASE notification_category
            WHEN 'announcement' THEN inapp_announcements
            ELSE inapp_messages
          END
        )
      ELSE false
    END INTO can_send
  FROM notification_preferences
  WHERE customer_id = customer_uuid;

  RETURN COALESCE(can_send, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get notification statistics
CREATE OR REPLACE FUNCTION get_notification_stats()
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_read BIGINT,
  total_failed BIGINT,
  delivery_rate NUMERIC,
  read_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read')) as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered' OR status = 'read') as total_delivered,
    COUNT(*) FILTER (WHERE status = 'read') as total_read,
    COUNT(*) FILTER (WHERE status = 'failed' OR status = 'bounced') as total_failed,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read')) > 0
      THEN (COUNT(*) FILTER (WHERE status IN ('delivered', 'read'))::NUMERIC /
            COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read', 'failed', 'bounced'))::NUMERIC * 100)
      ELSE 0
    END as delivery_rate,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('delivered', 'read')) > 0
      THEN (COUNT(*) FILTER (WHERE status = 'read')::NUMERIC /
            COUNT(*) FILTER (WHERE status IN ('delivered', 'read'))::NUMERIC * 100)
      ELSE 0
    END as read_rate
  FROM notification_log
  WHERE created_at > NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. CREATE DEFAULT PREFERENCES FOR EXISTING CUSTOMERS
-- ============================================

-- Create preferences for all existing customers who don't have them
INSERT INTO notification_preferences (customer_id)
SELECT id FROM customer_profiles
WHERE id NOT IN (SELECT customer_id FROM notification_preferences)
ON CONFLICT (customer_id) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE notification_preferences IS 'Customer notification preferences and settings';
COMMENT ON TABLE notification_log IS 'Track all notifications sent to customers';
COMMENT ON FUNCTION create_default_notification_preferences IS 'Auto-create default preferences for new customers';
COMMENT ON FUNCTION get_notification_preferences IS 'Get notification preferences for a customer';
COMMENT ON FUNCTION can_send_notification IS 'Check if a notification should be sent based on customer preferences';
COMMENT ON FUNCTION get_notification_stats IS 'Get notification delivery and read statistics';
