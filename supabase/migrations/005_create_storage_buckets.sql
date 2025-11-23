-- Migration: Supabase Storage Buckets
-- Description: Create storage buckets for images and files
-- Date: 2025-10-29
-- FAZ: 2

-- ============================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================

-- Logos bucket (company logos, site logo)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Banners bucket (hero images, promotional banners)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Avatars bucket (user profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Business images bucket (business photos, venue images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-images',
  'business-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. STORAGE POLICIES
-- Policies are defined in 005_create_storage_policies.sql to avoid duplication.
-- ============================================

-- ============================================
-- COMMENTS
-- ============================================

-- COMMENT requires ownership; wrap to avoid failure when run with a non-owner role.
DO $$
BEGIN
  BEGIN
    COMMENT ON TABLE storage.buckets IS 'Storage buckets for images and files';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping COMMENT on storage.buckets due to insufficient privileges';
    WHEN undefined_table THEN
      RAISE NOTICE 'Skipping COMMENT on storage.buckets because table not found';
  END;
END $$;
