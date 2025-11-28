-- =====================================================
-- Business Campaigns System
-- =====================================================
-- Purpose: Allow businesses to create and manage their own campaigns
-- Features: Campaign creation, targeting, analytics, budget tracking
-- Date: 2025-01-26
-- =====================================================

-- ============================================
-- 1. BUSINESS CAMPAIGNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Campaign Details
  title TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT CHECK (campaign_type IN ('discount', 'special_offer', 'event', 'limited_time', 'seasonal')) NOT NULL,

  -- Discount/Offer Details
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_item')),
  discount_value NUMERIC, -- percentage (e.g., 20 for 20%) or fixed amount
  minimum_purchase_amount NUMERIC DEFAULT 0,
  maximum_discount_amount NUMERIC, -- cap for percentage discounts

  -- Special Offer Details (for buy_x_get_y or free_item)
  offer_details JSONB, -- { "buy": 2, "get": 1, "item": "coffee" }

  -- Targeting
  target_pass_types TEXT[], -- ['premium', 'family', 'student'] - null means all passes
  target_customer_segments TEXT[], -- ['new', 'returning', 'vip'] - null means all

  -- Schedule
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  active_hours JSONB, -- { "monday": ["09:00-12:00", "18:00-22:00"], ... }

  -- Budget & Limits
  total_budget NUMERIC, -- max amount business willing to spend
  budget_spent NUMERIC DEFAULT 0,
  max_redemptions INTEGER, -- max number of times campaign can be used
  redemptions_count INTEGER DEFAULT 0,
  max_redemptions_per_customer INTEGER DEFAULT 1,

  -- Visibility & Status
  status TEXT CHECK (status IN ('draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected')) DEFAULT 'draft',
  visibility TEXT CHECK (visibility IN ('public', 'pass_holders_only', 'targeted')) DEFAULT 'public',
  featured BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0, -- higher number = higher priority in listings

  -- Display
  image_url TEXT,
  banner_url TEXT,
  terms_and_conditions TEXT,
  promo_code TEXT UNIQUE, -- optional promo code for tracking

  -- Admin Review
  admin_approved BOOLEAN DEFAULT false,
  admin_reviewed_by UUID REFERENCES admin_profiles(id),
  admin_reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  rejection_reason TEXT,

  -- Analytics
  views_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  redemptions_count_total INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_budget CHECK (total_budget IS NULL OR total_budget >= 0),
  CONSTRAINT valid_discount CHECK (
    (discount_type IS NULL) OR
    (discount_type = 'percentage' AND discount_value BETWEEN 1 AND 100) OR
    (discount_type IN ('fixed_amount', 'buy_x_get_y', 'free_item') AND discount_value >= 0)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_campaigns_business ON business_campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_business_campaigns_status ON business_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_business_campaigns_dates ON business_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_business_campaigns_featured ON business_campaigns(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_business_campaigns_promo_code ON business_campaigns(promo_code) WHERE promo_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_campaigns_active ON business_campaigns(status, start_date, end_date)
  WHERE status = 'active';

-- ============================================
-- 2. CAMPAIGN REDEMPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES business_campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Redemption Details
  pass_id UUID REFERENCES purchased_passes(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Discount Applied
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  original_amount NUMERIC,
  final_amount NUMERIC,

  -- Context
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  device_type TEXT,

  -- Validation
  validated_by_business BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  validation_code TEXT, -- QR code or unique validation code

  -- Metadata
  metadata JSONB -- additional data: location, items purchased, etc.
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_campaign ON campaign_redemptions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_customer ON campaign_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_business ON campaign_redemptions(business_id);
CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_date ON campaign_redemptions(redeemed_at DESC);

-- ============================================
-- 3. CAMPAIGN ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES business_campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Date
  date DATE NOT NULL,

  -- Metrics
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  redemptions INTEGER DEFAULT 0,
  unique_customers INTEGER DEFAULT 0,

  -- Financial
  total_discount_given NUMERIC DEFAULT 0,
  total_revenue_generated NUMERIC DEFAULT 0, -- original amount before discount

  -- Performance
  conversion_rate NUMERIC, -- redemptions / clicks
  avg_discount_per_redemption NUMERIC,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, date)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_campaign ON campaign_analytics_daily(campaign_id, date DESC);

-- ============================================
-- 4. RLS POLICIES
-- ============================================
ALTER TABLE business_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Business Campaigns Policies
CREATE POLICY "Businesses can view own campaigns"
  ON business_campaigns FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Businesses can create campaigns"
  ON business_campaigns FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Businesses can update own campaigns"
  ON business_campaigns FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Businesses can delete own campaigns"
  ON business_campaigns FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

-- Admins can manage all campaigns
CREATE POLICY "Admins can view all campaigns"
  ON business_campaigns FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update all campaigns"
  ON business_campaigns FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- Public can view active campaigns
CREATE POLICY "Public can view active campaigns"
  ON business_campaigns FOR SELECT
  USING (
    status = 'active'
    AND admin_approved = true
    AND start_date <= NOW()
    AND end_date >= NOW()
  );

-- Campaign Redemptions Policies
CREATE POLICY "Businesses can view own redemptions"
  ON campaign_redemptions FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Customers can view own redemptions"
  ON campaign_redemptions FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "System can insert redemptions"
  ON campaign_redemptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all redemptions"
  ON campaign_redemptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- Analytics Policies
CREATE POLICY "Businesses can view own analytics"
  ON campaign_analytics_daily FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all analytics"
  ON campaign_analytics_daily FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- ============================================
-- 5. FUNCTIONS
-- ============================================

-- Get active campaigns for a business
CREATE OR REPLACE FUNCTION get_business_active_campaigns(business_uuid UUID)
RETURNS TABLE (
  campaign_id UUID,
  title TEXT,
  description TEXT,
  campaign_type TEXT,
  discount_value NUMERIC,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  redemptions_count INTEGER,
  max_redemptions INTEGER,
  budget_spent NUMERIC,
  total_budget NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id,
    bc.title,
    bc.description,
    bc.campaign_type,
    bc.discount_value,
    bc.start_date,
    bc.end_date,
    bc.redemptions_count,
    bc.max_redemptions,
    bc.budget_spent,
    bc.total_budget,
    bc.status
  FROM business_campaigns bc
  WHERE bc.business_id = business_uuid
    AND bc.status = 'active'
    AND bc.start_date <= NOW()
    AND bc.end_date >= NOW()
  ORDER BY bc.priority DESC, bc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get campaign statistics
CREATE OR REPLACE FUNCTION get_campaign_stats(campaign_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_views', COALESCE(SUM(views), 0),
    'total_clicks', COALESCE(SUM(clicks), 0),
    'total_redemptions', COALESCE(SUM(redemptions), 0),
    'total_unique_customers', COALESCE(SUM(unique_customers), 0),
    'total_discount_given', COALESCE(SUM(total_discount_given), 0),
    'total_revenue_generated', COALESCE(SUM(total_revenue_generated), 0),
    'avg_conversion_rate', COALESCE(AVG(conversion_rate), 0),
    'daily_stats', (
      SELECT json_agg(
        json_build_object(
          'date', date,
          'views', views,
          'clicks', clicks,
          'redemptions', redemptions,
          'conversion_rate', conversion_rate
        )
      )
      FROM campaign_analytics_daily
      WHERE campaign_id = campaign_uuid
      ORDER BY date DESC
      LIMIT 30
    )
  ) INTO result
  FROM campaign_analytics_daily
  WHERE campaign_id = campaign_uuid;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate and redeem campaign
CREATE OR REPLACE FUNCTION redeem_campaign(
  campaign_uuid UUID,
  customer_uuid UUID,
  pass_uuid UUID DEFAULT NULL,
  original_amt NUMERIC DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  campaign_record RECORD;
  redemptions_by_customer INTEGER;
  discount_amt NUMERIC;
  result JSON;
BEGIN
  -- Get campaign details
  SELECT * INTO campaign_record
  FROM business_campaigns
  WHERE id = campaign_uuid
    AND status = 'active'
    AND admin_approved = true
    AND start_date <= NOW()
    AND end_date >= NOW();

  IF campaign_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Campaign not found or not active');
  END IF;

  -- Check max redemptions
  IF campaign_record.max_redemptions IS NOT NULL
     AND campaign_record.redemptions_count >= campaign_record.max_redemptions THEN
    RETURN json_build_object('success', false, 'error', 'Campaign redemption limit reached');
  END IF;

  -- Check customer redemption limit
  SELECT COUNT(*) INTO redemptions_by_customer
  FROM campaign_redemptions
  WHERE campaign_id = campaign_uuid
    AND customer_id = customer_uuid;

  IF campaign_record.max_redemptions_per_customer IS NOT NULL
     AND redemptions_by_customer >= campaign_record.max_redemptions_per_customer THEN
    RETURN json_build_object('success', false, 'error', 'You have already used this campaign');
  END IF;

  -- Calculate discount
  IF campaign_record.discount_type = 'percentage' THEN
    discount_amt := (original_amt * campaign_record.discount_value / 100);
    IF campaign_record.maximum_discount_amount IS NOT NULL THEN
      discount_amt := LEAST(discount_amt, campaign_record.maximum_discount_amount);
    END IF;
  ELSIF campaign_record.discount_type = 'fixed_amount' THEN
    discount_amt := campaign_record.discount_value;
  ELSE
    discount_amt := 0;
  END IF;

  -- Check budget
  IF campaign_record.total_budget IS NOT NULL
     AND (campaign_record.budget_spent + discount_amt) > campaign_record.total_budget THEN
    RETURN json_build_object('success', false, 'error', 'Campaign budget exhausted');
  END IF;

  -- Create redemption record
  INSERT INTO campaign_redemptions (
    campaign_id,
    business_id,
    customer_id,
    pass_id,
    discount_amount,
    original_amount,
    final_amount,
    validation_code
  ) VALUES (
    campaign_uuid,
    campaign_record.business_id,
    customer_uuid,
    pass_uuid,
    discount_amt,
    original_amt,
    original_amt - discount_amt,
    gen_random_uuid()::TEXT
  );

  -- Update campaign stats
  UPDATE business_campaigns
  SET redemptions_count = redemptions_count + 1,
      budget_spent = budget_spent + discount_amt,
      updated_at = NOW()
  WHERE id = campaign_uuid;

  RETURN json_build_object(
    'success', true,
    'discount_amount', discount_amt,
    'final_amount', original_amt - discount_amt
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update campaign status based on dates
CREATE OR REPLACE FUNCTION update_campaign_statuses()
RETURNS void AS $$
BEGIN
  -- Mark campaigns as completed if end date passed
  UPDATE business_campaigns
  SET status = 'completed'
  WHERE status = 'active'
    AND end_date < NOW();

  -- Mark campaigns as active if start date reached
  UPDATE business_campaigns
  SET status = 'active'
  WHERE status = 'pending_approval'
    AND admin_approved = true
    AND start_date <= NOW()
    AND end_date >= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaign_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_campaigns_updated_at
  BEFORE UPDATE ON business_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_updated_at();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE business_campaigns IS 'Business-created campaigns and promotions';
COMMENT ON TABLE campaign_redemptions IS 'Track customer redemptions of campaigns';
COMMENT ON TABLE campaign_analytics_daily IS 'Daily analytics for campaign performance';
COMMENT ON FUNCTION get_business_active_campaigns IS 'Get all active campaigns for a business';
COMMENT ON FUNCTION get_campaign_stats IS 'Get comprehensive statistics for a campaign';
COMMENT ON FUNCTION redeem_campaign IS 'Validate and redeem a campaign for a customer';
