-- Migration: Dashboard & Settings Tables
-- Description: Site settings and dashboard analytics support
-- Date: 2025-10-29
-- FAZ: 2

-- ============================================
-- 1. SITE SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('contact', 'footer', 'social', 'general')),
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES admin_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(category, key)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_settings_category ON site_settings(category);

-- RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (public)
CREATE POLICY "Public can read settings"
  ON site_settings FOR SELECT
  USING (true);

-- Only admins with settings permission can modify
CREATE POLICY "Admins can update settings"
  ON site_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
      AND ap.role IN ('super_admin', 'admin')
    )
  );

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- Insert default settings
INSERT INTO site_settings (category, key, value) VALUES
  ('contact', 'info', '{
    "email": "info@turistpass.com",
    "phone": "+90 212 123 4567",
    "address": "Istanbul, Turkey",
    "website": "https://turistpass.com"
  }'::jsonb),
  ('footer', 'content', '{
    "about": "TuristPass - Your gateway to exploring Istanbul",
    "copyright": "© 2024 TuristPass. All rights reserved.",
    "links": [
      {"label": "About Us", "href": "/about"},
      {"label": "Contact", "href": "/contact"},
      {"label": "Terms", "href": "/terms"},
      {"label": "Privacy", "href": "/privacy"}
    ]
  }'::jsonb),
  ('social', 'links', '{
    "instagram": "https://instagram.com/turistpass",
    "facebook": "https://facebook.com/turistpass",
    "twitter": "https://twitter.com/turistpass",
    "linkedin": ""
  }'::jsonb),
  ('general', 'site', '{
    "title": "TuristPass",
    "description": "Discover Istanbul with exclusive passes and discounts",
    "supportEmail": "support@turistpass.com",
    "businessEmail": "business@turistpass.com"
  }'::jsonb)
ON CONFLICT (category, key) DO NOTHING;

-- ============================================
-- 2. CUSTOMER PROFILES (for dashboard stats)
-- ============================================

CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  status TEXT CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
  joined_date DATE DEFAULT CURRENT_DATE,
  total_savings NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_status ON customer_profiles(status);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_joined_date ON customer_profiles(joined_date);

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON customer_profiles FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON customer_profiles FOR UPDATE
  USING (id = auth.uid());

-- Admins can view all customers
CREATE POLICY "Admins can view all customers"
  ON customer_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- ============================================
-- 3. CATEGORIES (for businesses and venues)
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, slug, icon, description, display_order) VALUES
  ('Restaurants', 'restaurants', '🍽️', 'Dining and restaurants', 1),
  ('Museums', 'museums', '🏛️', 'Museums and galleries', 2),
  ('Historical Sites', 'historical-sites', '🏰', 'Historical landmarks', 3),
  ('Entertainment', 'entertainment', '🎭', 'Shows and entertainment', 4),
  ('Shopping', 'shopping', '🛍️', 'Shopping centers and bazaars', 5),
  ('Tours', 'tours', '🚌', 'Guided tours', 6),
  ('Cafes', 'cafes', '☕', 'Cafes and coffee shops', 7),
  ('Spas', 'spas', '💆', 'Spa and wellness', 8)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public can read categories
CREATE POLICY "Public can read categories"
  ON categories FOR SELECT
  USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- ============================================
-- 4. DASHBOARD STATS FUNCTIONS
-- ============================================

-- Get dashboard stats (fast aggregate query)
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
    (SELECT COUNT(*) FROM customer_profiles) as total_customers,
    (SELECT COUNT(*) FROM customer_profiles WHERE status = 'active') as active_customers,
    CAST(0 AS BIGINT) as total_businesses, -- Will populate in FAZ 4
    CAST(0 AS BIGINT) as pending_applications,
    CAST(0 AS BIGINT) as total_passes_sold, -- Will populate in FAZ 5
    CAST(0 AS NUMERIC) as monthly_revenue,
    CAST(0 AS BIGINT) as pending_orders,
    CAST(0 AS BIGINT) as pending_support;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recent activity helper (will be populated as we add more tables)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT CHECK (user_type IN ('admin', 'customer', 'business')),
  user_id UUID,
  action TEXT NOT NULL,
  description TEXT,
  category TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_type, user_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view activity logs"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- System can insert logs (via service role)
CREATE POLICY "System can insert logs"
  ON activity_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE site_settings IS 'Global site settings (contact, footer, social, general)';
COMMENT ON TABLE customer_profiles IS 'Customer user profiles for dashboard stats';
COMMENT ON TABLE categories IS 'Business and venue categories';
COMMENT ON TABLE activity_logs IS 'System-wide activity logs for dashboard';
COMMENT ON FUNCTION get_dashboard_stats IS 'Fast dashboard statistics aggregation';
