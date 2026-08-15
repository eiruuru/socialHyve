#!/usr/bin/env bash
# Push Edge Function secrets from .env to Supabase
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "$PROJECT_REF" ] && [ -n "${VITE_SUPABASE_URL:-}" ]; then
  PROJECT_REF="$(node -e "const u=process.env.VITE_SUPABASE_URL||''; console.log((u.match(/https:\\/\\/([^.]+)\\.supabase\\.co/)||[])[1]||'')")"
fi

if [ -z "$PROJECT_REF" ]; then
  echo "Set VITE_SUPABASE_URL or SUPABASE_PROJECT_REF in .env"
  exit 1
fi

# Auto-fill redirect URIs from project ref if not set
export META_REDIRECT_URI="${META_REDIRECT_URI:-https://${PROJECT_REF}.supabase.co/functions/v1/meta-oauth-callback}"
export CANVA_REDIRECT_URI="${CANVA_REDIRECT_URI:-https://${PROJECT_REF}.supabase.co/functions/v1/canva-oauth-callback}"
export APP_URL="${APP_URL:-http://localhost:5173}"

required=(META_APP_ID META_APP_SECRET CANVA_CLIENT_ID CANVA_CLIENT_SECRET)
missing=()
for key in "${required[@]}"; do
  if [ -z "${!key:-}" ]; then
    missing+=("$key")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "Warning: missing optional secrets (OAuth won't work until set): ${missing[*]}"
fi

args=(
  "SUPABASE_URL=https://${PROJECT_REF}.supabase.co"
  "META_APP_ID=${META_APP_ID:-}"
  "META_APP_SECRET=${META_APP_SECRET:-}"
  "META_REDIRECT_URI=${META_REDIRECT_URI}"
  "META_CONFIG_ID=${META_CONFIG_ID:-}"
  "CANVA_CLIENT_ID=${CANVA_CLIENT_ID:-}"
  "CANVA_CLIENT_SECRET=${CANVA_CLIENT_SECRET:-}"
  "CANVA_REDIRECT_URI=${CANVA_REDIRECT_URI}"
  "APP_URL=${APP_URL}"
)

if [ -n "${TOKEN_ENCRYPTION_KEY:-}" ]; then
  args+=("TOKEN_ENCRYPTION_KEY=${TOKEN_ENCRYPTION_KEY}")
fi

if [ -n "${RESEND_API_KEY:-}" ]; then
  args+=("RESEND_API_KEY=${RESEND_API_KEY}")
fi

if [ -n "${INVITE_FROM_EMAIL:-}" ]; then
  args+=("INVITE_FROM_EMAIL=${INVITE_FROM_EMAIL}")
fi

echo "Setting secrets on project $PROJECT_REF..."
npx -y supabase secrets set "${args[@]}" --project-ref "$PROJECT_REF"

echo "Secrets updated."
