-- =====================================================
-- Business Subscription & Billing System
-- =====================================================
-- Purpose: Manage business subscriptions, payments, invoices
-- Features: Subscription plans, billing cycles, invoices, payment tracking
-- Date: 2025-01-26
-- =====================================================

-- ============================================
-- 1. SUBSCRIPTION PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan Details
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  plan_type TEXT CHECK (plan_type IN ('free', 'starter', 'professional', 'enterprise', 'custom')) NOT NULL,

  -- Pricing
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one_time')) NOT NULL,

  -- Features & Limits
  features JSONB NOT NULL, -- { "max_campaigns": 5, "analytics": true, "priority_support": false }
  limits JSONB NOT NULL, -- { "monthly_redemptions": 1000, "staff_accounts": 3, "api_calls": 10000 }

  -- Commission
  commission_rate NUMERIC DEFAULT 0, -- percentage platform takes per transaction
  transaction_fee NUMERIC DEFAULT 0, -- fixed fee per transaction

  -- Visibility
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_custom BOOLEAN DEFAULT false, -- for enterprise/custom plans
  display_order INTEGER DEFAULT 0,

  -- Trial
  trial_days INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON business_subscription_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscription_plans_type ON business_subscription_plans(plan_type);

-- Insert default plans
INSERT INTO business_subscription_plans (name, slug, plan_type, price, currency, billing_cycle, features, limits, commission_rate, transaction_fee, trial_days, display_order) VALUES
('Free Plan', 'free', 'free', 0, 'TRY', 'monthly',
  '{"max_campaigns": 1, "analytics": false, "priority_support": false, "featured_listing": false, "custom_branding": false}'::jsonb,
  '{"monthly_redemptions": 50, "staff_accounts": 1, "api_calls": 1000}'::jsonb,
  15.0, 2.0, 14, 1),

('Starter Plan', 'starter', 'starter', 499, 'TRY', 'monthly',
  '{"max_campaigns": 5, "analytics": true, "priority_support": false, "featured_listing": false, "custom_branding": false}'::jsonb,
  '{"monthly_redemptions": 500, "staff_accounts": 3, "api_calls": 10000}'::jsonb,
  12.0, 1.5, 14, 2),

('Professional Plan', 'professional', 'professional', 999, 'TRY', 'monthly',
  '{"max_campaigns": 20, "analytics": true, "priority_support": true, "featured_listing": true, "custom_branding": false}'::jsonb,
  '{"monthly_redemptions": 2000, "staff_accounts": 10, "api_calls": 50000}'::jsonb,
  10.0, 1.0, 14, 3),

