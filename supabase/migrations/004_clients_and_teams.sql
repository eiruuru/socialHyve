-- Multi-client organizations, teams, and client-scoped resources

-- ---------------------------------------------------------------------------
-- Organizations (agency — migrated from workspaces)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);

INSERT INTO public.organizations (id, name, owner_id, created_at, updated_at)
SELECT id, name, owner_id, created_at, updated_at FROM public.workspaces
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Clients (Loomly "calendars")
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_clients_organization ON public.clients(organization_id);

INSERT INTO public.clients (organization_id, name, slug)
SELECT w.id, w.name, lower(regexp_replace(w.name, '[^a-zA-Z0-9]+', '-', 'g'))
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.clients c WHERE c.organization_id = w.id
);

-- ---------------------------------------------------------------------------
-- Team & client membership
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT id, owner_id, 'owner' FROM public.organizations
ON CONFLICT (organization_id, user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.client_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('approver', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'editor')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('approver', 'viewer')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Post review tokens (magic links)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_review_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_review_tokens_token ON public.post_review_tokens(token);

-- ---------------------------------------------------------------------------
-- Post activity log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_activity_post ON public.post_activity(post_id);

-- ---------------------------------------------------------------------------
-- client_id on scoped tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS internal_name text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS first_comment text,
  ADD COLUMN IF NOT EXISTS platform_overrides jsonb NOT NULL DEFAULT '{}';

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.canva_connections
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.canva_designs
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.oauth_states
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'internal'
  CHECK (visibility IN ('internal', 'client'));

-- Backfill client_id from workspace
UPDATE public.posts p
SET client_id = c.id
FROM public.clients c
WHERE c.organization_id = p.workspace_id AND p.client_id IS NULL;

UPDATE public.social_accounts sa
SET client_id = c.id
FROM public.clients c
WHERE c.organization_id = sa.workspace_id AND sa.client_id IS NULL;

UPDATE public.canva_connections cc
SET client_id = c.id
FROM public.clients c
WHERE c.organization_id = cc.workspace_id AND cc.client_id IS NULL;

UPDATE public.canva_designs cd
SET client_id = c.id
FROM public.clients c
WHERE c.organization_id = cd.workspace_id AND cd.client_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_client ON public.posts(client_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_client ON public.social_accounts(client_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_canva_connections_client
  ON public.canva_connections(client_id) WHERE client_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_org_access(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = org_id AND om.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = org_id AND o.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_client_access(cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients cl
    JOIN public.organization_members om ON om.organization_id = cl.organization_id
    WHERE cl.id = cid AND om.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.clients cl
    JOIN public.organizations o ON o.id = cl.organization_id
    WHERE cl.id = cid AND o.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.client_members cm
    WHERE cm.client_id = cid AND cm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_org_team(cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients cl
    WHERE cl.id = cid AND public.user_has_org_access(cl.organization_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_review_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_select ON public.organizations FOR SELECT
  USING (public.user_has_org_access(id));
CREATE POLICY organizations_insert ON public.organizations FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY organizations_update ON public.organizations FOR UPDATE
  USING (public.user_has_org_access(id));

CREATE POLICY clients_all ON public.clients FOR ALL
  USING (public.user_has_org_access(organization_id))
  WITH CHECK (public.user_has_org_access(organization_id));

CREATE POLICY client_select_for_members ON public.clients FOR SELECT
  USING (public.user_has_client_access(id));

CREATE POLICY org_members_all ON public.organization_members FOR ALL
  USING (public.user_has_org_access(organization_id))
  WITH CHECK (public.user_has_org_access(organization_id));

CREATE POLICY client_members_team ON public.client_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = client_id AND public.user_has_org_access(cl.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = client_id AND public.user_has_org_access(cl.organization_id)
    )
  );

CREATE POLICY client_members_self ON public.client_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY post_activity_select ON public.post_activity FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_has_client_access(p.client_id)
  ));
CREATE POLICY post_activity_insert ON public.post_activity FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_has_client_access(p.client_id)
  ));

-- Update posts policy to also allow client members
DROP POLICY IF EXISTS posts_all ON public.posts;
CREATE POLICY posts_all ON public.posts FOR ALL
  USING (public.user_has_client_access(client_id))
  WITH CHECK (public.user_has_client_access(client_id));

DROP POLICY IF EXISTS social_accounts_all ON public.social_accounts;
CREATE POLICY social_accounts_all ON public.social_accounts FOR ALL
  USING (public.user_has_client_access(client_id))
  WITH CHECK (public.user_is_org_team(client_id));

DROP POLICY IF EXISTS canva_connections_all ON public.canva_connections;
CREATE POLICY canva_connections_all ON public.canva_connections FOR ALL
  USING (public.user_has_client_access(client_id))
  WITH CHECK (public.user_is_org_team(client_id));

DROP POLICY IF EXISTS canva_designs_all ON public.canva_designs;
CREATE POLICY canva_designs_all ON public.canva_designs FOR ALL
  USING (public.user_has_client_access(client_id))
  WITH CHECK (public.user_is_org_team(client_id));

DROP POLICY IF EXISTS oauth_states_all ON public.oauth_states;
CREATE POLICY oauth_states_all ON public.oauth_states FOR ALL
  USING (
    public.user_owns_workspace(workspace_id)
    OR (client_id IS NOT NULL AND public.user_is_org_team(client_id))
  )
  WITH CHECK (
    public.user_owns_workspace(workspace_id)
    OR (client_id IS NOT NULL AND public.user_is_org_team(client_id))
  );

-- post_comments: client members see only client-visible comments
DROP POLICY IF EXISTS post_comments_all ON public.post_comments;
CREATE POLICY post_comments_select ON public.post_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_has_client_access(p.client_id)
    AND (
      public.user_is_org_team(p.client_id)
      OR visibility = 'client'
    )
  ));
CREATE POLICY post_comments_insert ON public.post_comments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_has_client_access(p.client_id)
  ));

CREATE POLICY post_review_tokens_team ON public.post_review_tokens FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_is_org_team(p.client_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_is_org_team(p.client_id)
  ));

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
