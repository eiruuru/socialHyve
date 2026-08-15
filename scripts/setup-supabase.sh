#!/usr/bin/env bash
# Interactive Supabase setup checklist for socialHyve
set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== socialHyve Supabase Setup ==="
echo ""

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — fill in your values next."
fi

echo "Step 1: Create a Supabase project"
echo "  → https://supabase.com/dashboard/new"
echo "  → Copy Project URL and anon key into .env:"
echo "      VITE_SUPABASE_URL=https://YOUR_REF.supabase.co"
echo "      VITE_SUPABASE_ANON_KEY=your-anon-key"
echo ""

echo "Step 2: Connect GitHub repo to Supabase"
echo "  → Dashboard → Project Settings → Integrations → GitHub"
echo "  → Authorize GitHub, select: eiruuru/socialHyve"
echo "  → Working directory: / (repo root)"
echo "  → Enable: Deploy to production"
echo "  → Production branch: main"
echo ""

echo "Step 3: Authenticate Supabase CLI"
echo "  → Run: npx supabase login"
echo ""

echo "Step 4: Link project and deploy"
echo "  → Fill META_* and CANVA_* in .env (can leave blank for now)"
echo "  → Run: bash scripts/deploy-edge-functions.sh"
echo ""

echo "Step 5: Set up cron jobs (after first deploy)"
echo "  → Edit supabase/setup/cron.sql with your project URL + service role key"
echo "  → Run in Dashboard → SQL Editor"
echo ""

echo "Step 6: Configure OAuth apps"
echo "  Meta redirect URI:  https://YOUR_REF.supabase.co/functions/v1/meta-oauth-callback"
echo "  Canva redirect URI: https://YOUR_REF.supabase.co/functions/v1/canva-oauth-callback"
echo ""

echo "Step 7: Run the app"
echo "  → npm install && npm run dev"
echo ""

if [ -f .env ]; then
  # shellcheck disable=SC1091
  source .env
  if [ -n "${VITE_SUPABASE_URL:-}" ] && [ "${VITE_SUPABASE_URL}" != "https://your-project.supabase.co" ]; then
    echo "✓ VITE_SUPABASE_URL is set"
  else
    echo "✗ VITE_SUPABASE_URL not configured yet"
  fi
  if [ -n "${VITE_SUPABASE_ANON_KEY:-}" ] && [ "${VITE_SUPABASE_ANON_KEY}" != "your-anon-key" ]; then
    echo "✓ VITE_SUPABASE_ANON_KEY is set"
  else
    echo "✗ VITE_SUPABASE_ANON_KEY not configured yet"
  fi
fi

if [ -f "$HOME/.supabase/access-token" ]; then
  echo "✓ Supabase CLI authenticated"
else
  echo "✗ Run: npx supabase login"
fi

echo ""
echo "Full guide: docs/SUPABASE_SETUP.md"
