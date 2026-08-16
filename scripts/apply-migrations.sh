#!/usr/bin/env bash
# Push pending Supabase migrations to the linked remote project
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

if ! "${SUPABASE_BIN[@]}" projects list >/dev/null 2>&1; then
  if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    echo "Not authenticated. Run: npx supabase login"
    exit 1
  fi
  export SUPABASE_ACCESS_TOKEN
fi

echo "Linking project $PROJECT_REF..."
"${SUPABASE_BIN[@]}" link --project-ref "$PROJECT_REF" || true

echo "Pushing migrations to $PROJECT_REF..."
"${SUPABASE_BIN[@]}" db push --linked

echo "Migrations applied."
