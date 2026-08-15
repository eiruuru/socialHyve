-- Ensure org owners can manage clients even when organization_members row is missing.
-- Also backfill owner membership rows for existing organizations.

INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT o.id, o.owner_id, 'owner'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om
  WHERE om.organization_id = o.id AND om.user_id = o.owner_id
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

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
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = org_id AND w.owner_id = auth.uid()
  );
$$;
