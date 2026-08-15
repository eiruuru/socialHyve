-- Replace partial unique index with a constraint PostgREST upsert can target reliably.

DROP INDEX IF EXISTS public.idx_canva_connections_client;

ALTER TABLE public.canva_connections
  DROP CONSTRAINT IF EXISTS canva_connections_client_id_key;

ALTER TABLE public.canva_connections
  ADD CONSTRAINT canva_connections_client_id_key UNIQUE (client_id);
