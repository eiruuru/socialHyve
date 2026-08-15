-- Per-client default Facebook Page / Instagram account for publishing and previews.

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_one_primary_per_client_platform
  ON public.social_accounts (client_id, platform)
  WHERE is_primary = true AND client_id IS NOT NULL;

-- Backfill: oldest account per client + platform becomes primary.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, platform
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.social_accounts
  WHERE client_id IS NOT NULL
)
UPDATE public.social_accounts sa
SET is_primary = true
FROM ranked r
WHERE sa.id = r.id
  AND r.rn = 1
  AND NOT EXISTS (
    SELECT 1
    FROM public.social_accounts existing
    WHERE existing.client_id = sa.client_id
      AND existing.platform = sa.platform
      AND existing.is_primary = true
      AND existing.id <> sa.id
  );
