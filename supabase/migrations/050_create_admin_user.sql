-- =====================================================
-- MIGRATION: Create Admin User
-- =====================================================
-- Description: Create default admin user with full permissions
-- Credentials: admin@turistpass.com / Admin123!@#
-- Date: 2025-01-19
-- =====================================================

-- =====================================================
-- CREATE ADMIN USER IN AUTH.USERS
-- =====================================================

-- First, we need to create the user in auth.users table
-- Note: Password hash is for 'Admin123!@#'
-- Generated using: SELECT crypt('Admin123!@#', gen_salt('bf'))

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@turistpass.com';

  -- If user doesn't exist, create it
  IF admin_user_id IS NULL THEN
    -- Generate a new UUID for the admin user
    admin_user_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@turistpass.com',
      crypt('Admin123!@#', gen_salt('bf')),  -- Hashed password
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Admin User"}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    );

    RAISE NOTICE 'Admin user created with ID: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user already exists with ID: %', admin_user_id;
  END IF;

  -- =====================================================
  -- CREATE OR UPDATE ADMIN PROFILE
  -- =====================================================

  -- Delete existing admin profile if it exists (to avoid conflicts)
  DELETE FROM admin_profiles WHERE email = 'admin@turistpass.com';

  -- Insert admin profile with full permissions
  INSERT INTO admin_profiles (
    id,
    email,
    name,
    role,
    permissions,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'admin@turistpass.com',
    'Admin User',
    'super_admin',
    '{
      "customers": true,
      "businesses": true,
      "passes": true,
      "orders": true,
      "support": true,
      "settings": true,
      "analytics": true
    }'::jsonb,
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Admin profile created successfully';

  -- =====================================================
  -- CREATE IDENTITY ENTRY
  -- =====================================================

  -- Delete existing identity if it exists
  DELETE FROM auth.identities WHERE user_id = admin_user_id;

  -- Insert identity
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id::text,
    admin_user_id,
    jsonb_build_object(
      'sub', admin_user_id::text,
      'email', 'admin@turistpass.com',
      'email_verified', true,
      'provider', 'email'
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Identity created successfully';

END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if admin user exists in auth.users:
-- SELECT id, email, email_confirmed_at, role FROM auth.users WHERE email = 'admin@turistpass.com';

-- Check if admin profile exists:
-- SELECT * FROM admin_profiles WHERE email = 'admin@turistpass.com';

-- Check permissions:
-- SELECT email, role, permissions FROM admin_profiles WHERE email = 'admin@turistpass.com';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Expected results:
-- ✅ User created in auth.users with email: admin@turistpass.com
-- ✅ Password: Admin123!@#
-- ✅ Admin profile created with super_admin role
-- ✅ All permissions set to true
-- ✅ Identity created for email provider
