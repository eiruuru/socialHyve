-- Email notification opt-in on profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{
    "submitted_for_review": true,
    "approved": true,
    "changes_requested": true,
    "publish_failed": true
  }'::jsonb;
