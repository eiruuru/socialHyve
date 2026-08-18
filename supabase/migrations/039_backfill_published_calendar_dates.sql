-- Published posts without a planned date were falling back to created_at on the calendar.
UPDATE posts
SET scheduled_at = published_at
WHERE status = 'published'
  AND published_at IS NOT NULL
  AND scheduled_at IS NULL;
