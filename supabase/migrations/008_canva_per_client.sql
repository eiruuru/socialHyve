-- Per-client Canva connections (one Canva account per client, not per org)

ALTER TABLE public.canva_connections
  DROP CONSTRAINT IF EXISTS canva_connections_workspace_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_canva_designs_client_design
  ON public.canva_designs(client_id, canva_design_id)
  WHERE client_id IS NOT NULL;
