-- Migration: Reviews & Ratings System
-- Description: Customer reviews and ratings for purchased passes
-- Date: 2025-12-09

-- ============================================
-- 1. PASS_REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pass_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pass_id UUID NOT NULL REFERENCES passes(id) ON DELETE CASCADE,
  purchased_pass_id UUID REFERENCES purchased_passes(id) ON DELETE SET NULL,

  -- Review Content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  comment TEXT NOT NULL,

  -- Media
  images TEXT[], -- Array of image URLs uploaded by customer

  -- Status
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',

  -- Admin moderation
  admin_notes TEXT,
  moderated_by UUID REFERENCES admin_profiles(id),
  moderated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: One review per order (customer can only review once per purchase)
  UNIQUE(customer_id, order_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pass_reviews_customer ON pass_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_pass_reviews_order ON pass_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_pass_reviews_pass ON pass_reviews(pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_reviews_status ON pass_reviews(status);
CREATE INDEX IF NOT EXISTS idx_pass_reviews_rating ON pass_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_pass_reviews_created_at ON pass_reviews(created_at DESC);

-- ============================================
-- 2. RLS POLICIES
-- ============================================

ALTER TABLE pass_reviews ENABLE ROW LEVEL SECURITY;

-- Customers can view their own reviews
CREATE POLICY "Customers can view own reviews"
  ON pass_reviews FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can view approved reviews
CREATE POLICY "Public can view approved reviews"
  ON pass_reviews FOR SELECT
  USING (status = 'approved');

-- Customers can insert their own reviews
CREATE POLICY "Customers can insert own reviews"
  ON pass_reviews FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can update their pending reviews
CREATE POLICY "Customers can update own pending reviews"
  ON pass_reviews FOR UPDATE
  USING (customer_id = auth.uid() AND status = 'pending')
  WITH CHECK (customer_id = auth.uid() AND status = 'pending');

-- Admins can view all reviews
CREATE POLICY "Admins can view all reviews"
  ON pass_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Admins can update all reviews (for moderation)
CREATE POLICY "Admins can update all reviews"
  ON pass_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Admins can delete reviews
CREATE POLICY "Admins can delete reviews"
  ON pass_reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- ============================================
-- 3. AUTO-UPDATE TIMESTAMP
-- ============================================

CREATE TRIGGER pass_reviews_updated_at
  BEFORE UPDATE ON pass_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 4. UPDATE PASS STATISTICS
-- ============================================

-- Add review statistics to passes table
ALTER TABLE passes
ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Function to update pass rating statistics
CREATE OR REPLACE FUNCTION update_pass_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only count approved reviews
  UPDATE passes
  SET
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM pass_reviews
      WHERE pass_id = COALESCE(NEW.pass_id, OLD.pass_id)
        AND status = 'approved'
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM pass_reviews
      WHERE pass_id = COALESCE(NEW.pass_id, OLD.pass_id)
        AND status = 'approved'
    )
  WHERE id = COALESCE(NEW.pass_id, OLD.pass_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update pass stats when review is inserted/updated/deleted
CREATE TRIGGER update_pass_rating_on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON pass_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_pass_rating_stats();

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Check if customer can review an order (must have completed order)
CREATE OR REPLACE FUNCTION can_customer_review_order(
  p_customer_id UUID,
  p_order_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  order_status TEXT;
  existing_review_count INTEGER;
BEGIN
  -- Check if order exists and is completed
  SELECT o.status INTO order_status
  FROM orders o
  WHERE o.id = p_order_id
    AND o.customer_id = p_customer_id;

  IF order_status IS NULL THEN
    RETURN false; -- Order doesn't exist or doesn't belong to customer
  END IF;

  IF order_status != 'completed' THEN
    RETURN false; -- Order is not completed
  END IF;

  -- Check if customer already reviewed this order
  SELECT COUNT(*) INTO existing_review_count
  FROM pass_reviews
  WHERE customer_id = p_customer_id
    AND order_id = p_order_id;

  IF existing_review_count > 0 THEN
    RETURN false; -- Already reviewed
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get reviews for a specific pass
CREATE OR REPLACE FUNCTION get_pass_reviews(
  p_pass_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  customer_name TEXT,
  rating INTEGER,
  title TEXT,
  comment TEXT,
  images TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id,
    CONCAT(cp.first_name, ' ', cp.last_name) as customer_name,
    pr.rating,
    pr.title,
    pr.comment,
    pr.images,
    pr.created_at
  FROM pass_reviews pr
  JOIN customer_profiles cp ON cp.id = pr.customer_id
  WHERE pr.pass_id = p_pass_id
    AND pr.status = 'approved'
  ORDER BY pr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get admin review statistics
CREATE OR REPLACE FUNCTION get_admin_review_stats()
RETURNS TABLE (
  total_reviews BIGINT,
  pending_reviews BIGINT,
  approved_reviews BIGINT,
  rejected_reviews BIGINT,
  average_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_reviews,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_reviews,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_reviews,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_reviews,
    COALESCE(AVG(rating) FILTER (WHERE status = 'approved'), 0) as average_rating
  FROM pass_reviews;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE pass_reviews IS 'Customer reviews and ratings for purchased passes';
COMMENT ON FUNCTION can_customer_review_order IS 'Checks if customer is eligible to review an order';
COMMENT ON FUNCTION get_pass_reviews IS 'Gets approved reviews for a specific pass';
COMMENT ON FUNCTION get_admin_review_stats IS 'Gets review statistics for admin dashboard';
