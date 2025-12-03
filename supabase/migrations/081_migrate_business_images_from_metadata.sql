-- Migration: Migrate business images from metadata to database columns
-- Description: Move existing images from business_accounts.metadata to businesses.image_url and gallery_images
-- Date: 2025-12-02

-- Migrate images from metadata to database columns
-- This is a one-time data migration for existing businesses
DO $$
DECLARE
  business_record RECORD;
  images_json JSONB;
  images_array TEXT[];
BEGIN
  -- Loop through all business accounts that have images in metadata
  FOR business_record IN
    SELECT
      ba.id as account_id,
      ba.business_id,
      ba.metadata
    FROM business_accounts ba
    WHERE ba.business_id IS NOT NULL
      AND ba.metadata->'profile'->'images' IS NOT NULL
      AND jsonb_array_length(ba.metadata->'profile'->'images') > 0
  LOOP
    -- Get images array from metadata
    images_json := business_record.metadata->'profile'->'images';

    -- Convert JSONB array to TEXT array
    SELECT ARRAY(
      SELECT jsonb_array_elements_text(images_json)
    ) INTO images_array;

    -- Update businesses table
    -- Only update if image_url is currently NULL (don't overwrite existing data)
    UPDATE businesses
    SET
      image_url = CASE
        WHEN image_url IS NULL AND array_length(images_array, 1) > 0
        THEN images_array[1]
        ELSE image_url
      END,
      gallery_images = CASE
        WHEN (gallery_images IS NULL OR array_length(gallery_images, 1) = 0)
             AND array_length(images_array, 1) > 1
        THEN images_array[2:array_length(images_array, 1)]
        ELSE gallery_images
      END,
      updated_at = NOW()
    WHERE id = business_record.business_id;

    -- Log the migration
    RAISE NOTICE 'Migrated images for business_id: %, account_id: %, image_count: %',
      business_record.business_id,
      business_record.account_id,
      array_length(images_array, 1);
  END LOOP;
END $$;

-- Summary: Log how many businesses were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO updated_count
  FROM businesses
  WHERE image_url IS NOT NULL;

  RAISE NOTICE '✓ Migration complete. Total businesses with images: %', updated_count;
END $$;
