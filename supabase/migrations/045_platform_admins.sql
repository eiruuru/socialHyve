-- Platform superadmins (cross-tenant support console)

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_admins_select_own ON public.platform_admins FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_platform_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = uid
  );
$$;

-- Bootstrap seed for primary superadmin (no-op if account does not exist yet)
INSERT INTO public.platform_admins (user_id)
SELECT id FROM public.profiles WHERE lower(email) = 'jhinadwin@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
