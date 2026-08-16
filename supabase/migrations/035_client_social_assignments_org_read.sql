-- Org team members need to see assignment status on all pool pages (Meta Accounts tab).
CREATE POLICY client_social_assignments_org_team_read ON public.client_social_account_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients cl
      WHERE cl.id = client_social_account_assignments.client_id
        AND public.user_is_organization_team(cl.organization_id)
    )
  );
