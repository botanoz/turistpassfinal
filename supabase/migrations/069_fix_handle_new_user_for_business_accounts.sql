-- =====================================================
-- FIX: Handle New User Function for Business Accounts
-- =====================================================
-- Purpose: Update handle_new_user() to skip business accounts
--          Only create customer_profiles for actual customers
-- Date: 2025-01-26
-- =====================================================

-- Drop and recreate the function with business account check
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  account_type TEXT;
BEGIN
  -- Get account type from user metadata
  account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'customer');

  -- Only create customer profile if account_type is 'customer' or not specified
  -- Business accounts and admin accounts are handled separately in their respective APIs
  IF account_type = 'customer' OR account_type IS NULL THEN
    INSERT INTO public.customer_profiles (id, email, first_name, last_name, status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      'active'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'HANDLE_NEW_USER FUNCTION UPDATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '- Function now checks account_type in user_metadata';
  RAISE NOTICE '- Only creates customer_profiles for customer accounts';
  RAISE NOTICE '- Business and admin accounts are skipped';
  RAISE NOTICE '';
  RAISE NOTICE 'This fixes the error when creating business accounts';
  RAISE NOTICE '========================================';
END $$;
