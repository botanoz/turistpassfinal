-- Migration: Ensure business image columns exist and are properly indexed
-- Description: Add image_url and gallery_images columns to businesses table if missing
-- Date: 2025-12-02

-- Add image_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'businesses'
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE businesses ADD COLUMN image_url TEXT;
    COMMENT ON COLUMN businesses.image_url IS 'Main business image URL';
  END IF;
END $$;

-- Add gallery_images column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'businesses'
    AND column_name = 'gallery_images'
  ) THEN
    ALTER TABLE businesses ADD COLUMN gallery_images TEXT[];
    COMMENT ON COLUMN businesses.gallery_images IS 'Array of additional business image URLs';
  END IF;
END $$;

-- Create index for faster image queries
CREATE INDEX IF NOT EXISTS idx_businesses_has_images
ON businesses(id)
WHERE image_url IS NOT NULL;

-- Add comment
COMMENT ON TABLE businesses IS 'Business/venue information including contact details and media';
