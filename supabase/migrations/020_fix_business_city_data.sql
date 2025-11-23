-- =====================================================
-- MIGRATION: Fix Business City Data Again
-- =====================================================
-- Description: Ensures all businesses have proper city values
-- Moves contact_position to city if it looks like a city name
-- Date: 2025-10-31
-- =====================================================

-- Update businesses where contact_position looks like a city
UPDATE businesses
SET
  city = COALESCE(city, contact_position),
  contact_position = CASE
    WHEN contact_position IN ('Istanbul', 'İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa') THEN NULL
    ELSE contact_position
  END
WHERE contact_position IN ('Istanbul', 'İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa')
   OR (city IS NULL AND contact_position IS NOT NULL);

-- Ensure all businesses have Istanbul as default city if none specified
UPDATE businesses
SET city = 'Istanbul'
WHERE city IS NULL OR city = '';

-- =====================================================
