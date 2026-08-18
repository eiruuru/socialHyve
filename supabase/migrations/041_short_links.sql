-- socialHyve URL shortener (Loom.ly-style)

CREATE TABLE IF NOT EXISTS public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  original_url text NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  click_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_short_links_org ON public.short_links (organization_id);
CREATE INDEX IF NOT EXISTS idx_short_links_post ON public.short_links (post_id) WHERE post_id IS NOT NULL;

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY short_links_select ON public.short_links
  FOR SELECT
  USING (public.user_belongs_to_org(organization_id));
