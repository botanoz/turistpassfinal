-- Enable business users to upload images to business-images bucket under their own business_id folder

-- Allow SELECT already exists (public). Add INSERT/UPDATE/DELETE for business owners scoped by folder name = business_id

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Business can upload own images'
  ) THEN
    CREATE POLICY "Business can upload own images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'business-images'
        AND (storage.foldername(name))[1] = (
          SELECT business_id::text FROM public.business_accounts WHERE id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Business can update own images'
  ) THEN
    CREATE POLICY "Business can update own images"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'business-images'
        AND (storage.foldername(name))[1] = (
          SELECT business_id::text FROM public.business_accounts WHERE id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Business can delete own images'
  ) THEN
    CREATE POLICY "Business can delete own images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'business-images'
        AND (storage.foldername(name))[1] = (
          SELECT business_id::text FROM public.business_accounts WHERE id = auth.uid()
        )
      );
  END IF;
END $$;


