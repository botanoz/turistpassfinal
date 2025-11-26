-- =====================================================
-- Migration: Add User Preferences
-- =====================================================
-- Purpose: Add user preferences for language, currency, and notifications
-- Date: 2025-11-25
-- =====================================================

-- ============================================
-- 1. ADD PREFERENCES COLUMNS TO CUSTOMER_PROFILES
-- ============================================

-- Language preference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_profiles' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE customer_profiles ADD COLUMN preferred_language TEXT DEFAULT 'tr' CHECK (preferred_language IN ('tr', 'en', 'de'));
  END IF;
END $$;

-- Currency preference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_profiles' AND column_name = 'preferred_currency'
  ) THEN
    ALTER TABLE customer_profiles ADD COLUMN preferred_currency TEXT DEFAULT 'TRY' CHECK (preferred_currency IN ('TRY', 'USD', 'EUR', 'GBP', 'JPY'));
  END IF;
END $$;

-- Notification preferences (JSONB for flexibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE customer_profiles ADD COLUMN notification_preferences JSONB DEFAULT '{
      "email_marketing": true,
      "email_updates": true,
      "email_offers": true,
      "sms_marketing": false,
      "sms_reminders": true,
      "push_notifications": true
    }'::jsonb;
  END IF;
END $$;

-- Phone number (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE customer_profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_customer_language ON customer_profiles(preferred_language);
CREATE INDEX IF NOT EXISTS idx_customer_currency ON customer_profiles(preferred_currency);

-- ============================================
-- 3. HELPER FUNCTIONS
-- ============================================

-- Get user preferences
CREATE OR REPLACE FUNCTION get_user_preferences(p_user_id UUID)
RETURNS TABLE (
  preferred_language TEXT,
  preferred_currency TEXT,
  notification_preferences JSONB,
  phone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.preferred_language,
    cp.preferred_currency,
    cp.notification_preferences,
    cp.phone
  FROM customer_profiles cp
  WHERE cp.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
  p_user_id UUID,
  p_language TEXT DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_notifications JSONB DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE customer_profiles
  SET
    preferred_language = COALESCE(p_language, preferred_language),
    preferred_currency = COALESCE(p_currency, preferred_currency),
    notification_preferences = COALESCE(p_notifications, notification_preferences),
    phone = COALESCE(p_phone, phone),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. UPDATE EXISTING RECORDS WITH DEFAULTS
-- ============================================

-- Set default preferences for existing users
UPDATE customer_profiles
SET
  preferred_language = COALESCE(preferred_language, 'tr'),
  preferred_currency = COALESCE(preferred_currency, 'TRY'),
  notification_preferences = COALESCE(
    notification_preferences,
    '{
      "email_marketing": true,
      "email_updates": true,
      "email_offers": true,
      "sms_marketing": false,
      "sms_reminders": true,
      "push_notifications": true
    }'::jsonb
  )
WHERE preferred_language IS NULL
   OR preferred_currency IS NULL
   OR notification_preferences IS NULL;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN customer_profiles.preferred_language IS 'User preferred language (tr, en, de)';
COMMENT ON COLUMN customer_profiles.preferred_currency IS 'User preferred currency (TRY, USD, EUR, GBP, JPY)';
COMMENT ON COLUMN customer_profiles.notification_preferences IS 'User notification preferences (email, SMS, push)';
COMMENT ON COLUMN customer_profiles.phone IS 'User phone number for SMS notifications';
COMMENT ON FUNCTION get_user_preferences IS 'Get user preferences';
COMMENT ON FUNCTION update_user_preferences IS 'Update user preferences';
