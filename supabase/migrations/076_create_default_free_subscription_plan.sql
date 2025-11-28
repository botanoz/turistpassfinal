-- =====================================================
-- CREATE DEFAULT FREE SUBSCRIPTION PLAN
-- =====================================================
-- Purpose: Add a free tier plan and auto-assign to all businesses
-- This allows businesses to test features without payment
-- Date: 2025-01-28
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CREATING DEFAULT FREE SUBSCRIPTION PLAN';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 1. CREATE FREE TIER PLAN
-- =====================================================

DO $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Check if free plan already exists
  SELECT id INTO free_plan_id
  FROM business_subscription_plans
  WHERE name = 'Free Tier'
  LIMIT 1;

  IF free_plan_id IS NULL THEN
    -- Create free tier plan
    INSERT INTO business_subscription_plans (
      name,
      description,
      price,
      billing_period,
      currency,
      features,
      limits,
      is_active,
      trial_days
    ) VALUES (
      'Free Tier',
      'Free plan for testing and small businesses',
      0,
      'monthly',
      'TRY',
      jsonb_build_object(
        'basic_analytics', true,
        'campaign_creation', true,
        'pass_validation', true,
        'customer_support', false,
        'priority_support', false,
        'custom_branding', false,
        'api_access', false,
        'advanced_analytics', false
      ),
      jsonb_build_object(
        'max_campaigns', 5,
        'monthly_redemptions', 100,
        'staff_accounts', 2,
        'api_calls', 1000
      ),
      true,
      0
    )
    RETURNING id INTO free_plan_id;

    RAISE NOTICE 'Created Free Tier plan with ID: %', free_plan_id;
  ELSE
    RAISE NOTICE 'Free Tier plan already exists with ID: %', free_plan_id;
  END IF;

  -- Auto-assign free plan to all businesses without active subscription
  INSERT INTO business_subscriptions (
    business_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    price,
    currency,
    auto_renew
  )
  SELECT
    b.id as business_id,
    free_plan_id,
    'active',
    NOW(),
    NOW() + INTERVAL '100 years', -- Never expires for free tier
    0,
    'TRY',
    true
  FROM businesses b
  WHERE NOT EXISTS (
    SELECT 1
    FROM business_subscriptions bs
    WHERE bs.business_id = b.id
      AND bs.status IN ('active', 'trial')
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Auto-assigned free plan to businesses without active subscription';
END $$;

-- =====================================================
-- 2. CREATE TRIGGER TO AUTO-ASSIGN FREE PLAN TO NEW BUSINESSES
-- =====================================================

CREATE OR REPLACE FUNCTION auto_assign_free_plan()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Get free plan ID
  SELECT id INTO free_plan_id
  FROM business_subscription_plans
  WHERE name = 'Free Tier'
  LIMIT 1;

  IF free_plan_id IS NOT NULL THEN
    -- Auto-assign free plan to new business
    INSERT INTO business_subscriptions (
      business_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      price,
      currency,
      auto_renew
    ) VALUES (
      NEW.id,
      free_plan_id,
      'active',
      NOW(),
      NOW() + INTERVAL '100 years',
      0,
      'TRY',
      true
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Auto-assigned free plan to new business: %', NEW.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_assign_free_plan ON businesses;

-- Create trigger for new businesses
CREATE TRIGGER trigger_auto_assign_free_plan
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_free_plan();

-- =====================================================
-- 3. VERIFICATION
-- =====================================================

DO $$
DECLARE
  free_plan_count INTEGER;
  businesses_with_subscription INTEGER;
  businesses_without_subscription INTEGER;
BEGIN
  SELECT COUNT(*) INTO free_plan_count
  FROM business_subscription_plans
  WHERE name = 'Free Tier';

  SELECT COUNT(DISTINCT bs.business_id) INTO businesses_with_subscription
  FROM business_subscriptions bs
  WHERE bs.status IN ('active', 'trial');

  SELECT COUNT(*) INTO businesses_without_subscription
  FROM businesses b
  WHERE NOT EXISTS (
    SELECT 1
    FROM business_subscriptions bs
    WHERE bs.business_id = b.id
      AND bs.status IN ('active', 'trial')
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION 076 COMPLETED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Free Tier Plans: %', free_plan_count;
  RAISE NOTICE 'Businesses with active/trial subscription: %', businesses_with_subscription;
  RAISE NOTICE 'Businesses without subscription: %', businesses_without_subscription;
  RAISE NOTICE '';
  RAISE NOTICE 'Free Tier Limits:';
  RAISE NOTICE '- Max Campaigns: 5';
  RAISE NOTICE '- Monthly Redemptions: 100';
  RAISE NOTICE '- Staff Accounts: 2';
  RAISE NOTICE '- API Calls: 1000/month';
  RAISE NOTICE '';
  RAISE NOTICE 'All new businesses will automatically get Free Tier plan';
  RAISE NOTICE '========================================';
END $$;
