-- socialHyve initial schema

-- ---------------------------------------------------------------------------
-- Workspaces
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);

-- ---------------------------------------------------------------------------
-- Social accounts (Facebook Pages + Instagram)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  external_id text NOT NULL,
  name text NOT NULL,
  access_token text NOT NULL,
  token_expires_at timestamptz,
  page_id text,
  ig_user_id text,
  page_access_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_workspace ON public.social_accounts(workspace_id);

-- ---------------------------------------------------------------------------
-- Canva connections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.canva_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Canva design cache
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.canva_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  canva_design_id text NOT NULL,
  title text,
  thumbnail_url text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, canva_design_id)
);

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  caption text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  error_message text,
  publish_facebook boolean NOT NULL DEFAULT true,
  publish_instagram boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_workspace ON public.posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON public.posts(status, scheduled_at) WHERE status = 'scheduled';

-- ---------------------------------------------------------------------------
-- Post targets (per-platform publish results)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'skipped')),
  external_post_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, platform)
);

-- ---------------------------------------------------------------------------
-- Post media
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('upload', 'canva')),
  canva_design_id text,
  storage_path text,
  public_url text,
  mime_type text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_media_post ON public.post_media(post_id);

-- ---------------------------------------------------------------------------
-- Publish jobs queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publish_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id)
);

CREATE INDEX IF NOT EXISTS idx_publish_jobs_next_run ON public.publish_jobs(next_run_at) WHERE attempts < max_attempts;

-- ---------------------------------------------------------------------------
-- OAuth state (PKCE verifiers, Meta state)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('meta', 'canva')),
  state text NOT NULL UNIQUE,
  code_verifier text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON public.oauth_states(state);

-- ---------------------------------------------------------------------------
-- Helper: check workspace ownership
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_owns_workspace(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = ws_id AND w.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canva_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canva_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspaces_select ON public.workspaces FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY workspaces_delete ON public.workspaces FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY social_accounts_all ON public.social_accounts FOR ALL
  USING (public.user_owns_workspace(workspace_id))
  WITH CHECK (public.user_owns_workspace(workspace_id));

CREATE POLICY canva_connections_all ON public.canva_connections FOR ALL
  USING (public.user_owns_workspace(workspace_id))
  WITH CHECK (public.user_owns_workspace(workspace_id));

CREATE POLICY canva_designs_all ON public.canva_designs FOR ALL
  USING (public.user_owns_workspace(workspace_id))
  WITH CHECK (public.user_owns_workspace(workspace_id));

CREATE POLICY posts_all ON public.posts FOR ALL
  USING (public.user_owns_workspace(workspace_id))
  WITH CHECK (public.user_owns_workspace(workspace_id));

CREATE POLICY post_targets_all ON public.post_targets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_owns_workspace(p.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_owns_workspace(p.workspace_id)
  ));

CREATE POLICY post_media_all ON public.post_media FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_owns_workspace(p.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_owns_workspace(p.workspace_id)
  ));

CREATE POLICY publish_jobs_all ON public.publish_jobs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_owns_workspace(p.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_owns_workspace(p.workspace_id)
  ));

CREATE POLICY oauth_states_all ON public.oauth_states FOR ALL
  USING (public.user_owns_workspace(workspace_id))
  WITH CHECK (public.user_owns_workspace(workspace_id));

-- ---------------------------------------------------------------------------
-- Storage bucket for post media
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY post_media_storage_select ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY post_media_storage_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY post_media_storage_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-media'
    AND auth.role() = 'authenticated'
  );

-- ---------------------------------------------------------------------------
-- Updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER social_accounts_updated_at BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER canva_connections_updated_at BEFORE UPDATE ON public.canva_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER post_targets_updated_at BEFORE UPDATE ON public.post_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER publish_jobs_updated_at BEFORE UPDATE ON public.publish_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
