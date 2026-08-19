-- Require Pro plan for team and client member invites.

CREATE OR REPLACE FUNCTION public.org_has_pro_plan(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = org_id
      AND o.plan = 'pro'
      AND o.subscription_status IN ('active', 'trialing')
  );
$$;

DROP POLICY IF EXISTS org_invites_insert ON public.organization_invites;
CREATE POLICY org_invites_insert ON public.organization_invites FOR INSERT
  WITH CHECK (
    public.user_can_manage_team(organization_id)
    AND public.org_has_pro_plan(organization_id)
  );

DROP POLICY IF EXISTS client_invites_insert ON public.client_invites;
CREATE POLICY client_invites_insert ON public.client_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients cl
      WHERE cl.id = client_id
        AND public.user_can_manage_all_org_clients(cl.organization_id)
        AND public.org_has_pro_plan(cl.organization_id)
    )
  );
