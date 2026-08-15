-- Add profile branding fields for preview headers
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS profile_picture_url text,
  ADD COLUMN IF NOT EXISTS username text;
