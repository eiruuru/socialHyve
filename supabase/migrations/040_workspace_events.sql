-- Durable workspace activity log (survives post deletion)

CREATE TABLE IF NOT EXISTS public.workspace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('post', 'client', 'member', 'invite', 'integration', 'system')),
  entity_id uuid,
  entity_label text,
  action text NOT NULL,
  detail text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_events_org_created
  ON public.workspace_events (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_events_client_created
  ON public.workspace_events (client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_events_entity
  ON public.workspace_events (entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

ALTER TABLE public.workspace_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = org_id AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = org_id AND o.owner_id = auth.uid()
  );
$$;

CREATE POLICY workspace_events_select ON public.workspace_events
  FOR SELECT
  USING (public.user_can_manage_team(organization_id));

CREATE POLICY workspace_events_insert ON public.workspace_events
  FOR INSERT
  WITH CHECK (
    public.user_belongs_to_org(organization_id)
    AND (actor_user_id IS NULL OR actor_user_id = auth.uid())
  );
