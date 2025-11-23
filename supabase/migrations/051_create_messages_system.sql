-- =====================================================
-- CREATE MESSAGES SYSTEM
-- =====================================================
-- Messages table for user notifications and updates
-- Message settings for admin-configurable templates
-- =====================================================

-- =====================================================
-- 1. CREATE MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('notification', 'offer', 'alert', 'success')) DEFAULT 'notification',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Optional: Link to specific pass or order
    pass_id UUID REFERENCES public.passes(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON public.messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(type);

-- =====================================================
-- 2. CREATE MESSAGE TEMPLATES TABLE (Admin Settings)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('notification', 'offer', 'alert', 'success')) DEFAULT 'notification',
    title_template TEXT NOT NULL,
    content_template TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    description TEXT,
    variables JSONB DEFAULT '[]'::jsonb, -- Array of available variables like {{customer_name}}, {{pass_name}}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_message_templates_key ON public.message_templates(key);
CREATE INDEX IF NOT EXISTS idx_message_templates_enabled ON public.message_templates(enabled);

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES FOR MESSAGES
-- =====================================================

-- Service role has full access
DROP POLICY IF EXISTS "Service role has full access to messages" ON public.messages;
CREATE POLICY "Service role has full access to messages"
ON public.messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can read their own messages
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
CREATE POLICY "Users can read own messages"
ON public.messages
FOR SELECT
TO authenticated, anon
USING (customer_id = auth.uid());

-- Users can update read status of their own messages
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

-- Admins can view all messages
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
));

-- Admins can create messages
DROP POLICY IF EXISTS "Admins can create messages" ON public.messages;
CREATE POLICY "Admins can create messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
));

-- =====================================================
-- 5. RLS POLICIES FOR MESSAGE TEMPLATES
-- =====================================================

-- Service role has full access
DROP POLICY IF EXISTS "Service role has full access to templates" ON public.message_templates;
CREATE POLICY "Service role has full access to templates"
ON public.message_templates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can manage templates
DROP POLICY IF EXISTS "Admins can manage templates" ON public.message_templates;
CREATE POLICY "Admins can manage templates"
ON public.message_templates
FOR ALL
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE admin_profiles.id = auth.uid()
));

-- Public can read enabled templates (for preview purposes)
DROP POLICY IF EXISTS "Public can read enabled templates" ON public.message_templates;
CREATE POLICY "Public can read enabled templates"
ON public.message_templates
FOR SELECT
TO anon, authenticated
USING (enabled = true);

-- =====================================================
-- 6. INSERT DEFAULT MESSAGE TEMPLATES
-- =====================================================
INSERT INTO public.message_templates (key, name, type, title_template, content_template, description, variables, enabled) VALUES
    (
        'pass_activated',
        'Pass Activated',
        'success',
        'Pass Activated Successfully',
        'Your {{pass_name}} is now active and ready to use at all partner locations.',
        'Sent when a pass is activated',
        '["pass_name"]'::jsonb,
        true
    ),
    (
        'pass_expiring_soon',
        'Pass Expiring Soon',
        'alert',
        'Pass Expiring Soon',
        'Your {{pass_name}} will expire on {{expiry_date}}. Renew now to continue enjoying benefits.',
        'Sent 7 days before pass expiration',
        '["pass_name", "expiry_date"]'::jsonb,
        true
    ),
    (
        'new_partner_added',
        'New Partner Added',
        'notification',
        'New Partner Added',
        'Check out our newest partner: {{partner_name}}. Now accepting TuristPass!',
        'Sent when a new partner is added',
        '["partner_name"]'::jsonb,
        true
    ),
    (
        'special_offer',
        'Special Offer',
        'offer',
        'Special Offer: {{offer_title}}',
        '{{offer_description}} Limited time offer!',
        'Generic special offer template',
        '["offer_title", "offer_description"]'::jsonb,
        true
    ),
    (
        'order_completed',
        'Order Completed',
        'success',
        'Order Completed Successfully',
        'Your order #{{order_number}} has been completed. Total: {{total_amount}} {{currency}}. Thank you for your purchase!',
        'Sent when an order is completed',
        '["order_number", "total_amount", "currency"]'::jsonb,
        true
    ),
    (
        'welcome_message',
        'Welcome Message',
        'notification',
        'Welcome to TuristPass!',
        'Thank you for joining TuristPass, {{customer_name}}! Explore our passes to get exclusive discounts at 70+ locations in Istanbul.',
        'Sent to new customers',
        '["customer_name"]'::jsonb,
        true
    )
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON public.messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

GRANT SELECT ON public.message_templates TO anon, authenticated;
GRANT ALL ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;

-- =====================================================
-- 8. VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MESSAGES SYSTEM CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - messages (user notifications)';
  RAISE NOTICE '  - message_templates (admin templates)';
  RAISE NOTICE '';
  RAISE NOTICE 'Default templates:';
  RAISE NOTICE '  - pass_activated';
  RAISE NOTICE '  - pass_expiring_soon';
  RAISE NOTICE '  - new_partner_added';
  RAISE NOTICE '  - special_offer';
  RAISE NOTICE '  - order_completed';
  RAISE NOTICE '  - welcome_message';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS policies configured for security';
  RAISE NOTICE '========================================';
END $$;
