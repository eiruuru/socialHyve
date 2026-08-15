# socialHyve

Loomly-style social media scheduler for Facebook and Instagram with Canva artwork integration.

**Repo:** https://github.com/eiruuru/socialHyve

## Stack

- React 18 + Vite + Tailwind
- Supabase (Auth, Postgres, Storage, Edge Functions)

## Quick start

```bash
cp .env.example .env          # add Supabase URL + anon key
npm install
npm run dev
```

## Supabase setup

Full guide: **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)**

1. Create a Supabase project
2. Connect GitHub repo (`eiruuru/socialHyve`) in **Project Settings → Integrations**
3. Run `npx supabase login`
4. Deploy functions + secrets: `bash scripts/deploy-edge-functions.sh`
5. Set up cron: run `supabase/setup/cron.sql` in SQL Editor

Quick checklist: `bash scripts/setup-supabase.sh`

## Production (Vercel)

See **[docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md)** — import `eiruuru/socialHyve` at [vercel.com/new](https://vercel.com/new) and set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

## Features

- Connect Facebook Pages and linked Instagram Business accounts
- Connect Canva and attach exported designs to posts
- Visual content calendar with month/week views
- Schedule or publish immediately to Facebook and Instagram
- Background publish queue with retry and token refresh

## External setup required

- [Meta Developer App](https://developers.facebook.com/) with Facebook Login
- [Canva Connect App](https://www.canva.dev/) with OAuth PKCE
- Facebook Page linked to Instagram Business/Creator account

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start frontend |
| `npm run build` | Production build |
| `bash scripts/setup-supabase.sh` | Setup checklist |
| `bash scripts/deploy-edge-functions.sh` | Deploy all Edge Functions |
| `bash scripts/set-secrets.sh` | Push secrets from `.env` to Supabase |
