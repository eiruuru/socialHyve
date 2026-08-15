ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS default_timezone text;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS schedule_timezone text;
