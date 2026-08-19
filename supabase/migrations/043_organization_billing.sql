-- Organization billing (Creem subscriptions)

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan text CHECK (plan IN ('starter', 'pro')),
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS creem_customer_id text,
  ADD COLUMN IF NOT EXISTS creem_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_subscription_status_check
  CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled'));

CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  creem_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_org ON public.billing_events(organization_id);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_events_select ON public.billing_events FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      UNION
      SELECT o.id FROM public.organizations o WHERE o.owner_id = auth.uid()
    )
  );

-- Grandfather existing workspaces to Pro so current users keep full access.
UPDATE public.organizations
SET
  plan = COALESCE(plan, 'pro'),
  subscription_status = CASE
    WHEN subscription_status = 'none' THEN 'active'
    ELSE subscription_status
  END
WHERE plan IS NULL OR subscription_status = 'none';
