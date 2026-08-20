-- Allow users to clear their own in-app notification inbox.

CREATE POLICY user_notifications_delete ON public.user_notifications FOR DELETE
  USING (user_id = auth.uid());
