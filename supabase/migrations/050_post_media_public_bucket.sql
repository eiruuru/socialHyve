-- Ensure post-media is public even if the bucket was created private in the dashboard.
-- The original insert used ON CONFLICT DO NOTHING, which cannot repair a private bucket.

UPDATE storage.buckets
SET public = true
WHERE id = 'post-media';

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS post_media_storage_update ON storage.objects;
CREATE POLICY post_media_storage_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
  );
