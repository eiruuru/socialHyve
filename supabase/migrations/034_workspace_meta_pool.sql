-- Workspace-level Meta sessions + page pool + per-client assignments.

CREATE OR REPLACE FUNCTION public.user_is_organization_team(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'editor', 'manager')
  )
  OR EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = org_id
      AND o.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = org_id
      AND o.owner_id = auth.uid()
  );
$$;

CREATE TABLE IF NOT EXISTS public.workspace_meta_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meta_user_id text NOT NULL,
  meta_user_name text NOT NULL DEFAULT 'Facebook account',
  user_access_token text NOT NULL,
  token_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, meta_user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_meta_sessions_workspace
  ON public.workspace_meta_sessions(workspace_id);

CREATE TABLE IF NOT EXISTS public.client_social_account_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (social_account_id)
);

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS meta_session_id uuid REFERENCES public.workspace_meta_sessions(id) ON DELETE CASCADE;

-- Backfill workspace_meta_sessions from distinct user tokens on social_accounts.
INSERT INTO public.workspace_meta_sessions (workspace_id, meta_user_id, meta_user_name, user_access_token, token_expires_at)
SELECT DISTINCT ON (sa.workspace_id, sa.user_access_token)
  sa.workspace_id,
  'legacy_' || substr(md5(sa.user_access_token), 1, 24),
  'Facebook account',
  sa.user_access_token,
  sa.token_expires_at
FROM public.social_accounts sa
WHERE sa.user_access_token IS NOT NULL
ORDER BY sa.workspace_id, sa.user_access_token, sa.updated_at DESC NULLS LAST
ON CONFLICT (workspace_id, meta_user_id) DO NOTHING;

-- Also seed from client_meta_sessions when present.
INSERT INTO public.workspace_meta_sessions (workspace_id, meta_user_id, meta_user_name, user_access_token, token_expires_at)
SELECT
  cms.workspace_id,
  'legacy_client_' || substr(md5(cms.user_access_token), 1, 20),
  'Facebook account',
  cms.user_access_token,
  cms.token_expires_at
FROM public.client_meta_sessions cms
WHERE cms.user_access_token IS NOT NULL
ON CONFLICT (workspace_id, meta_user_id) DO NOTHING;

-- Default session per workspace for rows missing user_access_token.
INSERT INTO public.workspace_meta_sessions (workspace_id, meta_user_id, meta_user_name, user_access_token, token_expires_at)
SELECT DISTINCT
  sa.workspace_id,
  'legacy_ws_' || substr(md5(sa.workspace_id::text), 1, 24),
  'Facebook account',
  sa.access_token,
  sa.token_expires_at
FROM public.social_accounts sa
WHERE sa.meta_session_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_meta_sessions wms
    WHERE wms.workspace_id = sa.workspace_id
  )
ON CONFLICT (workspace_id, meta_user_id) DO NOTHING;

UPDATE public.social_accounts sa
SET meta_session_id = wms.id
FROM public.workspace_meta_sessions wms
WHERE sa.meta_session_id IS NULL
  AND sa.user_access_token IS NOT NULL
  AND sa.workspace_id = wms.workspace_id
  AND sa.user_access_token = wms.user_access_token;

UPDATE public.social_accounts sa
SET meta_session_id = wms.id
FROM public.workspace_meta_sessions wms
WHERE sa.meta_session_id IS NULL
  AND sa.workspace_id = wms.workspace_id
  AND wms.meta_user_id LIKE 'legacy_ws_%';

-- Ensure every remaining account has a session (create one per workspace if needed).
INSERT INTO public.workspace_meta_sessions (workspace_id, meta_user_id, meta_user_name, user_access_token, token_expires_at)
SELECT DISTINCT
  sa.workspace_id,
  'legacy_fallback_' || substr(md5(sa.workspace_id::text || sa.id::text), 1, 20),
  'Facebook account',
  sa.access_token,
  sa.token_expires_at
FROM public.social_accounts sa
WHERE sa.meta_session_id IS NULL
ON CONFLICT (workspace_id, meta_user_id) DO NOTHING;

UPDATE public.social_accounts sa
SET meta_session_id = wms.id
FROM public.workspace_meta_sessions wms
WHERE sa.meta_session_id IS NULL
  AND sa.workspace_id = wms.workspace_id
  AND wms.meta_user_id LIKE 'legacy_fallback_%';

-- Assignments from existing client_id links.
INSERT INTO public.client_social_account_assignments (client_id, social_account_id, platform, is_primary)
SELECT sa.client_id, sa.id, sa.platform, sa.is_primary
FROM public.social_accounts sa
WHERE sa.client_id IS NOT NULL
ON CONFLICT (social_account_id) DO NOTHING;

