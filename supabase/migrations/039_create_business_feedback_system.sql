-- =====================================================
-- MIGRATION: Business feedback & support system
-- =====================================================
-- Creates: reviews, review_replies, support_tickets, support_responses,
--          business_notifications tables with RLS tied to business_accounts
-- Date: 2025-11-07
-- =====================================================

-- Ensure extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Reviews ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NULL, -- optional link to customer
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  replied_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;

-- RLS: Business can read reviews for their own business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='Business can read own reviews'
  ) THEN
    CREATE POLICY "Business can read own reviews"
      ON reviews FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM business_accounts ba
          WHERE ba.id = auth.uid()
            AND ba.business_id = reviews.business_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='review_replies' AND policyname='Business can read own review replies'
  ) THEN
    CREATE POLICY "Business can read own review replies"
      ON review_replies FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM reviews r
          JOIN business_accounts ba ON ba.business_id = r.business_id
          WHERE r.id = review_replies.review_id AND ba.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='review_replies' AND policyname='Business can reply to own reviews'
  ) THEN
    CREATE POLICY "Business can reply to own reviews"
      ON review_replies FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM reviews r
          JOIN business_accounts ba ON ba.business_id = r.business_id
          WHERE r.id = review_replies.review_id AND ba.id = auth.uid()
        )
      );
  END IF;
END $$;

-- 2) Support ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('open','in_progress','resolved')) DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('business','admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_responses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='support_tickets' AND policyname='Business can read own tickets'
  ) THEN
    CREATE POLICY "Business can read own tickets"
      ON support_tickets FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM business_accounts ba
          WHERE ba.id = auth.uid() AND ba.business_id = support_tickets.business_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='support_tickets' AND policyname='Business can create own tickets'
  ) THEN
    CREATE POLICY "Business can create own tickets"
      ON support_tickets FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM business_accounts ba
          WHERE ba.id = auth.uid() AND ba.business_id = support_tickets.business_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='support_responses' AND policyname='Business can read own ticket responses'
  ) THEN
    CREATE POLICY "Business can read own ticket responses"
      ON support_responses FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM support_tickets t
          JOIN business_accounts ba ON ba.business_id = t.business_id
          WHERE t.id = support_responses.ticket_id AND ba.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='support_responses' AND policyname='Business can respond to own tickets'
  ) THEN
    CREATE POLICY "Business can respond to own tickets"
      ON support_responses FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM support_tickets t
          JOIN business_accounts ba ON ba.business_id = t.business_id
          WHERE t.id = support_responses.ticket_id AND ba.id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_tickets_updated_at ON support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- 3) Notifications ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('success','info','alert','offer')) DEFAULT 'info',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE business_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_notifications' AND policyname='Business can read own notifications'
  ) THEN
    CREATE POLICY "Business can read own notifications"
      ON business_notifications FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM business_accounts ba
          WHERE ba.id = auth.uid() AND ba.business_id = business_notifications.business_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_notifications' AND policyname='Business can update notification read'
  ) THEN
    CREATE POLICY "Business can update notification read"
      ON business_notifications FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM business_accounts ba
          WHERE ba.id = auth.uid() AND ba.business_id = business_notifications.business_id
        )
      );
  END IF;
END $$;


