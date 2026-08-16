-- Track when an in-app invite reminder was last sent (for re-notifying logged-in users)

ALTER TABLE public.client_invites
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz NOT NULL DEFAULT now();

UPDATE public.client_invites
SET reminded_at = created_at
WHERE reminded_at IS NULL OR reminded_at < created_at;

-- Org team can bump reminded_at when resending in-app invite notifications
CREATE POLICY client_invites_update ON public.client_invites FOR UPDATE
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
