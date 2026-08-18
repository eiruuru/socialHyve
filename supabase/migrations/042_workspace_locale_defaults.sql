-- Workspace-level language/region and timezone defaults

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_timezone text,
  ADD COLUMN IF NOT EXISTS default_locale text;
