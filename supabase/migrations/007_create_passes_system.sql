-- Migration: Passes Management System
-- Description: Complete pass templates, pricing, and venue relationships
-- Date: 2025-10-29
-- FAZ: 4

-- ============================================
-- 1. VENUES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., "Historical", "Restaurant", "Museum", "Shopping"
  description TEXT,
  short_description TEXT,

  -- Location
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,

  -- Media
  image_url TEXT, -- Hybrid: URL or Supabase storage path
  gallery_images TEXT[], -- Array of image URLs

  -- Status
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venues_category ON venues(category);
CREATE INDEX IF NOT EXISTS idx_venues_status ON venues(status);
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);

-- RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Everyone can view active venues
CREATE POLICY "Public can view active venues"
  ON venues FOR SELECT
  USING (status = 'active');

-- Admins can manage all venues
CREATE POLICY "Admins can manage venues"
  ON venues FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE TRIGGER venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 2. PASSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,

  -- Status
  status TEXT CHECK (status IN ('active', 'inactive', 'draft')) DEFAULT 'draft',
  featured BOOLEAN DEFAULT false,
  popular BOOLEAN DEFAULT false,

  -- Features & Benefits
  features TEXT[] DEFAULT '{}', -- Array of key features
  benefits TEXT[] DEFAULT '{}', -- Array of benefits

  -- Homepage Content
  hero_title TEXT,
  hero_subtitle TEXT,
  about_content TEXT,

  -- Policy
  cancellation_policy TEXT,

  -- Media
  image_url TEXT, -- Hybrid: URL or Supabase storage path
  gallery_images TEXT[], -- Array of image URLs

  -- Analytics (calculated fields)
  total_sold INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_passes_status ON passes(status);
CREATE INDEX IF NOT EXISTS idx_passes_featured ON passes(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_passes_popular ON passes(popular) WHERE popular = true;
CREATE INDEX IF NOT EXISTS idx_passes_name ON passes(name);

-- RLS
ALTER TABLE passes ENABLE ROW LEVEL SECURITY;

-- Everyone can view active passes
CREATE POLICY "Public can view active passes"
  ON passes FOR SELECT
  USING (status = 'active');

-- Admins can manage all passes
CREATE POLICY "Admins can manage passes"
  ON passes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE TRIGGER passes_updated_at
  BEFORE UPDATE ON passes
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 3. PASS_PRICING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pass_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id UUID NOT NULL REFERENCES passes(id) ON DELETE CASCADE,

  -- Pricing Details
  days INTEGER NOT NULL CHECK (days > 0), -- Duration in days
  age_group TEXT NOT NULL CHECK (age_group IN ('adult', 'child', 'student', 'senior')),
  price NUMERIC NOT NULL CHECK (price >= 0),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: One price per pass/days/age_group combination
  UNIQUE(pass_id, days, age_group)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pass_pricing_pass ON pass_pricing(pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_pricing_days ON pass_pricing(days);
CREATE INDEX IF NOT EXISTS idx_pass_pricing_age_group ON pass_pricing(age_group);

-- RLS
ALTER TABLE pass_pricing ENABLE ROW LEVEL SECURITY;

-- Everyone can view pricing for active passes
CREATE POLICY "Public can view pass pricing"
  ON pass_pricing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM passes p
      WHERE p.id = pass_pricing.pass_id
        AND p.status = 'active'
    )
  );

-- Admins can manage all pricing
CREATE POLICY "Admins can manage pass pricing"
  ON pass_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- ============================================
-- 4. PASS_VENUES TABLE (Many-to-Many)
-- ============================================

