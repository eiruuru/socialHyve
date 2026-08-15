-- Manual cron setup for socialHyve (run AFTER migrations in Supabase SQL Editor)
-- Requires pg_cron and pg_net extensions: Dashboard → Database → Extensions

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Store secrets in Vault (replace values before running)
-- Dashboard → Project Settings → API → Project URL and service_role key
SELECT vault.create_secret('https://hfbxonnowvfkxmmkgftz.supabase.co', 'supabase_url', 'Project URL');
SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key', 'Service role key');

-- Publish queue: every minute
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

-- Token refresh: weekly Sunday 3am UTC
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
