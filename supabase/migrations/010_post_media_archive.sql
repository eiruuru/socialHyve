-- Post media archival + social permalinks

ALTER TABLE public.post_targets
  ADD COLUMN IF NOT EXISTS permalink text;

ALTER TABLE public.post_media
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_storage_path text,
  ADD COLUMN IF NOT EXISTS preview_storage_path text,
  ADD COLUMN IF NOT EXISTS original_mime_type text;

CREATE INDEX IF NOT EXISTS idx_posts_published_archive
  ON public.posts (published_at)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_post_media_unarchived
  ON public.post_media (post_id)
  WHERE archived_at IS NULL;
