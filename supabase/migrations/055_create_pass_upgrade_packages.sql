-- =====================================================
-- Pass Upgrade Packages System
-- =====================================================
-- Description: Admin-managed upgrade packages for pass upgrades
-- Date: 2025-01-25
-- =====================================================

-- ============================================
-- 1. UPGRADE PACKAGES TABLE
-- ============================================
-- Admin creates upgrade packages (e.g., "1-day to 3-day", "Basic to Premium")

CREATE TABLE IF NOT EXISTS upgrade_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Package Info
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,

  -- From/To Pass Configuration
  from_pass_id UUID REFERENCES passes(id) ON DELETE CASCADE,
  to_pass_id UUID NOT NULL REFERENCES passes(id) ON DELETE CASCADE,

  -- From pass can be NULL = upgrade from ANY pass to target pass
  -- If from_pass_id is set, it's a specific upgrade path

  -- Pricing
  upgrade_price NUMERIC NOT NULL CHECK (upgrade_price >= 0),
  discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),

  -- Final price calculation: upgrade_price - (upgrade_price * discount_percentage / 100)

  -- Additional Days/Benefits
  additional_days INTEGER DEFAULT 0 CHECK (additional_days >= 0), -- Extra days beyond normal pass duration
  features TEXT[] DEFAULT '{}', -- Special upgrade features

  -- Status
  status TEXT CHECK (status IN ('active', 'inactive', 'draft')) DEFAULT 'draft',
  featured BOOLEAN DEFAULT false,

  -- Display
  display_order INTEGER DEFAULT 0,
  badge_text TEXT, -- e.g., "BEST VALUE", "POPULAR", "LIMITED TIME"

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_upgrade_packages_status ON upgrade_packages(status);
CREATE INDEX IF NOT EXISTS idx_upgrade_packages_from_pass ON upgrade_packages(from_pass_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_packages_to_pass ON upgrade_packages(to_pass_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_packages_featured ON upgrade_packages(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_upgrade_packages_order ON upgrade_packages(display_order);

-- RLS
ALTER TABLE upgrade_packages ENABLE ROW LEVEL SECURITY;

-- Everyone can view active packages
CREATE POLICY "Public can view active upgrade packages"
  ON upgrade_packages FOR SELECT
  USING (status = 'active');

-- Admins can manage all packages
CREATE POLICY "Admins can manage upgrade packages"
  ON upgrade_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE TRIGGER upgrade_packages_updated_at
  BEFORE UPDATE ON upgrade_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 2. PASS UPGRADES TABLE
-- ============================================
-- Track customer pass upgrades

CREATE TABLE IF NOT EXISTS pass_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  original_pass_id UUID NOT NULL REFERENCES purchased_passes(id) ON DELETE CASCADE,
  upgraded_pass_id UUID REFERENCES purchased_passes(id) ON DELETE SET NULL,
  upgrade_package_id UUID REFERENCES upgrade_packages(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Upgrade Details
  original_pass_name TEXT NOT NULL,
  upgraded_pass_name TEXT NOT NULL,
  upgrade_price NUMERIC NOT NULL,

  -- Status
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')) DEFAULT 'pending',

  -- Metadata
  notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pass_upgrades_customer ON pass_upgrades(customer_id);
CREATE INDEX IF NOT EXISTS idx_pass_upgrades_original ON pass_upgrades(original_pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_upgrades_upgraded ON pass_upgrades(upgraded_pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_upgrades_status ON pass_upgrades(status);
CREATE INDEX IF NOT EXISTS idx_pass_upgrades_created_at ON pass_upgrades(created_at DESC);

-- RLS
ALTER TABLE pass_upgrades ENABLE ROW LEVEL SECURITY;

-- Customers can view their own upgrades
CREATE POLICY "Customers can view own upgrades"
  ON pass_upgrades FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can view all upgrades
CREATE POLICY "Admins can view all upgrades"
  ON pass_upgrades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Admins can update upgrades
CREATE POLICY "Admins can update upgrades"
  ON pass_upgrades FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE TRIGGER pass_upgrades_updated_at
  BEFORE UPDATE ON pass_upgrades
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 3. HELPER FUNCTIONS
-- ============================================

-- Get available upgrades for a customer's pass
CREATE OR REPLACE FUNCTION get_available_upgrades_for_pass(pass_uuid UUID)
RETURNS TABLE (
  package_id UUID,
  package_name TEXT,
  package_description TEXT,
  upgrade_price NUMERIC,
  final_price NUMERIC,
  discount_percentage INTEGER,
  to_pass_name TEXT,
  to_pass_description TEXT,
  additional_days INTEGER,
  features TEXT[],
  badge_text TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id as package_id,
    up.name as package_name,
    up.description as package_description,
    up.upgrade_price,
    (up.upgrade_price - (up.upgrade_price * up.discount_percentage / 100)) as final_price,
    up.discount_percentage,
    p.name as to_pass_name,
    p.description as to_pass_description,
    up.additional_days,
    up.features,
    up.badge_text
  FROM upgrade_packages up
  JOIN purchased_passes pp ON pp.id = pass_uuid
  JOIN passes from_pass ON from_pass.name = pp.pass_name
  JOIN passes p ON p.id = up.to_pass_id
  WHERE up.status = 'active'
    AND (up.from_pass_id = from_pass.id OR up.from_pass_id IS NULL)
    AND pp.status = 'active'
    AND pp.expiry_date > NOW()
  ORDER BY up.display_order ASC, up.featured DESC, up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get upgrade statistics
CREATE OR REPLACE FUNCTION get_upgrade_stats()
RETURNS TABLE (
  total_upgrades BIGINT,
  completed_upgrades BIGINT,
  pending_upgrades BIGINT,
  total_revenue NUMERIC,
  avg_upgrade_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_upgrades,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_upgrades,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_upgrades,
    COALESCE(SUM(upgrade_price) FILTER (WHERE status = 'completed'), 0) as total_revenue,
    COALESCE(AVG(upgrade_price) FILTER (WHERE status = 'completed'), 0) as avg_upgrade_price
  FROM pass_upgrades;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. SAMPLE DATA
-- ============================================

-- Insert sample upgrade packages
DO $$
DECLARE
  welcome_pass_id UUID;
  premium_pass_id UUID;
BEGIN
  -- Get pass IDs
  SELECT id INTO welcome_pass_id FROM passes WHERE name = 'Istanbul Welcome Pass' LIMIT 1;
  SELECT id INTO premium_pass_id FROM passes WHERE name LIKE '%Premium%' OR name LIKE '%Food%' LIMIT 1;

  -- Only insert if we have passes
  IF welcome_pass_id IS NOT NULL AND premium_pass_id IS NOT NULL THEN
    INSERT INTO upgrade_packages (
      name,
      description,
      short_description,
      from_pass_id,
      to_pass_id,
      upgrade_price,
      discount_percentage,
      additional_days,
      features,
      status,
      featured,
      display_order,
      badge_text
    ) VALUES
    (
      'Upgrade to Premium Experience',
      'Upgrade your Welcome Pass to our Premium Pass with extended duration and exclusive benefits. Enjoy additional venues, priority access, and special discounts.',
      'Unlock premium features and benefits',
      welcome_pass_id,
      premium_pass_id,
      150.00,
      20,
      2,
      ARRAY['Priority customer support', 'Exclusive venue access', 'Extended validity', 'VIP treatment'],
      'active',
      true,
      1,
      'BEST VALUE'
    ),
    (
      'Quick Upgrade - 3 Day Extension',
      'Extend your current pass by 3 additional days. Perfect for travelers who want to explore more.',
      'Add 3 extra days to your pass',
      NULL, -- Works for any pass
      welcome_pass_id,
      75.00,
      10,
      3,
      ARRAY['3 extra days', 'Same benefits', 'Instant activation'],
      'active',
      false,
      2,
      'POPULAR'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE upgrade_packages IS 'Admin-managed upgrade packages for pass upgrades';
COMMENT ON TABLE pass_upgrades IS 'Track customer pass upgrade history';
COMMENT ON FUNCTION get_available_upgrades_for_pass IS 'Get available upgrade options for a purchased pass';
COMMENT ON FUNCTION get_upgrade_stats IS 'Get upgrade statistics for admin dashboard';
