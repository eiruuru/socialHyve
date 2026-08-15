-- Partial unique indexes (017) do not satisfy ON CONFLICT for Supabase upserts.
-- Replace with a full unique constraint on (client_id, platform, external_id).

DROP INDEX IF EXISTS public.social_accounts_client_platform_external_id;

ALTER TABLE public.social_accounts
  ADD CONSTRAINT social_accounts_client_platform_external_id_key
  UNIQUE (client_id, platform, external_id);
