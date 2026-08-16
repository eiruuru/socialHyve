-- One Meta user token per client so reconnecting another client cannot overwrite tokens in memory.
CREATE TABLE IF NOT EXISTS public.client_meta_sessions (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_access_token text NOT NULL,
  token_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_meta_sessions_workspace
  ON public.client_meta_sessions(workspace_id);

ALTER TABLE public.client_meta_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_meta_sessions_all ON public.client_meta_sessions FOR ALL
  USING (public.user_has_client_access(client_id))
  WITH CHECK (public.user_is_org_team(client_id));
