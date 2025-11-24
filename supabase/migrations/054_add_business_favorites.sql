-- =====================================================
-- MIGRATION: Add business favorites table
-- Date: 2025-11-24
-- =====================================================

-- Create business_favorites table
CREATE TABLE IF NOT EXISTS business_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, business_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_favorites_customer ON business_favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_business_favorites_business ON business_favorites(business_id);
CREATE INDEX IF NOT EXISTS idx_business_favorites_created ON business_favorites(created_at DESC);

-- Enable RLS
ALTER TABLE business_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own favorites
CREATE POLICY "Users can view own business favorites"
  ON business_favorites
  FOR SELECT
  USING (auth.uid() = customer_id);

-- Users can add their own favorites
CREATE POLICY "Users can add own business favorites"
  ON business_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own business favorites"
  ON business_favorites
  FOR DELETE
  USING (auth.uid() = customer_id);

-- Admin can view all favorites
CREATE POLICY "Admin can view all business favorites"
  ON business_favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE admin_profiles.id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON business_favorites TO authenticated;
GRANT ALL ON business_favorites TO service_role;