-- Dedupe pool rows: keep newest per (workspace_id, platform, external_id).
WITH canonical AS (
  SELECT DISTINCT ON (workspace_id, platform, external_id)
    id AS keep_id,
    workspace_id,
    platform,
    external_id
  FROM public.social_accounts
  ORDER BY workspace_id, platform, external_id, updated_at DESC NULLS LAST, id DESC
),
dupes AS (
  SELECT sa.id AS dupe_id, c.keep_id
  FROM public.social_accounts sa
  INNER JOIN canonical c
    ON sa.workspace_id = c.workspace_id
    AND sa.platform = c.platform
    AND sa.external_id = c.external_id
  WHERE sa.id <> c.keep_id
)
UPDATE public.client_social_account_assignments a
SET social_account_id = d.keep_id
FROM dupes d
WHERE a.social_account_id = d.dupe_id;

WITH canonical AS (
  SELECT DISTINCT ON (workspace_id, platform, external_id)
    id AS keep_id,
    workspace_id,
    platform,
    external_id
  FROM public.social_accounts
  ORDER BY workspace_id, platform, external_id, updated_at DESC NULLS LAST, id DESC
),
dupes AS (
  SELECT sa.id AS dupe_id, c.keep_id
  FROM public.social_accounts sa
  INNER JOIN canonical c
    ON sa.workspace_id = c.workspace_id
    AND sa.platform = c.platform
    AND sa.external_id = c.external_id
  WHERE sa.id <> c.keep_id
)
UPDATE public.posts p
SET facebook_account_id = d.keep_id
FROM dupes d
WHERE p.facebook_account_id = d.dupe_id;

WITH canonical AS (
  SELECT DISTINCT ON (workspace_id, platform, external_id)
    id AS keep_id,
    workspace_id,
    platform,
    external_id
  FROM public.social_accounts
  ORDER BY workspace_id, platform, external_id, updated_at DESC NULLS LAST, id DESC
),
dupes AS (
  SELECT sa.id AS dupe_id, c.keep_id
  FROM public.social_accounts sa
  INNER JOIN canonical c
    ON sa.workspace_id = c.workspace_id
    AND sa.platform = c.platform
    AND sa.external_id = c.external_id
  WHERE sa.id <> c.keep_id
)
UPDATE public.posts p
SET instagram_account_id = d.keep_id
FROM dupes d
WHERE p.instagram_account_id = d.dupe_id;

WITH canonical AS (
  SELECT DISTINCT ON (workspace_id, platform, external_id)
    id AS keep_id,
    workspace_id,
    platform,
    external_id
  FROM public.social_accounts
  ORDER BY workspace_id, platform, external_id, updated_at DESC NULLS LAST, id DESC
),
dupes AS (
  SELECT sa.id AS dupe_id
  FROM public.social_accounts sa
  INNER JOIN canonical c
    ON sa.workspace_id = c.workspace_id
    AND sa.platform = c.platform
    AND sa.external_id = c.external_id
  WHERE sa.id <> c.keep_id
)
DELETE FROM public.social_accounts sa
WHERE sa.id IN (SELECT dupe_id FROM dupes);

-- Replace per-client unique with workspace pool unique.
ALTER TABLE public.social_accounts
  DROP CONSTRAINT IF EXISTS social_accounts_client_platform_external_id_key;

DROP INDEX IF EXISTS public.social_accounts_one_primary_per_client_platform;

ALTER TABLE public.social_accounts
  DROP CONSTRAINT IF EXISTS social_accounts_workspace_id_platform_external_id_key;

ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_workspace_platform_external_id_key
  UNIQUE (workspace_id, platform, external_id);

DROP POLICY IF EXISTS social_accounts_all ON public.social_accounts;

CREATE POLICY social_accounts_select ON public.social_accounts FOR SELECT
  USING (public.user_is_organization_team(workspace_id));

CREATE POLICY social_accounts_write ON public.social_accounts FOR ALL
  USING (public.user_is_org_admin(workspace_id))
  WITH CHECK (public.user_is_org_admin(workspace_id));

-- Drop legacy columns from pool rows.
ALTER TABLE public.social_accounts
  DROP COLUMN IF EXISTS client_id,
  DROP COLUMN IF EXISTS is_primary;

ALTER TABLE public.social_accounts
  ALTER COLUMN meta_session_id SET NOT NULL;

DROP TABLE IF EXISTS public.client_meta_sessions;

CREATE UNIQUE INDEX IF NOT EXISTS client_social_one_primary_per_client_platform
  ON public.client_social_account_assignments (client_id, platform)
  WHERE is_primary = true;

-- RLS
ALTER TABLE public.workspace_meta_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_social_account_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_meta_sessions_select ON public.workspace_meta_sessions FOR SELECT
  USING (public.user_is_organization_team(workspace_id));

CREATE POLICY workspace_meta_sessions_write ON public.workspace_meta_sessions FOR ALL
  USING (public.user_is_org_admin(workspace_id))
  WITH CHECK (public.user_is_org_admin(workspace_id));

CREATE POLICY client_social_assignments_select ON public.client_social_account_assignments FOR SELECT
  USING (public.user_has_client_access(client_id));

CREATE POLICY client_social_assignments_write ON public.client_social_account_assignments FOR ALL
  USING (public.user_is_org_team(client_id))
  WITH CHECK (public.user_is_org_team(client_id));
