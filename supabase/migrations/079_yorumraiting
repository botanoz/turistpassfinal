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
          WHERE ba.id = auth.uid() AND ba.business_id = reviews.business_id
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
