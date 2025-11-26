-- =====================================================
-- Venue Visits Tracking System
-- =====================================================
-- Description: Track customer visits to venues for history and analytics
-- Date: 2025-01-25
-- =====================================================

-- =====================================================
-- 0. SAFETY NETS FOR STANDALONE RUNS
-- =====================================================

-- Ensure required extension is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure dependency tables exist (lightweight definitions so the migration is runnable alone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_profiles'
  ) THEN
    CREATE TABLE customer_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT,
      first_name TEXT,
      last_name TEXT,
      status TEXT DEFAULT 'active',
      total_savings NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'businesses'
  ) THEN
    CREATE TABLE businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      short_description TEXT,
      address TEXT,
      latitude NUMERIC,
      longitude NUMERIC,
      image_url TEXT,
      gallery_images TEXT[],
      status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
    CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
    CREATE INDEX IF NOT EXISTS idx_businesses_name ON businesses(name);
    ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchased_passes'
  ) THEN
    CREATE TABLE purchased_passes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
      pass_name TEXT NOT NULL,
      pass_type TEXT,
      activation_code TEXT,
      pin_code TEXT,
      expiry_date TIMESTAMPTZ,
      status TEXT DEFAULT 'active',
      usage_count INTEGER DEFAULT 0,
      max_usage INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_purchased_passes_customer ON purchased_passes(customer_id);
  END IF;
END $$;

-- Provide a no-op updated_at trigger function if the base one is missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_site_settings_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
    RETURNS TRIGGER AS $upd$
    BEGIN
      RETURN NEW;
    END;
    $upd$ LANGUAGE plpgsql;
  END IF;
END $$;

-- ============================================
-- 1. VENUE VISITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS venue_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  purchased_pass_id UUID REFERENCES purchased_passes(id) ON DELETE SET NULL,

  -- Visit Details
  visit_date TIMESTAMPTZ DEFAULT NOW(),
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,

  -- Discount/Benefit Used
  discount_used INTEGER DEFAULT 0, -- Percentage discount applied
  discount_amount NUMERIC DEFAULT 0, -- Actual amount saved

  -- Visit Status
  status TEXT CHECK (status IN ('completed', 'cancelled', 'pending')) DEFAULT 'completed',

  -- Ratings & Feedback (optional)
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  would_recommend BOOLEAN,

  -- Metadata
  notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venue_visits_customer ON venue_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_venue_visits_business ON venue_visits(business_id);
CREATE INDEX IF NOT EXISTS idx_venue_visits_pass ON venue_visits(purchased_pass_id);
CREATE INDEX IF NOT EXISTS idx_venue_visits_date ON venue_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_venue_visits_status ON venue_visits(status);
CREATE INDEX IF NOT EXISTS idx_venue_visits_rating ON venue_visits(rating) WHERE rating IS NOT NULL;

-- RLS
ALTER TABLE venue_visits ENABLE ROW LEVEL SECURITY;

-- Customers can view their own visits
CREATE POLICY "Customers can view own visits"
  ON venue_visits FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can insert their own visits
CREATE POLICY "Customers can create own visits"
  ON venue_visits FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can update their own visits (ratings, reviews)
CREATE POLICY "Customers can update own visits"
  ON venue_visits FOR UPDATE
  USING (customer_id = auth.uid());

-- Admins can view all visits
CREATE POLICY "Admins can view all visits"
  ON venue_visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Admins can manage all visits
CREATE POLICY "Admins can manage all visits"
  ON venue_visits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Auto-update timestamp
DROP TRIGGER IF EXISTS venue_visits_updated_at ON venue_visits;
CREATE TRIGGER venue_visits_updated_at
  BEFORE UPDATE ON venue_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 2. PASS USAGE TRACKING (Enhance existing)
-- ============================================
-- Update purchased_passes usage when visit is created

CREATE OR REPLACE FUNCTION update_pass_usage_on_visit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if visit is completed and linked to a pass
  IF NEW.status = 'completed' AND NEW.purchased_pass_id IS NOT NULL THEN
    UPDATE purchased_passes
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = NEW.purchased_pass_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pass_usage_on_visit_trigger ON venue_visits;
CREATE TRIGGER update_pass_usage_on_visit_trigger
  AFTER INSERT ON venue_visits
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_pass_usage_on_visit();

-- ============================================
-- 3. HELPER FUNCTIONS
-- ============================================

