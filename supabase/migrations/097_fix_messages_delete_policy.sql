-- =====================================================
-- FIX MESSAGES DELETE POLICY
-- =====================================================
-- Add DELETE policy for users to delete their own messages
-- =====================================================

-- Users can delete their own messages
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (customer_id = auth.uid());

-- Admins can delete any message
DROP POLICY IF EXISTS "Admins can delete messages" ON public.messages;
CREATE POLICY "Admins can delete messages"
ON public.messages
FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
));

-- Grant DELETE permission
GRANT DELETE ON public.messages TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MESSAGES DELETE POLICY FIXED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users can now delete their own messages';
  RAISE NOTICE 'Admins can delete any message';
  RAISE NOTICE '========================================';
END $$;
