-- Org team can read profiles of client approvers/viewers on their clients

CREATE POLICY profiles_select_org_client_members ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_members cm
      JOIN public.clients cl ON cl.id = cm.client_id
      WHERE cm.user_id = profiles.id
        AND public.user_can_manage_all_org_clients(cl.organization_id)
    )
  );
