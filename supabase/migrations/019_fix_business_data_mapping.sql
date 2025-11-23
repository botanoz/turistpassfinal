-- =====================================================
-- MIGRATION: Fix Business Data Mapping
-- =====================================================
-- Description: Fixes incorrectly mapped data in businesses table
-- Some businesses have city name in contact_position field
-- Date: 2025-10-31
-- =====================================================

-- Move contact_position values that look like cities to city field
UPDATE businesses
SET
  city = contact_position,
  contact_position = NULL
WHERE contact_position IN ('Istanbul', 'İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa');

-- Also ensure all businesses have proper slug
UPDATE businesses
SET slug = LOWER(TRIM(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g')))
WHERE slug IS NULL OR slug = '';

-- Replace spaces with hyphens in slugs
UPDATE businesses
SET slug = REPLACE(LOWER(TRIM(slug)), ' ', '-')
WHERE slug LIKE '% %';

-- =====================================================
