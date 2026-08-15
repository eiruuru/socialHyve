-- RLS policies for team and client invites (tables had RLS enabled but no policies).

CREATE OR REPLACE FUNCTION public.user_can_manage_team(org_id uuid)
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
      AND om.role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = org_id AND o.owner_id = auth.uid()
  );
$$;

CREATE POLICY org_invites_select ON public.organization_invites FOR SELECT
  USING (public.user_can_manage_team(organization_id));

CREATE POLICY org_invites_insert ON public.organization_invites FOR INSERT
  WITH CHECK (public.user_can_manage_team(organization_id));

CREATE POLICY org_invites_delete ON public.organization_invites FOR DELETE
  USING (public.user_can_manage_team(organization_id));

CREATE POLICY client_invites_select ON public.client_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = client_id
        AND public.user_can_manage_all_org_clients(cl.organization_id)
    )
  );

CREATE POLICY client_invites_insert ON public.client_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = client_id
        AND public.user_can_manage_all_org_clients(cl.organization_id)
    )
  );

CREATE POLICY client_invites_delete ON public.client_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = client_id
        AND public.user_can_manage_all_org_clients(cl.organization_id)
    )
  );
