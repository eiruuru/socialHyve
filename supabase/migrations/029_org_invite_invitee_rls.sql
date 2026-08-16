-- Invited users can view and decline their own pending organization invites

CREATE POLICY organization_invites_select_invitee ON public.organization_invites FOR SELECT
  USING (
    public.auth_user_email() IS NOT NULL
    AND lower(email) = lower(public.auth_user_email())
  );

CREATE POLICY organization_invites_delete_invitee ON public.organization_invites FOR DELETE
  USING (
    public.auth_user_email() IS NOT NULL
    AND lower(email) = lower(public.auth_user_email())
  );
