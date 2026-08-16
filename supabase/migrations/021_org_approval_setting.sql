-- Org-level approval gate for schedule/publish

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS require_approval_before_publish boolean NOT NULL DEFAULT true;