('Enterprise Plan', 'enterprise', 'enterprise', 2499, 'TRY', 'monthly',
  '{"max_campaigns": -1, "analytics": true, "priority_support": true, "featured_listing": true, "custom_branding": true}'::jsonb,
  '{"monthly_redemptions": -1, "staff_accounts": -1, "api_calls": -1}'::jsonb,
  8.0, 0.5, 14, 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. BUSINESS SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES business_subscription_plans(id),

  -- Subscription Details
  status TEXT CHECK (status IN ('active', 'trial', 'past_due', 'cancelled', 'expired')) NOT NULL DEFAULT 'trial',

  -- Billing
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Pricing (snapshot at subscription time)
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  commission_rate NUMERIC,
  transaction_fee NUMERIC,

  -- Usage Tracking
  usage_stats JSONB DEFAULT '{}'::jsonb, -- { "campaigns_created": 3, "redemptions": 245, "api_calls": 5000 }

  -- Auto-renewal
  auto_renew BOOLEAN DEFAULT true,

  -- Payment Method
  payment_method_id TEXT, -- Stripe/Iyzico payment method ID

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business ON business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_status ON business_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_period_end ON business_subscriptions(current_period_end);

-- Partial unique index to ensure one active subscription per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_subscriptions_one_active_per_business
  ON business_subscriptions(business_id)
  WHERE status IN ('active', 'trial');

-- ============================================
-- 3. BUSINESS INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES business_subscriptions(id) ON DELETE SET NULL,

  -- Invoice Details
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_type TEXT CHECK (invoice_type IN ('subscription', 'commission', 'transaction_fee', 'one_time', 'refund')) NOT NULL,

  -- Amounts
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC DEFAULT 20, -- VAT/KDV percentage
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',

  -- Billing Period
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,

  -- Status
  status TEXT CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded')) NOT NULL DEFAULT 'pending',

  -- Payment
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- 'credit_card', 'bank_transfer', 'cash', etc.
  payment_reference TEXT, -- transaction ID from payment provider

  -- Line Items
  line_items JSONB NOT NULL, -- [{ "description": "Starter Plan", "quantity": 1, "unit_price": 499, "amount": 499 }]

  -- Business Info (snapshot for invoice)
  business_name TEXT NOT NULL,
  business_email TEXT NOT NULL,
  business_address TEXT,
  business_tax_id TEXT,

  -- Notes
  notes TEXT,
  admin_notes TEXT,

  -- PDF Generation
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_invoices_business ON business_invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_business_invoices_status ON business_invoices(status);
CREATE INDEX IF NOT EXISTS idx_business_invoices_due_date ON business_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_business_invoices_number ON business_invoices(invoice_number);

-- ============================================
-- 4. BUSINESS PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS business_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES business_invoices(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES business_subscriptions(id) ON DELETE SET NULL,

  -- Payment Details
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  payment_type TEXT CHECK (payment_type IN ('subscription', 'commission', 'fee', 'refund', 'adjustment')) NOT NULL,

  -- Payment Method
  payment_method TEXT NOT NULL, -- 'credit_card', 'bank_transfer', etc.
  payment_provider TEXT, -- 'stripe', 'iyzico', 'manual'

  -- Status
  status TEXT CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')) NOT NULL DEFAULT 'pending',

  -- Provider Details
  provider_transaction_id TEXT,
  provider_payment_intent_id TEXT,
  provider_response JSONB,

  -- Failure Details
  failure_code TEXT,
  failure_message TEXT,

  -- Metadata
  metadata JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_payments_business ON business_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_business_payments_invoice ON business_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_business_payments_status ON business_payments(status);
CREATE INDEX IF NOT EXISTS idx_business_payments_date ON business_payments(created_at DESC);

-- ============================================
-- 5. COMMISSION TRANSACTIONS TABLE
-- ============================================
-- Track commissions from each redemption/transaction
CREATE TABLE IF NOT EXISTS business_commission_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES business_subscriptions(id) ON DELETE SET NULL,

  -- Transaction Details
  transaction_type TEXT CHECK (transaction_type IN ('campaign_redemption', 'pass_validation', 'booking', 'other')) NOT NULL,
  reference_id UUID, -- campaign_redemption_id, order_id, etc.

  -- Amounts
  transaction_amount NUMERIC NOT NULL, -- original transaction amount
  commission_rate NUMERIC NOT NULL, -- rate applied
  commission_amount NUMERIC NOT NULL, -- calculated commission
  transaction_fee NUMERIC DEFAULT 0, -- fixed fee
  total_fee NUMERIC NOT NULL, -- commission + transaction fee
  currency TEXT NOT NULL DEFAULT 'TRY',

  -- Settlement
  settlement_status TEXT CHECK (settlement_status IN ('pending', 'invoiced', 'paid', 'disputed')) DEFAULT 'pending',
  invoice_id UUID REFERENCES business_invoices(id) ON DELETE SET NULL,
  settled_at TIMESTAMPTZ,

  -- Metadata
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commission_transactions_business ON business_commission_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_settlement ON business_commission_transactions(settlement_status);
CREATE INDEX IF NOT EXISTS idx_commission_transactions_date ON business_commission_transactions(transaction_date DESC);

-- ============================================
-- 6. SUBSCRIPTION HISTORY TABLE
-- ============================================
-- Track all subscription changes
CREATE TABLE IF NOT EXISTS business_subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES business_subscriptions(id) ON DELETE SET NULL,

  -- Change Details
  event_type TEXT CHECK (event_type IN (
    'created', 'activated', 'upgraded', 'downgraded',
    'renewed', 'cancelled', 'expired', 'trial_started', 'trial_ended'
  )) NOT NULL,

  old_plan_id UUID REFERENCES business_subscription_plans(id),
  new_plan_id UUID REFERENCES business_subscription_plans(id),
  old_status TEXT,
  new_status TEXT,

  -- Context
  reason TEXT,
  initiated_by TEXT, -- 'business', 'admin', 'system'
  admin_id UUID REFERENCES admin_profiles(id),

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_subscription_history_business ON business_subscription_history(business_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription ON business_subscription_history(subscription_id);

-- ============================================
-- 7. RLS POLICIES
-- ============================================
ALTER TABLE business_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_commission_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_subscription_history ENABLE ROW LEVEL SECURITY;

-- Subscription Plans: Public can view active plans
CREATE POLICY "Public can view active plans"
  ON business_subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON business_subscription_plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- Subscriptions: Businesses can view own
CREATE POLICY "Businesses can view own subscriptions"
  ON business_subscriptions FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Businesses can update own subscriptions"
  ON business_subscriptions FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all subscriptions"
  ON business_subscriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- Invoices: Businesses can view own
CREATE POLICY "Businesses can view own invoices"
  ON business_invoices FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all invoices"
  ON business_invoices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- Payments: Businesses can view own
CREATE POLICY "Businesses can view own payments"
  ON business_payments FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all payments"
  ON business_payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- Commission Transactions: Businesses can view own
CREATE POLICY "Businesses can view own commissions"
  ON business_commission_transactions FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all commissions"
  ON business_commission_transactions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- Subscription History: Businesses can view own
CREATE POLICY "Businesses can view own history"
  ON business_subscription_history FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_accounts WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all history"
  ON business_subscription_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
  );

-- ============================================
-- 8. FUNCTIONS
-- ============================================

-- Get business subscription details with usage
CREATE OR REPLACE FUNCTION get_business_subscription_details(business_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'subscription', row_to_json(bs.*),
    'plan', row_to_json(bsp.*),
    'usage', (
      SELECT json_build_object(
        'campaigns_created', COUNT(DISTINCT bc.id),
        'active_campaigns', COUNT(DISTINCT bc.id) FILTER (WHERE bc.status = 'active'),
        'total_redemptions', COUNT(DISTINCT cr.id),
        'current_period_redemptions', COUNT(DISTINCT cr.id) FILTER (
          WHERE cr.redeemed_at >= bs.current_period_start
            AND cr.redeemed_at <= bs.current_period_end
        )
      )
      FROM business_subscriptions bs2
      LEFT JOIN business_campaigns bc ON bc.business_id = bs2.business_id
      LEFT JOIN campaign_redemptions cr ON cr.business_id = bs2.business_id
      WHERE bs2.business_id = business_uuid
        AND bs2.status IN ('active', 'trial')
    ),
    'commission_summary', (
      SELECT json_build_object(
        'pending_amount', COALESCE(SUM(total_fee) FILTER (WHERE settlement_status = 'pending'), 0),
        'invoiced_amount', COALESCE(SUM(total_fee) FILTER (WHERE settlement_status = 'invoiced'), 0),
        'paid_amount', COALESCE(SUM(total_fee) FILTER (WHERE settlement_status = 'paid'), 0)
      )
      FROM business_commission_transactions
      WHERE business_id = business_uuid
    )
  ) INTO result
  FROM business_subscriptions bs
  JOIN business_subscription_plans bsp ON bsp.id = bs.plan_id
  WHERE bs.business_id = business_uuid
    AND bs.status IN ('active', 'trial')
  ORDER BY bs.created_at DESC
  LIMIT 1;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create invoice for business
CREATE OR REPLACE FUNCTION create_business_invoice(
  business_uuid UUID,
  subscription_uuid UUID,
  invoice_type_val TEXT,
  line_items_val JSONB,
  due_days INTEGER DEFAULT 7
)
RETURNS UUID AS $$
DECLARE
  invoice_id UUID;
  business_info RECORD;
  subtotal_val NUMERIC;
  tax_val NUMERIC;
  total_val NUMERIC;
  invoice_num TEXT;
BEGIN
  -- Get business info
  SELECT name, email, address INTO business_info
  FROM businesses
  WHERE id = business_uuid;

  -- Calculate totals
  SELECT SUM((item->>'amount')::NUMERIC) INTO subtotal_val
  FROM jsonb_array_elements(line_items_val) AS item;

  tax_val := subtotal_val * 0.20; -- 20% VAT
  total_val := subtotal_val + tax_val;

  -- Generate invoice number
  invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('invoice_number_seq')::TEXT, 6, '0');

  -- Create invoice
  INSERT INTO business_invoices (
    business_id,
    subscription_id,
    invoice_number,
    invoice_type,
    subtotal,
    tax_amount,
    total_amount,
    due_date,
    line_items,
    business_name,
    business_email,
    business_address,
    status
  ) VALUES (
    business_uuid,
    subscription_uuid,
    invoice_num,
    invoice_type_val,
    subtotal_val,
    tax_val,
    total_val,
    NOW() + (due_days || ' days')::INTERVAL,
    line_items_val,
    business_info.name,
    business_info.email,
    business_info.address,
    'pending'
  )
  RETURNING id INTO invoice_id;

  RETURN invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- Check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limit(
  business_uuid UUID,
  limit_type TEXT -- 'campaigns', 'redemptions', 'staff', 'api_calls'
)
RETURNS JSON AS $$
DECLARE
  subscription_record RECORD;
  plan_limits JSONB;
  current_usage INTEGER;
  limit_value INTEGER;
  result JSON;
BEGIN
  -- Get active subscription
  SELECT bs.* INTO subscription_record
  FROM business_subscriptions bs
  WHERE bs.business_id = business_uuid
    AND bs.status IN ('active', 'trial')
  ORDER BY bs.created_at DESC
  LIMIT 1;

  IF subscription_record IS NULL THEN
    RETURN json_build_object('allowed', false, 'reason', 'No active subscription');
  END IF;

  -- Get plan limits
  SELECT bsp.limits INTO plan_limits
  FROM business_subscription_plans bsp
  WHERE bsp.id = subscription_record.plan_id;

  -- Get limit value (-1 means unlimited)
  limit_value := (plan_limits->>(
    CASE limit_type
      WHEN 'campaigns' THEN 'max_campaigns'
      WHEN 'redemptions' THEN 'monthly_redemptions'
      WHEN 'staff' THEN 'staff_accounts'
      WHEN 'api_calls' THEN 'api_calls'
    END
  ))::INTEGER;

  -- If unlimited
  IF limit_value = -1 THEN
    RETURN json_build_object('allowed', true, 'unlimited', true);
  END IF;

  -- Get current usage
  IF limit_type = 'campaigns' THEN
    SELECT COUNT(*) INTO current_usage
    FROM business_campaigns
    WHERE business_id = business_uuid
      AND status = 'active';
  ELSIF limit_type = 'redemptions' THEN
    SELECT COUNT(*) INTO current_usage
    FROM campaign_redemptions
    WHERE business_id = business_uuid
      AND redeemed_at >= subscription_record.current_period_start
      AND redeemed_at <= subscription_record.current_period_end;
  ELSE
    current_usage := 0;
  END IF;

  -- Check if limit exceeded
  RETURN json_build_object(
    'allowed', current_usage < limit_value,
    'current_usage', current_usage,
    'limit', limit_value,
    'remaining', limit_value - current_usage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-renew subscriptions
CREATE OR REPLACE FUNCTION process_subscription_renewals()
RETURNS void AS $$
DECLARE
  subscription_rec RECORD;
  new_period_end TIMESTAMPTZ;
BEGIN
  FOR subscription_rec IN
    SELECT * FROM business_subscriptions
    WHERE status = 'active'
      AND auto_renew = true
      AND current_period_end <= NOW()
  LOOP
    -- Calculate new period end
    SELECT
      CASE
        WHEN bsp.billing_cycle = 'monthly' THEN NOW() + INTERVAL '1 month'
        WHEN bsp.billing_cycle = 'quarterly' THEN NOW() + INTERVAL '3 months'
        WHEN bsp.billing_cycle = 'yearly' THEN NOW() + INTERVAL '1 year'
      END INTO new_period_end
    FROM business_subscription_plans bsp
    WHERE bsp.id = subscription_rec.plan_id;

    -- Update subscription
    UPDATE business_subscriptions
    SET current_period_start = NOW(),
        current_period_end = new_period_end,
        updated_at = NOW()
    WHERE id = subscription_rec.id;

    -- Create invoice
    PERFORM create_business_invoice(
      subscription_rec.business_id,
      subscription_rec.id,
      'subscription',
      json_build_array(
        json_build_object(
          'description', (SELECT name FROM business_subscription_plans WHERE id = subscription_rec.plan_id),
          'quantity', 1,
          'unit_price', subscription_rec.price,
          'amount', subscription_rec.price
        )
      )::jsonb,
      7
    );

    -- Log history
    INSERT INTO business_subscription_history (
      business_id,
      subscription_id,
      event_type,
      new_plan_id,
      new_status,
      reason,
      initiated_by
    ) VALUES (
      subscription_rec.business_id,
      subscription_rec.id,
      'renewed',
      subscription_rec.plan_id,
      'active',
      'Auto-renewal',
      'system'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_subscriptions_updated_at
  BEFORE UPDATE ON business_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

CREATE TRIGGER update_business_invoices_updated_at
  BEFORE UPDATE ON business_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE business_subscription_plans IS 'Available subscription plans for businesses';
COMMENT ON TABLE business_subscriptions IS 'Active business subscriptions';
COMMENT ON TABLE business_invoices IS 'Invoices issued to businesses';
COMMENT ON TABLE business_payments IS 'Payment transactions from businesses';
COMMENT ON TABLE business_commission_transactions IS 'Commission tracking for each transaction';
COMMENT ON TABLE business_subscription_history IS 'Audit log of subscription changes';
