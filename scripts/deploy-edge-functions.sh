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

SUPABASE_BIN=(npx supabase)

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "$PROJECT_REF" ] && [ -n "${VITE_SUPABASE_URL:-}" ]; then
  PROJECT_REF="$(node -e "const u=process.env.VITE_SUPABASE_URL||''; console.log((u.match(/https:\\/\\/([^.]+)\\.supabase\\.co/)||[])[1]||'')")"
fi

if [ -z "$PROJECT_REF" ]; then
  echo "Set VITE_SUPABASE_URL or SUPABASE_PROJECT_REF in .env"
  exit 1
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && [ ! -f "$HOME/.supabase/access-token" ]; then
  echo "Not authenticated. Run: npx supabase login"
  echo "Or add SUPABASE_ACCESS_TOKEN to .env"
  exit 1
fi

echo "Linking project $PROJECT_REF..."
"${SUPABASE_BIN[@]}" link --project-ref "$PROJECT_REF"

FUNCTIONS=(
  meta-oauth-start
  meta-oauth-callback
  canva-oauth-start
  canva-oauth-callback
  canva-list-designs
  canva-export-design
  publish-post
  refresh-tokens
)

for fn in "${FUNCTIONS[@]}"; do
  echo "Deploying $fn..."
  "${SUPABASE_BIN[@]}" functions deploy "$fn"
done

echo "Setting Edge Function secrets..."
bash scripts/set-secrets.sh

echo "Done. Edge Functions deployed to https://${PROJECT_REF}.supabase.co/functions/v1/"
