-- =====================================================
-- FAZ 6: SETTINGS & CONFIGURATION SYSTEM
-- =====================================================
-- Description: Site-wide settings and configuration management
-- Dependencies: 001-008 migrations
-- Date: 2025-10-30
-- =====================================================

-- =====================================================
-- TABLE: settings
-- =====================================================
-- Key-value store for application settings

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Setting identification
  key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'site', 'email', 'payment', 'general'

  -- Value and metadata
  value TEXT,
  data_type TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'

  -- Display info
  label TEXT NOT NULL,
  description TEXT,
  placeholder TEXT,

  -- Validation
  is_required BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false, -- Can be accessed without auth

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_settings_category ON settings(category);
CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_public ON settings(is_public);

COMMENT ON TABLE settings IS 'System-wide configuration settings';
COMMENT ON COLUMN settings.key IS 'Unique identifier for the setting';
COMMENT ON COLUMN settings.category IS 'Category grouping: site, email, payment, general';
COMMENT ON COLUMN settings.data_type IS 'Data type for validation: string, number, boolean, json';
COMMENT ON COLUMN settings.is_public IS 'Whether setting can be accessed publicly (e.g., site name)';

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public users can only read public settings
CREATE POLICY "Public settings are viewable by everyone"
  ON settings FOR SELECT
  USING (is_public = true);

-- Admins can view all settings
CREATE POLICY "Admins can view all settings"
  ON settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

-- Only super admins can modify settings
CREATE POLICY "Super admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
        AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- Only super admins can insert settings
CREATE POLICY "Super admins can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- Only super admins can delete settings
CREATE POLICY "Super admins can delete settings"
  ON settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- =====================================================
-- TRIGGER: Update settings updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

COMMENT ON TRIGGER trigger_update_settings_updated_at ON settings IS 'Automatically updates updated_at timestamp';

-- =====================================================
-- FUNCTION: Get Settings by Category
-- =====================================================

CREATE OR REPLACE FUNCTION get_settings_by_category(setting_category TEXT)
RETURNS TABLE (
  key TEXT,
  value TEXT,
  data_type TEXT,
  label TEXT,
  description TEXT,
  placeholder TEXT,
  is_required BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.key,
    s.value,
    s.data_type,
    s.label,
    s.description,
    s.placeholder,
    s.is_required
  FROM settings s
  WHERE s.category = setting_category
  ORDER BY s.label;
END;
$$;

COMMENT ON FUNCTION get_settings_by_category(TEXT) IS 'Returns all settings for a specific category';

-- =====================================================
-- FUNCTION: Get Public Settings
-- =====================================================

CREATE OR REPLACE FUNCTION get_public_settings()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_object_agg(key, value)
    FROM settings
    WHERE is_public = true
  );
END;
$$;

COMMENT ON FUNCTION get_public_settings() IS 'Returns all public settings as JSON object';

-- =====================================================
-- DEFAULT SETTINGS DATA
-- =====================================================

-- Site Settings
INSERT INTO settings (key, category, value, data_type, label, description, placeholder, is_required, is_public) VALUES
  -- Basic Site Info
  ('site_name', 'site', 'TuristPass', 'string', 'Site Name', 'The name of your website', 'TuristPass', true, true),
  ('site_tagline', 'site', 'Discover Istanbul with Exclusive Passes', 'string', 'Site Tagline', 'Brief description of your site', 'Your tagline here', false, true),
  ('site_description', 'site', 'TuristPass offers exclusive tourist passes for Istanbul attractions, restaurants, and experiences.', 'string', 'Site Description', 'SEO meta description', 'Describe your site', false, true),
  ('site_url', 'site', 'https://turistpass.com', 'string', 'Site URL', 'Full URL of your website', 'https://example.com', true, true),

  -- Contact Information
  ('contact_email', 'site', 'info@turistpass.com', 'string', 'Contact Email', 'Main contact email address', 'info@example.com', true, true),
  ('support_email', 'site', 'support@turistpass.com', 'string', 'Support Email', 'Customer support email', 'support@example.com', true, true),
  ('contact_phone', 'site', '+90 212 123 4567', 'string', 'Contact Phone', 'Main phone number', '+90 XXX XXX XXXX', false, true),

  -- Social Media
  ('social_facebook', 'site', '', 'string', 'Facebook URL', 'Facebook page URL', 'https://facebook.com/yourpage', false, true),
  ('social_twitter', 'site', '', 'string', 'Twitter URL', 'Twitter profile URL', 'https://twitter.com/yourpage', false, true),
  ('social_instagram', 'site', '', 'string', 'Instagram URL', 'Instagram profile URL', 'https://instagram.com/yourpage', false, true),
  ('social_linkedin', 'site', '', 'string', 'LinkedIn URL', 'LinkedIn company page URL', 'https://linkedin.com/company/yourpage', false, true),

  -- Branding
  ('logo_url', 'site', '', 'string', 'Logo URL', 'Main logo image URL', 'https://example.com/logo.png', false, true),
  ('favicon_url', 'site', '', 'string', 'Favicon URL', 'Favicon image URL', 'https://example.com/favicon.ico', false, true)