-- Get customer visit history
CREATE OR REPLACE FUNCTION get_customer_visit_history(customer_uuid UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  visit_id UUID,
  business_id UUID,
  business_name TEXT,
  business_category TEXT,
  business_image_url TEXT,
  visit_date TIMESTAMPTZ,
  discount_used INTEGER,
  discount_amount NUMERIC,
  rating INTEGER,
  review TEXT,
  pass_name TEXT,
  pass_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vv.id as visit_id,
    b.id as business_id,
    b.name as business_name,
    b.category as business_category,
    b.image_url as business_image_url,
    vv.visit_date,
    vv.discount_used,
    vv.discount_amount,
    vv.rating,
    vv.review,
    pp.pass_name,
    pp.pass_type
  FROM venue_visits vv
  JOIN businesses b ON b.id = vv.business_id
  LEFT JOIN purchased_passes pp ON pp.id = vv.purchased_pass_id
  WHERE vv.customer_id = customer_uuid
    AND vv.status = 'completed'
  ORDER BY vv.visit_date DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get business visit statistics
CREATE OR REPLACE FUNCTION get_business_visit_stats(business_uuid UUID)
RETURNS TABLE (
  total_visits BIGINT,
  unique_visitors BIGINT,
  avg_rating NUMERIC,
  total_discount_given NUMERIC,
  recent_visits BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_visits,
    COUNT(DISTINCT customer_id) as unique_visitors,
    COALESCE(AVG(rating), 0) as avg_rating,
    COALESCE(SUM(discount_amount), 0) as total_discount_given,
    COUNT(*) FILTER (WHERE visit_date > NOW() - INTERVAL '30 days') as recent_visits
  FROM venue_visits
  WHERE business_id = business_uuid
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer visit summary
CREATE OR REPLACE FUNCTION get_customer_visit_summary(customer_uuid UUID)
RETURNS TABLE (
  total_visits BIGINT,
  unique_venues BIGINT,
  total_savings NUMERIC,
  favorite_category TEXT,
  last_visit_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_visits,
    COUNT(DISTINCT business_id) as unique_venues,
    COALESCE(SUM(discount_amount), 0) as total_savings,
    (
      SELECT b.category
      FROM venue_visits vv2
      JOIN businesses b ON b.id = vv2.business_id
      WHERE vv2.customer_id = customer_uuid
        AND vv2.status = 'completed'
      GROUP BY b.category
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as favorite_category,
    MAX(visit_date) as last_visit_date
  FROM venue_visits
  WHERE customer_id = customer_uuid
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get popular businesses (most visited)
CREATE OR REPLACE FUNCTION get_popular_venues(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  business_category TEXT,
  business_image_url TEXT,
  visit_count BIGINT,
  avg_rating NUMERIC,
  unique_visitors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id as business_id,
    b.name as business_name,
    b.category as business_category,
    b.image_url as business_image_url,
    COUNT(vv.id) as visit_count,
    COALESCE(AVG(vv.rating), 0) as avg_rating,
    COUNT(DISTINCT vv.customer_id) as unique_visitors
  FROM businesses b
  LEFT JOIN venue_visits vv ON vv.business_id = b.id AND vv.status = 'completed'
  WHERE b.status = 'active'
  GROUP BY b.id, b.name, b.category, b.image_url
  ORDER BY visit_count DESC, avg_rating DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. SAMPLE DATA
-- ============================================

-- Insert sample visits for existing customers
DO $$
DECLARE
  first_customer_id UUID;
  first_pass_id UUID;
  hagia_sophia_id UUID := '00000000-0000-0000-0000-000000000001';
  topkapi_id UUID := '00000000-0000-0000-0000-000000000002';
  mikla_id UUID := '00000000-0000-0000-0000-000000000003';
BEGIN
  -- Ensure sample venue rows exist so FK constraints are satisfied
  INSERT INTO businesses (id, name, category, status, short_description, image_url)
  VALUES
    (hagia_sophia_id, 'Hagia Sophia', 'Historical', 'active', 'Iconic landmark of Istanbul', NULL),
    (topkapi_id, 'Topkapi Palace', 'Historical', 'active', 'Ottoman palace and museum', NULL),
    (mikla_id, 'Mikla Restaurant', 'Restaurant', 'active', 'Fine dining with a view', NULL)
  ON CONFLICT (id) DO NOTHING;

  -- Get first customer and their first active pass
  SELECT id INTO first_customer_id FROM customer_profiles LIMIT 1;
  SELECT id INTO first_pass_id FROM purchased_passes WHERE customer_id = first_customer_id AND status = 'active' LIMIT 1;

  -- Only insert if we have customer and pass
  IF first_customer_id IS NOT NULL THEN
    -- Visit 1: Hagia Sophia
    INSERT INTO venue_visits (
      customer_id,
      business_id,
      purchased_pass_id,
      visit_date,
      discount_used,
      discount_amount,
      status,
      rating,
      review,
      would_recommend
    ) VALUES
    (
      first_customer_id,
      hagia_sophia_id,
      first_pass_id,
      NOW() - INTERVAL '5 days',
      20,
      15.00,
      'completed',
      5,
      'Absolutely stunning! The architecture is breathtaking. A must-visit in Istanbul.',
      true
    ),
    -- Visit 2: Topkapi Palace
    (
      first_customer_id,
      topkapi_id,
      first_pass_id,
      NOW() - INTERVAL '3 days',
      20,
      12.00,
      'completed',
      4,
      'Rich history and beautiful collections. Spent hours exploring.',
      true
    ),
    -- Visit 3: Mikla Restaurant
    (
      first_customer_id,
      mikla_id,
      first_pass_id,
      NOW() - INTERVAL '1 day',
      25,
      50.00,
      'completed',
      5,
      'Amazing food with spectacular views of the Bosphorus. Perfect for a special evening.',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE venue_visits IS 'Track customer visits to partner businesses with ratings and savings';
COMMENT ON FUNCTION update_pass_usage_on_visit IS 'Increment pass usage count when customer visits a venue';
COMMENT ON FUNCTION get_customer_visit_history IS 'Get paginated visit history for a customer';
COMMENT ON FUNCTION get_business_visit_stats IS 'Get visit statistics for a specific business';
COMMENT ON FUNCTION get_customer_visit_summary IS 'Get summary of customer visit activity';
COMMENT ON FUNCTION get_popular_venues IS 'Get most popular businesses based on visit count and ratings';
