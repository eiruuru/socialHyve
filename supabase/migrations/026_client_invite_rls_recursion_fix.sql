-- Break clients <-> client_invites RLS recursion introduced in 024.
-- Policies must not subquery the other table directly; use SECURITY DEFINER helpers.

CREATE OR REPLACE FUNCTION public.client_org_id(cid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cl.organization_id FROM public.clients cl WHERE cl.id = cid;
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_client_invites(cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_can_manage_all_org_clients(public.client_org_id(cid));
$$;

CREATE OR REPLACE FUNCTION public.user_has_pending_client_invite(cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_invites ci
    WHERE ci.client_id = cid
      AND public.auth_user_email() IS NOT NULL
      AND lower(ci.email) = lower(public.auth_user_email())
      AND ci.expires_at > now()
  );
$$;

DROP POLICY IF EXISTS clients_select_pending_invitee ON public.clients;
CREATE POLICY clients_select_pending_invitee ON public.clients FOR SELECT
  USING (public.user_has_pending_client_invite(id));

DROP POLICY IF EXISTS client_invites_select ON public.client_invites;
CREATE POLICY client_invites_select ON public.client_invites FOR SELECT
  USING (public.user_can_manage_client_invites(client_id));

DROP POLICY IF EXISTS client_invites_insert ON public.client_invites;
CREATE POLICY client_invites_insert ON public.client_invites FOR INSERT
  WITH CHECK (public.user_can_manage_client_invites(client_id));

DROP POLICY IF EXISTS client_invites_delete ON public.client_invites;
CREATE POLICY client_invites_delete ON public.client_invites FOR DELETE
  USING (public.user_can_manage_client_invites(client_id));

DROP POLICY IF EXISTS client_invites_update ON public.client_invites;
CREATE POLICY client_invites_update ON public.client_invites FOR UPDATE
  USING (public.user_can_manage_client_invites(client_id))
  WITH CHECK (public.user_can_manage_client_invites(client_id));
