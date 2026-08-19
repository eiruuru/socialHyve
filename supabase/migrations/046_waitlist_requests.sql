-- Waitlist requests (public submit, admin review)

CREATE TABLE IF NOT EXISTS public.waitlist_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  provisioned_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_pending_email
  ON public.waitlist_requests (lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_waitlist_status_created
  ON public.waitlist_requests (status, created_at DESC);

ALTER TABLE public.waitlist_requests ENABLE ROW LEVEL SECURITY;

-- No public SELECT; inserts via waitlist-submit edge function (service role)

CREATE OR REPLACE FUNCTION public.is_provisioned_waitlist_user(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.waitlist_requests wr
    WHERE wr.provisioned_user_id = uid
      AND wr.status = 'approved'
  );
$$;
