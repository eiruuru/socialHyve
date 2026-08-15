-- Approval workflow + comment threads (additive — does not change posts.status)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft'
  CHECK (approval_status IN ('draft', 'pending', 'approved', 'changes_requested'));

UPDATE posts SET approval_status = 'approved'
  WHERE status IN ('scheduled', 'publishing', 'published');

UPDATE posts SET approval_status = 'changes_requested'
  WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_posts_approval_queue
  ON posts (workspace_id, approval_status)
  WHERE approval_status IN ('pending', 'changes_requested');

CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY post_comments_all ON post_comments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_id AND user_owns_workspace(p.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_id AND user_owns_workspace(p.workspace_id)
  ));
