-- Check how many users and customer profiles we have
SELECT
  'Auth Users' as source,
  COUNT(*) as count
FROM auth.users
WHERE deleted_at IS NULL

UNION ALL

SELECT
  'Customer Profiles' as source,
  COUNT(*) as count
FROM public.customer_profiles

UNION ALL

SELECT
  'Users without Profile' as source,
  COUNT(*) as count
FROM auth.users u
LEFT JOIN public.customer_profiles cp ON u.id = cp.id
WHERE cp.id IS NULL
  AND u.deleted_at IS NULL;

-- Show users without profiles
SELECT
  u.id,
  u.email,
  u.created_at,
  'NO PROFILE' as status
FROM auth.users u
LEFT JOIN public.customer_profiles cp ON u.id = cp.id
WHERE cp.id IS NULL
  AND u.deleted_at IS NULL
LIMIT 10;

-- Show recent messages
SELECT
  m.id,
  m.customer_id,
  m.title,
  m.created_at,
  cp.email as customer_email
FROM public.messages m
LEFT JOIN public.customer_profiles cp ON m.customer_id = cp.id
ORDER BY m.created_at DESC
LIMIT 10;
