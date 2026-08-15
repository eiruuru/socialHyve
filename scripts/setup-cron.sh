#!/usr/bin/env bash
# Apply cron jobs via Supabase CLI (requires SUPABASE_SERVICE_ROLE_KEY in .env)
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-hfbxonnowvfkxmmkgftz}"
SUPABASE_URL="${VITE_SUPABASE_URL:-https://${PROJECT_REF}.supabase.co}"

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Missing SUPABASE_SERVICE_ROLE_KEY in .env"
  echo "Get it from: Project Settings → API → service_role (secret)"
  exit 1
fi

TMP_SQL=$(mktemp)
sed \
  -e "s|YOUR_SERVICE_ROLE_KEY|${SUPABASE_SERVICE_ROLE_KEY}|g" \
  supabase/setup/cron.sql > "$TMP_SQL"

echo "Applying cron setup to $PROJECT_REF..."
npx -y supabase db query --project-ref "$PROJECT_REF" --file "$TMP_SQL"
rm -f "$TMP_SQL"

echo "Cron jobs configured."
