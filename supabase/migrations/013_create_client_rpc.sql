-- Create clients via SECURITY DEFINER RPC so inserts succeed for authorized org members
-- even when RLS policies or missing organization_members rows block direct inserts.

CREATE OR REPLACE FUNCTION public.create_client(p_name text, p_timezone text DEFAULT NULL)
RETURNS public.clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := auth.uid();
  v_base_slug text;
  v_slug text;
  v_n integer := 2;
  v_client public.clients;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Client name is required';
  END IF;

  SELECT om.organization_id
  INTO v_org_id
  FROM public.organization_members om
  WHERE om.user_id = v_user_id
    AND om.role IN ('owner', 'admin', 'editor')
  ORDER BY om.created_at
  LIMIT 1;

  IF v_org_id IS NULL THEN
    SELECT o.id
    INTO v_org_id
    FROM public.organizations o
    WHERE o.owner_id = v_user_id
    ORDER BY o.created_at
    LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    SELECT w.id
    INTO v_org_id
    FROM public.workspaces w
    WHERE w.owner_id = v_user_id
    ORDER BY w.created_at
    LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = v_org_id
        AND om.user_id = v_user_id
        AND om.role IN ('owner', 'admin', 'editor')
    )
    OR EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = v_org_id AND o.owner_id = v_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.workspaces w
      WHERE w.id = v_org_id AND w.owner_id = v_user_id
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to create clients';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  SELECT v_org_id, v_user_id, 'owner'
  FROM public.organizations o
  WHERE o.id = v_org_id AND o.owner_id = v_user_id
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  v_base_slug := lower(regexp_replace(btrim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := regexp_replace(v_base_slug, '(^-+|-+$)', '', 'g');
  IF v_base_slug = '' THEN
    v_base_slug := 'client';
  END IF;

  v_slug := v_base_slug;
  WHILE EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.organization_id = v_org_id AND c.slug = v_slug
  ) LOOP
    v_slug := v_base_slug || '-' || v_n::text;
    v_n := v_n + 1;
  END LOOP;

  INSERT INTO public.clients (organization_id, name, slug, default_timezone)
  VALUES (
    v_org_id,
    btrim(p_name),
    v_slug,
    COALESCE(NULLIF(btrim(p_timezone), ''), 'UTC')
  )
  RETURNING * INTO v_client;

  RETURN v_client;
END;
$$;

REVOKE ALL ON FUNCTION public.create_client(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client(text, text) TO authenticated;
