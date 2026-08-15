-- Per-post Facebook Page / Instagram account selection for publishing.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS facebook_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instagram_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.post_targets
  ADD COLUMN IF NOT EXISTS social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_facebook_account ON public.posts(facebook_account_id);
CREATE INDEX IF NOT EXISTS idx_posts_instagram_account ON public.posts(instagram_account_id);
