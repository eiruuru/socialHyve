-- Long-lived user token for re-fetching Page tokens at publish time.
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS user_access_token text;
