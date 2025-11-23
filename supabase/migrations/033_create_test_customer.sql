-- Create a test customer account for order simulations
-- Email: test@example.com
-- Password will be set manually via Supabase dashboard or API

-- First, create auth user (this will be done via Supabase dashboard)
-- Then create customer profile linked to that user

-- Insert test customer profile
-- Note: The UUID must match the auth.users id created in Supabase dashboard
-- For now, we'll create a placeholder that can be updated

-- Create a function to create test customer after auth user is created
CREATE OR REPLACE FUNCTION create_test_customer_profile()
RETURNS void AS $$
BEGIN
  -- This will be called after test user is created via Supabase dashboard
  -- The test user should have email: test@example.com

  -- Check if test customer already exists
  IF NOT EXISTS (
    SELECT 1 FROM customer_profiles
    WHERE email = 'test@example.com'
  ) THEN
    -- We can't directly create auth.users via SQL
    -- This is a placeholder - admin must create user via Supabase dashboard
    RAISE NOTICE 'Please create test user with email test@example.com via Supabase dashboard';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON FUNCTION create_test_customer_profile IS 'Helper to remind about creating test customer. Actual user must be created via Supabase Auth dashboard.';
