-- Fix post_media RLS so client approvers can see media in review queue
DROP POLICY IF EXISTS post_media_all ON public.post_media;

CREATE POLICY post_media_select ON public.post_media FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_has_client_access(p.client_id)
  ));

CREATE POLICY post_media_insert ON public.post_media FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_is_org_team(p.client_id)
  ));

CREATE POLICY post_media_update ON public.post_media FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_is_org_team(p.client_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_is_org_team(p.client_id)
  ));

CREATE POLICY post_media_delete ON public.post_media FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_is_org_team(p.client_id)
  ));

-- Point member user_id FKs at profiles so PostgREST can embed profiles(...)
ALTER TABLE public.client_members DROP CONSTRAINT IF EXISTS client_members_user_id_fkey;
ALTER TABLE public.client_members
  ADD CONSTRAINT client_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.manager_client_assignments DROP CONSTRAINT IF EXISTS manager_client_assignments_user_id_fkey;
ALTER TABLE public.manager_client_assignments
  ADD CONSTRAINT manager_client_assignments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
