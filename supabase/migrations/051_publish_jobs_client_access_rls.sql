-- Align publish_jobs / post_targets RLS with posts (user_has_client_access).
-- These tables still required workspace ownership, so org team and Creatives QA
-- could update a post but could not insert the publish queue row.

DROP POLICY IF EXISTS publish_jobs_all ON public.publish_jobs;
CREATE POLICY publish_jobs_all ON public.publish_jobs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_has_client_access(p.client_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_has_client_access(p.client_id)
  ));

DROP POLICY IF EXISTS post_targets_all ON public.post_targets;
CREATE POLICY post_targets_all ON public.post_targets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_has_client_access(p.client_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND public.user_has_client_access(p.client_id)
  ));
