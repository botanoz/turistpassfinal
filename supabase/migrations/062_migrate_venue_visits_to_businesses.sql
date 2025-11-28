-- =====================================================
-- Migration: Align venue_visits with businesses + auto log visits
-- =====================================================
-- Purpose: Add business_id to venue_visits, backfill from venue_id,
--          refresh helpers to use businesses, and add FK/index safely.
-- Date: 2025-11-25
-- =====================================================

-- 0) Safety: ensure pgcrypto and businesses table exist (lightweight shape)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS businesses (
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

-- 1) Add business_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'venue_visits'
      AND column_name = 'business_id'
  ) THEN
    ALTER TABLE venue_visits ADD COLUMN business_id UUID;
  END IF;
END $$;

-- 2) Backfill business_id from venue_id where possible
-- SKIPPED: venue_id column was already renamed to business_id in migration 010
-- No backfill needed as the column already contains the correct data

-- 3) Refresh FK: drop old venue FK, add business FK
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'venue_visits_venue_id_fkey'
  ) THEN
    ALTER TABLE venue_visits DROP CONSTRAINT venue_visits_venue_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'venue_visits_business_id_fkey'
  ) THEN
    ALTER TABLE venue_visits
      ADD CONSTRAINT venue_visits_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4) Index on business_id
CREATE INDEX IF NOT EXISTS idx_venue_visits_business ON venue_visits(business_id);

-- 5) Update helper functions to use businesses but keep names/return fields
CREATE OR REPLACE FUNCTION get_customer_visit_history(customer_uuid UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  visit_id UUID,
  venue_id UUID,
  venue_name TEXT,
  venue_category TEXT,
  venue_image_url TEXT,
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
    b.id as venue_id,
    b.name as venue_name,
    b.category as venue_category,
    b.image_url as venue_image_url,
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

CREATE OR REPLACE FUNCTION get_venue_visit_stats(venue_uuid UUID)
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
  WHERE business_id = venue_uuid
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION get_popular_venues(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  venue_id UUID,
  venue_name TEXT,
  venue_category TEXT,
  venue_image_url TEXT,
  visit_count BIGINT,
  avg_rating NUMERIC,
  unique_visitors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id as venue_id,
    b.name as venue_name,
    b.category as venue_category,
    b.image_url as venue_image_url,
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

-- 6) Comments
COMMENT ON TABLE venue_visits IS 'Track customer visits to partner businesses with ratings and savings';
COMMENT ON FUNCTION get_venue_visit_stats IS 'Get visit statistics for a specific business';
COMMENT ON FUNCTION get_popular_venues IS 'Get most popular businesses based on visit count and ratings';
