-- Manager team role: org members assigned to specific clients for client-scoped access.

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'manager'));

ALTER TABLE public.organization_invites
  DROP CONSTRAINT IF EXISTS organization_invites_role_check;
ALTER TABLE public.organization_invites
  ADD CONSTRAINT organization_invites_role_check
  CHECK (role IN ('admin', 'editor', 'manager'));

CREATE TABLE IF NOT EXISTS public.manager_client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_client_assignments_client
  ON public.manager_client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_manager_client_assignments_user
  ON public.manager_client_assignments(user_id);

-- Full client access for owner, admin, and editor (agency-wide).
CREATE OR REPLACE FUNCTION public.user_can_manage_all_org_clients(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'editor')
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
    WHERE cl.id = cid AND public.user_can_manage_all_org_clients(cl.organization_id)
  ) OR EXISTS (
    SELECT 1 FROM public.manager_client_assignments mca
    JOIN public.organization_members om
      ON om.user_id = mca.user_id
      AND om.role = 'manager'
    JOIN public.clients cl ON cl.id = mca.client_id
    WHERE mca.client_id = cid
      AND mca.user_id = auth.uid()
      AND om.organization_id = cl.organization_id
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
    WHERE cl.id = cid AND public.user_can_manage_all_org_clients(cl.organization_id)
  ) OR EXISTS (
    SELECT 1 FROM public.manager_client_assignments mca
    JOIN public.organization_members om
      ON om.user_id = mca.user_id
      AND om.role = 'manager'
    JOIN public.clients cl ON cl.id = mca.client_id
    WHERE mca.client_id = cid
      AND mca.user_id = auth.uid()
      AND om.organization_id = cl.organization_id
  );
$$;

-- Managers only see assigned clients; editors/admins see all org clients.
DROP POLICY IF EXISTS clients_all ON public.clients;
DROP POLICY IF EXISTS client_select_for_members ON public.clients;

CREATE POLICY clients_select ON public.clients FOR SELECT
  USING (public.user_has_client_access(id));

CREATE POLICY clients_insert ON public.clients FOR INSERT
  WITH CHECK (public.user_can_manage_all_org_clients(organization_id));

CREATE POLICY clients_update ON public.clients FOR UPDATE
  USING (public.user_can_manage_all_org_clients(organization_id))
  WITH CHECK (public.user_can_manage_all_org_clients(organization_id));

CREATE POLICY clients_delete ON public.clients FOR DELETE
  USING (public.user_can_manage_all_org_clients(organization_id));

ALTER TABLE public.manager_client_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY manager_assignments_select ON public.manager_client_assignments FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = client_id
        AND public.user_can_manage_all_org_clients(cl.organization_id)
    )
  );

CREATE POLICY manager_assignments_manage ON public.manager_client_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = client_id
        AND public.user_can_manage_all_org_clients(cl.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = client_id
        AND public.user_can_manage_all_org_clients(cl.organization_id)
    )
  );
