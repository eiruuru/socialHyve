-- Invited users can view and decline their own pending client invites

CREATE OR REPLACE FUNCTION public.auth_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

CREATE POLICY client_invites_select_invitee ON public.client_invites FOR SELECT
  USING (
    public.auth_user_email() IS NOT NULL
    AND lower(email) = lower(public.auth_user_email())
  );

CREATE POLICY client_invites_delete_invitee ON public.client_invites FOR DELETE
  USING (
    public.auth_user_email() IS NOT NULL
    AND lower(email) = lower(public.auth_user_email())
  );

-- Invited users can read client name while invite is pending
CREATE POLICY clients_select_pending_invitee ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_invites ci
      WHERE ci.client_id = clients.id
        AND public.auth_user_email() IS NOT NULL
        AND lower(ci.email) = lower(public.auth_user_email())
        AND ci.expires_at > now()
    )
  );
