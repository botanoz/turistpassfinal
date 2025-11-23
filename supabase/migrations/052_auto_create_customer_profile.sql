-- =====================================================
-- AUTO-CREATE CUSTOMER PROFILE ON USER SIGNUP
-- =====================================================
-- This migration creates a trigger that automatically
-- creates a customer_profile when a new user signs up
-- =====================================================

-- =====================================================
-- 1. CREATE TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create customer profile for new user
  INSERT INTO public.customer_profiles (id, email, first_name, last_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CREATE TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 3. BACKFILL EXISTING USERS
-- =====================================================
-- Create customer profiles for existing users who don't have one
INSERT INTO public.customer_profiles (id, email, first_name, last_name, status)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.raw_user_meta_data->>'last_name', ''),
  'active'
FROM auth.users u
LEFT JOIN public.customer_profiles cp ON u.id = cp.id
WHERE cp.id IS NULL
  AND u.email IS NOT NULL
  AND u.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. VERIFICATION
-- =====================================================
DO $$
DECLARE
  user_count INT;
  profile_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO profile_count FROM public.customer_profiles;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'AUTO-CREATE CUSTOMER PROFILE ENABLED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total users: %', user_count;
  RAISE NOTICE 'Total customer profiles: %', profile_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger created: on_auth_user_created';
  RAISE NOTICE 'New users will automatically get a customer profile';
  RAISE NOTICE '========================================';
END $$;
