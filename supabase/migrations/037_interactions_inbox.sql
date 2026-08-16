-- Interactions inbox: comments + DMs synced from Meta.

ALTER TABLE public.workspace_meta_sessions
  ADD COLUMN IF NOT EXISTS granted_scopes text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.interaction_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  channel text NOT NULL CHECK (channel IN ('comment', 'dm')),
  external_thread_id text NOT NULL,
  external_object_id text,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  participant_name text,
  participant_handle text,
  participant_avatar_url text,
  preview_text text,
  last_message_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'archived')),
  is_unread boolean NOT NULL DEFAULT true,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, platform, channel, external_thread_id)
);

CREATE INDEX IF NOT EXISTS idx_interaction_threads_client_last
  ON public.interaction_threads (client_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_interaction_threads_client_status
  ON public.interaction_threads (client_id, status);

CREATE TABLE IF NOT EXISTS public.interaction_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.interaction_threads(id) ON DELETE CASCADE,
  external_message_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body text,
  media_url text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'reaction')),
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, external_message_id)
);

CREATE INDEX IF NOT EXISTS idx_interaction_messages_thread_created
  ON public.interaction_messages (thread_id, created_at);

CREATE TABLE IF NOT EXISTS public.interaction_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  last_synced_at timestamptz,
  cursor_data jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, social_account_id)
);

ALTER TABLE public.interaction_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY interaction_threads_org_team ON public.interaction_threads
  FOR ALL
  USING (public.user_is_org_team(client_id))
  WITH CHECK (public.user_is_org_team(client_id));

CREATE POLICY interaction_messages_org_team ON public.interaction_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.interaction_threads t
      WHERE t.id = thread_id AND public.user_is_org_team(t.client_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interaction_threads t
      WHERE t.id = thread_id AND public.user_is_org_team(t.client_id)
    )
  );

CREATE POLICY interaction_sync_state_org_team ON public.interaction_sync_state
  FOR ALL
  USING (public.user_is_org_team(client_id))
  WITH CHECK (public.user_is_org_team(client_id));

CREATE TRIGGER interaction_threads_updated_at
  BEFORE UPDATE ON public.interaction_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER interaction_sync_state_updated_at
  BEFORE UPDATE ON public.interaction_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
