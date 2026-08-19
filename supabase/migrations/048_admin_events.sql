-- Audit log for platform admin actions

CREATE TABLE IF NOT EXISTS public.admin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_events_created ON public.admin_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_events_actor ON public.admin_events (actor_user_id);

ALTER TABLE public.admin_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_events_select ON public.admin_events FOR SELECT
  USING (public.is_platform_admin(auth.uid()));
