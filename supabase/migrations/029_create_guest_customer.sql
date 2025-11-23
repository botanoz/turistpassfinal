-- Create a guest customer for simulated purchases

-- 1. First, create the user in auth.users if it doesn't exist
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
  aud
)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'guest@example.com',
  crypt('GuestUser123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Then create the customer profile
INSERT INTO customer_profiles (id, email, first_name, last_name)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  'guest@example.com',
  'Guest',
  'User'
)
ON CONFLICT (id) DO NOTHING;
