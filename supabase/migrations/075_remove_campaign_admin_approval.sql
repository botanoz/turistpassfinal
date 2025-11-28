-- =====================================================
-- REMOVE: Campaign Admin Approval Requirement
-- =====================================================
-- Purpose: Allow businesses to manage their own campaigns without admin approval
-- Requested by: User wants businesses to have full control over their campaigns
-- Date: 2025-01-27
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REMOVING CAMPAIGN ADMIN APPROVAL';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 1. REMOVE ADMIN APPROVAL COLUMNS (Keep for audit history)
-- =====================================================
-- Note: We'll keep the columns for historical data but stop using them in logic
-- Campaigns will go directly to 'active' status when created

DO $$
BEGIN
  RAISE NOTICE 'Keeping admin approval columns for audit purposes';
  RAISE NOTICE '- admin_approved: kept for historical records';
  RAISE NOTICE '- admin_reviewed_by, admin_reviewed_at: kept for audit trail';
  RAISE NOTICE '- admin_notes, rejection_reason: kept for reference';
END $$;

-- =====================================================
-- 2. UPDATE PENDING_APPROVAL CAMPAIGNS TO ACTIVE
-- =====================================================
-- Auto-activate all campaigns that were waiting for approval

UPDATE business_campaigns
SET
  status = 'active',
  admin_approved = true,
  updated_at = NOW()
WHERE
  status = 'pending_approval'
  AND start_date <= NOW()
  AND end_date >= NOW();

-- For future campaigns, set them to 'pending' (will auto-activate on start date)
UPDATE business_campaigns
SET
  status = 'pending',
  admin_approved = true,
  updated_at = NOW()
WHERE
  status = 'pending_approval'
  AND start_date > NOW();

-- =====================================================
-- 3. UPDATE CHECK CONSTRAINT TO ALLOW AUTO-ACTIVATION
-- =====================================================
-- Remove 'pending_approval' and 'rejected' from valid statuses
-- Businesses now control: draft, pending, active, paused, completed, cancelled

ALTER TABLE business_campaigns DROP CONSTRAINT IF EXISTS business_campaigns_status_check;

ALTER TABLE business_campaigns
  ADD CONSTRAINT business_campaigns_status_check
  CHECK (status IN ('draft', 'pending', 'active', 'paused', 'completed', 'cancelled'));

-- =====================================================
-- 4. CREATE TRIGGER TO AUTO-ACTIVATE CAMPAIGNS
-- =====================================================
-- When a campaign's start_date arrives, automatically set it to active

CREATE OR REPLACE FUNCTION auto_activate_campaign()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is 'pending' and start date has arrived, activate it
  IF NEW.status = 'pending' AND NEW.start_date <= NOW() AND NEW.end_date >= NOW() THEN
    NEW.status := 'active';
    RAISE NOTICE 'Auto-activated campaign: %', NEW.title;
  END IF;

  -- If end date has passed, mark as completed
  IF (NEW.status = 'active' OR NEW.status = 'pending') AND NEW.end_date < NOW() THEN
    NEW.status := 'completed';
    RAISE NOTICE 'Auto-completed campaign: %', NEW.title;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_activate_campaign ON business_campaigns;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trigger_auto_activate_campaign
  BEFORE INSERT OR UPDATE ON business_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION auto_activate_campaign();

-- =====================================================
-- 5. UPDATE RLS POLICIES
-- =====================================================
-- Businesses can now insert campaigns directly as 'active' or 'pending'

-- Drop old policy
DROP POLICY IF EXISTS "Businesses can create campaigns" ON business_campaigns;

-- Create new policy without admin approval check
CREATE POLICY "Businesses can create campaigns"
  ON business_campaigns FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_accounts
      WHERE id = auth.uid()
    )
    AND status IN ('draft', 'pending', 'active')
  );

-- =====================================================
-- 6. REMOVE ADMIN APPROVAL FROM API LOGIC
-- =====================================================
-- Note: This is handled in the application code, not in the database
-- The admin_approved column will always be set to true for new campaigns

DO $$
BEGIN
  RAISE NOTICE 'Application changes needed:';
  RAISE NOTICE '- Remove admin approval workflow from frontend';
  RAISE NOTICE '- Remove /admin/campaign-approvals page or repurpose it';
  RAISE NOTICE '- Set admin_approved=true by default in business API';
  RAISE NOTICE '- Remove status=pending_approval from campaign creation';
END $$;

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

DO $$
DECLARE
  active_count INT;
  pending_count INT;
BEGIN
  SELECT COUNT(*) INTO active_count FROM business_campaigns WHERE status = 'active';
  SELECT COUNT(*) INTO pending_count FROM business_campaigns WHERE status = 'pending';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION 075 COMPLETED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '- Removed pending_approval and rejected statuses';
  RAISE NOTICE '- All campaigns now self-managed by businesses';
  RAISE NOTICE '- Auto-activation trigger added';
  RAISE NOTICE '- Auto-completion trigger added';
  RAISE NOTICE '- RLS policies updated for direct activation';
  RAISE NOTICE '';
  RAISE NOTICE 'Current campaign stats:';
  RAISE NOTICE '- Active campaigns: %', active_count;
  RAISE NOTICE '- Pending campaigns: %', pending_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Campaign Lifecycle (NEW):';
  RAISE NOTICE '1. Business creates campaign → draft';
  RAISE NOTICE '2. Business activates → pending (if future) or active (if now)';
  RAISE NOTICE '3. Start date arrives → auto-activates to active';
  RAISE NOTICE '4. End date passes → auto-completes to completed';
  RAISE NOTICE '5. Business can pause/cancel anytime';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin Involvement: NONE (businesses have full control)';
  RAISE NOTICE '========================================';
END $$;