ON CONFLICT (key) DO NOTHING;

-- Email Settings
INSERT INTO settings (key, category, value, data_type, label, description, placeholder, is_required, is_public) VALUES
  ('smtp_host', 'email', '', 'string', 'SMTP Host', 'SMTP server hostname', 'smtp.gmail.com', false, false),
  ('smtp_port', 'email', '587', 'number', 'SMTP Port', 'SMTP server port (usually 587 or 465)', '587', false, false),
  ('smtp_username', 'email', '', 'string', 'SMTP Username', 'SMTP authentication username', 'your-email@gmail.com', false, false),
  ('smtp_password', 'email', '', 'string', 'SMTP Password', 'SMTP authentication password (encrypted)', '••••••••', false, false),
  ('smtp_from_name', 'email', 'TuristPass', 'string', 'From Name', 'Sender name for outgoing emails', 'TuristPass', false, false),
  ('smtp_from_email', 'email', 'noreply@turistpass.com', 'string', 'From Email', 'Sender email address', 'noreply@example.com', false, false)
ON CONFLICT (key) DO NOTHING;

-- Payment Settings
INSERT INTO settings (key, category, value, data_type, label, description, placeholder, is_required, is_public) VALUES
  ('payment_enabled', 'payment', 'false', 'boolean', 'Enable Payments', 'Enable or disable payment processing', '', true, false),
  ('payment_provider', 'payment', 'stripe', 'string', 'Payment Provider', 'Primary payment provider (stripe, paypal)', 'stripe', false, false),
  ('payment_currency', 'payment', 'TRY', 'string', 'Currency', 'Default currency code (TRY, USD, EUR)', 'TRY', true, true),
  ('payment_test_mode', 'payment', 'true', 'boolean', 'Test Mode', 'Use test/sandbox mode for payments', '', true, false),

  -- Stripe
  ('stripe_public_key', 'payment', '', 'string', 'Stripe Publishable Key', 'Stripe publishable key (starts with pk_)', 'pk_test_...', false, false),
  ('stripe_secret_key', 'payment', '', 'string', 'Stripe Secret Key', 'Stripe secret key (starts with sk_)', 'sk_test_...', false, false),
  ('stripe_webhook_secret', 'payment', '', 'string', 'Stripe Webhook Secret', 'Stripe webhook signing secret', 'whsec_...', false, false)
ON CONFLICT (key) DO NOTHING;

-- General Settings
INSERT INTO settings (key, category, value, data_type, label, description, placeholder, is_required, is_public) VALUES
  ('timezone', 'general', 'Europe/Istanbul', 'string', 'Timezone', 'Default timezone for the application', 'Europe/Istanbul', true, true),
  ('date_format', 'general', 'DD/MM/YYYY', 'string', 'Date Format', 'Date display format', 'DD/MM/YYYY', true, true),
  ('time_format', 'general', '24h', 'string', 'Time Format', 'Time display format (12h or 24h)', '24h', true, true),
  ('language', 'general', 'tr', 'string', 'Default Language', 'Default language code (tr, en)', 'tr', true, true),
  ('items_per_page', 'general', '20', 'number', 'Items Per Page', 'Default pagination size', '20', true, false),
  ('enable_maintenance_mode', 'general', 'false', 'boolean', 'Maintenance Mode', 'Enable site-wide maintenance mode', '', false, false),
  ('maintenance_message', 'general', 'We are currently performing maintenance. Please check back soon.', 'string', 'Maintenance Message', 'Message shown during maintenance mode', '', false, false)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON settings TO authenticated;
GRANT SELECT ON settings TO anon;
GRANT EXECUTE ON FUNCTION get_settings_by_category(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_settings() TO anon;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test getting settings by category:
-- SELECT * FROM get_settings_by_category('site');
-- SELECT * FROM get_settings_by_category('email');
-- SELECT * FROM get_settings_by_category('payment');
-- SELECT * FROM get_settings_by_category('general');

-- Test getting public settings:
-- SELECT get_public_settings();

-- Count settings by category:
-- SELECT category, COUNT(*) FROM settings GROUP BY category;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Expected results:
-- ✅ 1 new table created (settings)
-- ✅ 2 functions created (get_settings_by_category, get_public_settings)
-- ✅ 1 trigger created (update_settings_updated_at)
-- ✅ 27 default settings inserted (13 site, 6 email, 7 payment, 7 general)
-- ✅ RLS policies configured
-- ✅ Permissions granted
