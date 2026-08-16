-- Manual cron setup for socialHyve (run AFTER migrations in Supabase SQL Editor)
-- Requires pg_cron and pg_net extensions: Dashboard → Database → Extensions

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Store secrets in Vault (replace placeholders before first run)
-- Dashboard → Project Settings → API → Project URL and service_role key
-- Safe to re-run: skips secrets that already exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'supabase_url') THEN
    PERFORM vault.create_secret('https://hfbxonnowvfkxmmkgftz.supabase.co', 'supabase_url', 'Project URL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_key') THEN
    PERFORM vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key', 'Service role key');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_secret') THEN
    PERFORM vault.create_secret('YOUR_CRON_SECRET', 'cron_secret', 'Cron auth secret for Edge Functions');
  END IF;
END $$;

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
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
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
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Media archive: daily 4am UTC (published posts older than 30 days)
SELECT cron.unschedule('socialhyve-archive-media')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'socialhyve-archive-media');

SELECT cron.schedule(
  'socialhyve-archive-media',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/cleanup-post-media',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{"mode":"archive"}'::jsonb
  );
  $$
);

-- Orphan media sweep: weekly Sunday 4am UTC (abandoned draft imports older than 7 days)
SELECT cron.unschedule('socialhyve-orphan-media')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'socialhyve-orphan-media');

SELECT cron.schedule(
  'socialhyve-orphan-media',
  '0 4 * * 0',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/cleanup-post-media',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{"mode":"orphans"}'::jsonb
  );
  $$
);
