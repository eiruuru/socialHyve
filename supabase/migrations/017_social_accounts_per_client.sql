-- Allow the same Facebook Page to be linked independently per client.
-- Previously UNIQUE (workspace_id, platform, external_id) meant reconnecting Meta
-- for one client could steal another client's Page row.

ALTER TABLE public.social_accounts
  DROP CONSTRAINT IF EXISTS social_accounts_workspace_id_platform_external_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_client_platform_external_id
  ON public.social_accounts (client_id, platform, external_id)
  WHERE client_id IS NOT NULL;
