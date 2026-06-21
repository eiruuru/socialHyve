-- pg_cron jobs for publish queue and token refresh
-- Requires pg_cron and pg_net extensions (enable in Supabase dashboard)

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Run publish queue every minute
SELECT cron.unschedule('socialhyve-publish-queue')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'socialhyve-publish-queue');

SELECT cron.schedule(
  'socialhyve-publish-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/publish-post',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{"mode":"queue"}'::jsonb
  );
  $$
);

-- Refresh OAuth tokens weekly (Sunday 3am UTC)
SELECT cron.unschedule('socialhyve-refresh-tokens')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'socialhyve-refresh-tokens');

SELECT cron.schedule(
  'socialhyve-refresh-tokens',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/refresh-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