CREATE TABLE IF NOT EXISTS pass_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id UUID NOT NULL REFERENCES passes(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,

  -- Venue-specific settings
  discount INTEGER NOT NULL DEFAULT 10 CHECK (discount >= 0 AND discount <= 100), -- Percentage
  usage_type TEXT NOT NULL CHECK (usage_type IN ('once', 'unlimited', 'limited')) DEFAULT 'once',
  max_usage INTEGER CHECK (max_usage IS NULL OR max_usage > 0), -- Only if usage_type = 'limited'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: One relationship per pass/venue
  UNIQUE(pass_id, venue_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pass_venues_pass ON pass_venues(pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_venues_venue ON pass_venues(venue_id);

-- RLS
ALTER TABLE pass_venues ENABLE ROW LEVEL SECURITY;

-- Everyone can view venues for active passes
CREATE POLICY "Public can view pass venues"
  ON pass_venues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM passes p
      WHERE p.id = pass_venues.pass_id
        AND p.status = 'active'
    )
  );

-- Admins can manage all pass-venue relationships
CREATE POLICY "Admins can manage pass venues"
  ON pass_venues FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Get pass stats
CREATE OR REPLACE FUNCTION get_admin_passes_stats()
RETURNS TABLE (
  total_passes BIGINT,
  active_passes BIGINT,
  draft_passes BIGINT,
  total_sold BIGINT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_passes,
    COUNT(*) FILTER (WHERE status = 'active') as active_passes,
    COUNT(*) FILTER (WHERE status = 'draft') as draft_passes,
    COALESCE(SUM(total_sold), 0) as total_sold,
    COALESCE(SUM(total_revenue), 0) as total_revenue
  FROM passes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pass with full details (pricing + venues)
CREATE OR REPLACE FUNCTION get_pass_details(pass_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pass', row_to_json(p.*),
    'pricing', (
      SELECT json_agg(row_to_json(pp.*))
      FROM pass_pricing pp
      WHERE pp.pass_id = pass_uuid
    ),
    'venues', (
      SELECT json_agg(
        json_build_object(
          'venue', row_to_json(v.*),
          'discount', pv.discount,
          'usage_type', pv.usage_type,
          'max_usage', pv.max_usage
        )
      )
      FROM pass_venues pv
      JOIN venues v ON v.id = pv.venue_id
      WHERE pv.pass_id = pass_uuid
    )
  ) INTO result
  FROM passes p
  WHERE p.id = pass_uuid;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update pass analytics when order is completed
CREATE OR REPLACE FUNCTION update_pass_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- When an order is completed, update pass statistics
  IF NEW.status = 'completed' AND NEW.payment_status = 'completed' THEN
    -- Update pass stats based on order items
    UPDATE passes p
    SET
      total_sold = total_sold + oi.quantity,
      total_revenue = total_revenue + oi.total_price
    FROM order_items oi
    WHERE oi.order_id = NEW.id
      AND p.name = oi.pass_name; -- Match by name (denormalized)
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update pass analytics on order completion
CREATE TRIGGER update_pass_analytics_on_order
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND NEW.payment_status = 'completed')
  EXECUTE FUNCTION update_pass_analytics();

-- ============================================
-- 6. INSERT SAMPLE DATA
-- ============================================

-- Insert sample venues
INSERT INTO venues (id, name, category, description, short_description, address, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Hagia Sophia', 'Historical', 'Byzantine architectural marvel, museum and mosque', 'Iconic Byzantine building', 'Sultanahmet, Fatih, Istanbul', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Topkapi Palace', 'Historical', 'Ottoman palace and museum complex', 'Ottoman imperial palace', 'Cankurtaran, Fatih, Istanbul', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'Mikla Restaurant', 'Restaurant', 'Contemporary Turkish cuisine with Bosphorus views', 'Rooftop fine dining', 'Beyoğlu, Istanbul', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'Çiya Sofrası', 'Restaurant', 'Traditional Anatolian regional cuisine', 'Authentic Turkish food', 'Kadıköy, Istanbul', 'active'),
  ('00000000-0000-0000-0000-000000000005', 'Istanbul Modern', 'Museum', 'Contemporary art museum', 'Modern art gallery', 'Karaköy, Beyoğlu, Istanbul', 'active'),
  ('00000000-0000-0000-0000-000000000006', 'Galata Tower', 'Historical', 'Medieval stone tower with panoramic views', 'Iconic tower with views', 'Galata, Beyoğlu, Istanbul', 'active'),
  ('00000000-0000-0000-0000-000000000007', 'Grand Bazaar', 'Shopping', 'Historic covered market with 4000+ shops', 'World-famous bazaar', 'Beyazıt, Fatih, Istanbul', 'active'),
  ('00000000-0000-0000-0000-000000000008', 'Spice Bazaar', 'Shopping', 'Egyptian Bazaar with spices and Turkish delights', 'Spice and food market', 'Eminönü, Fatih, Istanbul', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample passes
DO $$
DECLARE
  pass1_id UUID;
  pass2_id UUID;
BEGIN
  -- Pass 1: Istanbul Welcome Pass
  INSERT INTO passes (id, name, description, short_description, status, featured, popular, features, benefits, hero_title, hero_subtitle, about_content, cancellation_policy, total_sold, total_revenue)
  VALUES (
    gen_random_uuid(),
    'Istanbul Welcome Pass',
    'Experience Istanbul''s top attractions with exclusive discounts and skip-the-line access to major historical sites.',
    'Top attractions with exclusive discounts',
    'active',
    true,
    true,
    ARRAY['Skip-the-line access', 'Free public transport', 'Audio guides included', 'Discounts at 50+ venues'],
    ARRAY['Save up to 40% on attractions', 'No booking fees', 'Flexible cancellation', 'Expert recommendations'],
    'Explore Istanbul Like Never Before',
    'Get access to 50+ attractions with one pass',
    'The Istanbul Welcome Pass is your ultimate companion for exploring Turkey''s largest city. With this pass, you''ll enjoy skip-the-line privileges at major historical sites, free access to public transportation, and exclusive discounts at restaurants, museums, and entertainment venues throughout the city.',
    'Free cancellation up to 24 hours before first use. Full refund guaranteed. After activation, refunds are not available but passes can be extended.',
    1247,
    249400
  )
  RETURNING id INTO pass1_id;

  -- Insert pricing for Pass 1
  INSERT INTO pass_pricing (pass_id, days, age_group, price) VALUES
    (pass1_id, 1, 'adult', 200),
    (pass1_id, 3, 'adult', 350),
    (pass1_id, 7, 'adult', 600),
    (pass1_id, 1, 'child', 150),
    (pass1_id, 3, 'child', 250);

  -- Insert venues for Pass 1
  INSERT INTO pass_venues (pass_id, venue_id, discount, usage_type, max_usage) VALUES
    (pass1_id, '00000000-0000-0000-0000-000000000001', 20, 'once', NULL),
    (pass1_id, '00000000-0000-0000-0000-000000000002', 20, 'once', NULL),
    (pass1_id, '00000000-0000-0000-0000-000000000005', 30, 'once', NULL),
    (pass1_id, '00000000-0000-0000-0000-000000000006', 15, 'once', NULL),
    (pass1_id, '00000000-0000-0000-0000-000000000007', 10, 'unlimited', NULL);

  -- Pass 2: Food & Beverage Pass
  INSERT INTO passes (id, name, description, short_description, status, featured, popular, features, benefits, hero_title, hero_subtitle, about_content, cancellation_policy, total_sold, total_revenue)
  VALUES (
    gen_random_uuid(),
    'Food & Beverage Pass',
    'Enjoy Istanbul''s culinary scene with special discounts at top restaurants and traditional eateries.',
    'Special discounts at top restaurants',
    'active',
    false,
    false,
    ARRAY['20% off at restaurants', 'Free welcome drink', 'Priority reservations', 'Culinary tour included', 'Traditional recipes booklet'],
    ARRAY['Taste authentic Turkish cuisine', 'Exclusive restaurant access', 'Expert food recommendations', 'No hidden fees'],
    'Taste the Flavors of Istanbul',
    'Exclusive access to Istanbul''s best restaurants',
    'The Food & Beverage Pass opens doors to Istanbul''s rich culinary heritage. Enjoy discounts at award-winning restaurants, traditional meyhanes, and hidden gems known only to locals. Each pass includes a complimentary culinary walking tour.',
    'Free cancellation up to 48 hours before first use. Full refund on unused passes. Active passes are non-refundable but transferable.',
    892,
    133800
  )
  RETURNING id INTO pass2_id;

  -- Insert pricing for Pass 2
  INSERT INTO pass_pricing (pass_id, days, age_group, price) VALUES
    (pass2_id, 3, 'adult', 150),
    (pass2_id, 7, 'adult', 250),
    (pass2_id, 14, 'adult', 400);

  -- Insert venues for Pass 2
  INSERT INTO pass_venues (pass_id, venue_id, discount, usage_type, max_usage) VALUES
    (pass2_id, '00000000-0000-0000-0000-000000000003', 25, 'once', NULL),
    (pass2_id, '00000000-0000-0000-0000-000000000004', 20, 'limited', 3),
    (pass2_id, '00000000-0000-0000-0000-000000000008', 15, 'unlimited', NULL);
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE venues IS 'Venues/locations that can be included in passes';
COMMENT ON TABLE passes IS 'Pass templates with configuration and content';
COMMENT ON TABLE pass_pricing IS 'Pricing options for passes (duration x age group)';
COMMENT ON TABLE pass_venues IS 'Many-to-many relationship between passes and venues with usage rules';
COMMENT ON FUNCTION get_admin_passes_stats IS 'Gets global pass statistics for admin dashboard';
COMMENT ON FUNCTION get_pass_details IS 'Gets complete pass details including pricing and venues';
COMMENT ON FUNCTION update_pass_analytics IS 'Updates pass statistics when orders are completed';
