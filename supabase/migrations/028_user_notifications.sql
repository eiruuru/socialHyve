-- In-app notification inbox (persisted events)

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  event text NOT NULL,
  title text NOT NULL,
  body text,
  href text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications (user_id, created_at DESC);

-- Read state for derived notifications (invites, review queue items)
CREATE TABLE IF NOT EXISTS public.user_notification_reads (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_key text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_key)
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_notifications_select ON public.user_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY user_notifications_update ON public.user_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_notification_reads_all ON public.user_notification_reads FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service / app inserts via SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_user_id uuid,
  p_type text,
  p_event text,
  p_title text,
  p_body text DEFAULT NULL,
  p_href text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.user_notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.user_notifications;
BEGIN
  INSERT INTO public.user_notifications (user_id, type, event, title, body, href, metadata)
  VALUES (p_user_id, p_type, p_event, p_title, p_body, p_href, p_metadata)
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_user_notification(uuid, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_user_notification(uuid, text, text, text, text, text, jsonb) TO service_role;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
