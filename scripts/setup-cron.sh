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

SUPABASE_BIN=(npx -y supabase)

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "$PROJECT_REF" ] && [ -n "${VITE_SUPABASE_URL:-}" ]; then
  PROJECT_REF="$(node -e "const u=process.env.VITE_SUPABASE_URL||''; console.log((u.match(/https:\\/\\/([^.]+)\\.supabase\\.co/)||[])[1]||'')")"
fi

if [ -z "$PROJECT_REF" ]; then
  echo "Set SUPABASE_PROJECT_REF or VITE_SUPABASE_URL in .env"
  exit 1
fi

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Missing SUPABASE_SERVICE_ROLE_KEY in .env"
  echo "Get it from: Project Settings → API → service_role (secret)"
  exit 1
fi

if ! "${SUPABASE_BIN[@]}" projects list >/dev/null 2>&1; then
  echo "Not authenticated. Run: npx supabase login"
  exit 1
fi

echo "Linking project $PROJECT_REF..."
"${SUPABASE_BIN[@]}" link --project-ref "$PROJECT_REF" || true

TMP_SQL=$(mktemp)
sed \
  -e "s|YOUR_SERVICE_ROLE_KEY|${SUPABASE_SERVICE_ROLE_KEY}|g" \
  -e "s|YOUR_CRON_SECRET|${CRON_SECRET:-}|g" \
  supabase/setup/cron.sql > "$TMP_SQL"

echo "Applying cron setup to $PROJECT_REF..."
"${SUPABASE_BIN[@]}" db query --linked --file "$TMP_SQL"
rm -f "$TMP_SQL"

echo "Cron jobs configured."
