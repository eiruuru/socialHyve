-- Track when a Facebook login can no longer publish, without deleting the session.

ALTER TABLE public.workspace_meta_sessions
  ADD COLUMN IF NOT EXISTS connection_status text NOT NULL DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS last_refresh_error text,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

ALTER TABLE public.workspace_meta_sessions
  DROP CONSTRAINT IF EXISTS workspace_meta_sessions_connection_status_check;

ALTER TABLE public.workspace_meta_sessions
  ADD CONSTRAINT workspace_meta_sessions_connection_status_check
  CHECK (connection_status IN ('connected', 'needs_reconnect'));
