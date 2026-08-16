-- In-app notification preferences (separate from email notification_preferences)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS in_app_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_notification_preferences jsonb NOT NULL DEFAULT '{
    "client_invite": true,
    "org_invite": true,
    "submitted_for_review": true,
    "approved": true,
    "changes_requested": true,
    "publish_success": true,
    "publish_failed": true,
    "review_needed": true
  }'::jsonb;
