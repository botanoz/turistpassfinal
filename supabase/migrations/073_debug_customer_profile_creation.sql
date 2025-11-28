-- =====================================================
-- DEBUG: Customer Profile Creation Issue
-- =====================================================
-- Purpose: Fix the handle_new_user() function to prevent errors
-- Date: 2025-01-27
-- =====================================================

-- First, let's check if there are any existing issues with the function
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DEBUGGING CUSTOMER PROFILE CREATION';
  RAISE NOTICE '========================================';
END $$;

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  account_type TEXT;
  error_detail TEXT;
BEGIN
  -- Get account type from user metadata (default to 'customer')
  account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'customer');

  -- Log the account type for debugging
  RAISE NOTICE 'Processing new user: % with account_type: %', NEW.email, account_type;

  -- Only create customer profile if account_type is 'customer'
  -- Skip business, admin, and any other account types
  IF account_type = 'customer' THEN
    BEGIN
      -- Try to insert the customer profile
      INSERT INTO public.customer_profiles (
        id,
        email,
        first_name,
        last_name,
        status
      )
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'active'
      )
      ON CONFLICT (id) DO NOTHING;

      RAISE NOTICE 'Customer profile created successfully for: %', NEW.email;

    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      GET STACKED DIAGNOSTICS error_detail = MESSAGE_TEXT;
      RAISE WARNING 'Error creating customer profile for %: %', NEW.email, error_detail;
      -- Continue anyway - user should still be created in auth.users
    END;
  ELSE
    RAISE NOTICE 'Skipping customer profile creation for % account: %', account_type, NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created exists and is active';
  ELSE
    RAISE WARNING 'Trigger on_auth_user_created does NOT exist! Creating it now...';

    -- Recreate the trigger
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();

    RAISE NOTICE 'Trigger created successfully';
  END IF;
END $$;

-- Check for any constraints that might be causing issues
DO $$
DECLARE
  constraint_count INT;
  constraint_rec RECORD;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE conrelid = 'public.customer_profiles'::regclass
    AND contype = 'c'; -- Check constraints

  RAISE NOTICE 'Found % check constraints on customer_profiles table', constraint_count;

  -- List all constraints
  FOR constraint_rec IN
    SELECT conname, contype
    FROM pg_constraint
    WHERE conrelid = 'public.customer_profiles'::regclass
  LOOP
    RAISE NOTICE 'Constraint: % (type: %)', constraint_rec.conname, constraint_rec.contype;
  END LOOP;
END $$;

-- Final verification
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION 073 COMPLETED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '- Updated handle_new_user() with error handling';
  RAISE NOTICE '- Function now logs errors instead of failing';
  RAISE NOTICE '- User creation will succeed even if profile creation fails';
  RAISE NOTICE '- Added debug logging for troubleshooting';
  RAISE NOTICE '';
  RAISE NOTICE 'The function will now:';
  RAISE NOTICE '1. Check account_type metadata';
  RAISE NOTICE '2. Only create customer_profiles for "customer" accounts';
  RAISE NOTICE '3. Skip business, admin, and other account types';
  RAISE NOTICE '4. Log any errors without failing user creation';
  RAISE NOTICE '========================================';
END $$;
