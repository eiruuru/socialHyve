#!/usr/bin/env bash
# Deploy socialHyve Edge Functions and set secrets from .env
# Prereqs: npx supabase login  OR  SUPABASE_ACCESS_TOKEN in .env
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

SUPABASE_BIN=(npx -y supabase)

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "$PROJECT_REF" ] && [ -n "${VITE_SUPABASE_URL:-}" ]; then
  PROJECT_REF="$(node -e "const u=process.env.VITE_SUPABASE_URL||''; console.log((u.match(/https:\\/\\/([^.]+)\\.supabase\\.co/)||[])[1]||'')")"
fi

if [ -z "$PROJECT_REF" ]; then
  echo "Set VITE_SUPABASE_URL or SUPABASE_PROJECT_REF in .env"
  exit 1
fi

# Verify auth — works with both old and new Supabase CLI token storage
if ! "${SUPABASE_BIN[@]}" projects list >/dev/null 2>&1; then
  if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    echo "Not authenticated. Run: npx supabase login"
    echo "Or add SUPABASE_ACCESS_TOKEN=sbp_... to .env"
    exit 1
  fi
  export SUPABASE_ACCESS_TOKEN
fi

echo "Linking project $PROJECT_REF..."
"${SUPABASE_BIN[@]}" link --project-ref "$PROJECT_REF" || true

FUNCTIONS=(
  meta-oauth-start
  meta-oauth-callback
  canva-oauth-start
  canva-oauth-callback
  canva-list-designs
  canva-get-design
  canva-get-design-pages
  canva-export-design
  meta-list-ig-media
  meta-sync-interactions
  meta-reply-interaction
  meta-interaction-action
  meta-interactions-webhook
  publish-post
  cleanup-post-media
  refresh-tokens
  review-by-token
  accept-invite
  add-member-by-email
  send-invite-email
  send-workflow-email
  create-notifications
  send-push-notification
)

for fn in "${FUNCTIONS[@]}"; do
  echo "Deploying $fn..."
  "${SUPABASE_BIN[@]}" functions deploy "$fn" --project-ref "$PROJECT_REF"
done

echo "Setting Edge Function secrets..."
bash scripts/set-secrets.sh

echo "Done. Edge Functions deployed to https://${PROJECT_REF}.supabase.co/functions/v1/"
