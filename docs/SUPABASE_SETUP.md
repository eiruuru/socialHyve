# Supabase Setup for socialHyve

Connect **eiruuru/socialHyve** to Supabase and deploy migrations + Edge Functions.

## 1. Create Supabase project

1. Go to [supabase.com/dashboard/new](https://supabase.com/dashboard/new)
2. Name it `socialHyve` (or anything you like)
3. Save your credentials:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **Project ref** (subdomain) → `SUPABASE_PROJECT_REF`

```bash
cp .env.example .env
# Edit .env with your values
```

## 2. Connect GitHub integration

1. Open your project → **Project Settings** → [**Integrations**](https://supabase.com/dashboard/project/_/settings/integrations)
2. Under **GitHub**, click **Authorize GitHub**
3. Select repository: **`eiruuru/socialHyve`**
4. Configure:
   - **Working directory:** `/` (repository root)
   - **Production branch:** `main`
   - **Deploy to production:** ON
5. Click **Enable integration**

Supabase will automatically apply:
- `supabase/migrations/001_initial_schema.sql`
- Edge Functions declared in `supabase/config.toml`

> After enabling, push any commit to `main` (or re-run the integration) to trigger the first deploy.

## 3. Authenticate Supabase CLI (for secrets + manual deploy)

```bash
npx supabase login
```

Or add a [Personal Access Token](https://supabase.com/dashboard/account/tokens) to `.env`:

```
SUPABASE_ACCESS_TOKEN=sbp_...
```

## 4. Deploy Edge Functions + secrets

Fill OAuth credentials in `.env` when you have them (Meta + Canva apps). Redirect URIs are auto-filled from your project ref:

```bash
bash scripts/deploy-edge-functions.sh
```

Or set secrets only:

```bash
bash scripts/set-secrets.sh
```

### Required Edge Function secrets

| Secret | Source |
|--------|--------|
| `SUPABASE_URL` | Auto-set by deploy script |
| `META_APP_ID` | [Meta Developer App](https://developers.facebook.com/) |
| `META_APP_SECRET` | Meta Developer App |
| `META_REDIRECT_URI` | `https://YOUR_REF.supabase.co/functions/v1/meta-oauth-callback` |
| `CANVA_CLIENT_ID` | [Canva Developer Portal](https://www.canva.dev/) |
| `CANVA_CLIENT_SECRET` | Canva Developer Portal |
| `CANVA_REDIRECT_URI` | `https://YOUR_REF.supabase.co/functions/v1/canva-oauth-callback` |
| `APP_URL` | `http://localhost:5173` (dev) or your production URL |

Set secrets in Dashboard: **Project Settings** → **Edge Functions** → **Secrets**

## 5. Enable Auth

In **Authentication** → **Providers** → **Email**:
- Enable Email provider (enabled by default)
- For local dev, disable "Confirm email" or check inbox for confirmation link

Add your app URL under **Authentication** → **URL Configuration**:
- Site URL: `http://localhost:5173`
- Redirect URLs: `http://localhost:5173/**`

## 6. Set up cron jobs (publish queue + token refresh)

After Edge Functions are deployed:

1. Enable extensions: **Database** → **Extensions** → enable `pg_cron` and `pg_net`
2. Open **SQL Editor**
3. Edit [`supabase/setup/cron.sql`](../supabase/setup/cron.sql):
   - Replace `YOUR_PROJECT_REF` with your project ref
   - Replace `YOUR_SERVICE_ROLE_KEY` with service role key (Project Settings → API)
4. Run the script

This schedules:
- **Publish queue** — every minute (`publish-post`)
- **Token refresh** — weekly Sunday 3am UTC (`refresh-tokens`)

## 7. Meta Developer App

1. Create a **Business** app at [developers.facebook.com](https://developers.facebook.com/)
2. Add use cases: **Manage everything on your Page** and **Manage messaging & content on Instagram**
3. Under **Facebook Login for Business → Configurations**, create a configuration that includes:
   - `business_management` (required for Pages in Meta Business Manager)
   - `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
   - `instagram_basic`, `instagram_content_publish`
4. Copy the configuration **Config ID** into `META_CONFIG_ID` in `.env`, then run `bash scripts/set-secrets.sh`
5. Valid OAuth Redirect URI (Facebook Login for Business → Settings):
   ```
   https://YOUR_REF.supabase.co/functions/v1/meta-oauth-callback
   ```
6. Add your Facebook account as **App Tester** (dev mode)

Without `business_management`, `/me/accounts` returns empty when users opt in to Pages managed through Meta Business — even if they selected Pages in the consent screen.

## 8. Canva Connect App

1. Register at [canva.dev](https://www.canva.dev/)
2. Enable OAuth 2.0 with PKCE
3. Redirect URI:
   ```
   https://YOUR_REF.supabase.co/functions/v1/canva-oauth-callback
   ```
4. Scopes: `design:meta:read`, `design:content:read`, `asset:read`

## 9. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), sign up, then:
1. **Settings → Accounts** — connect Meta
2. **Settings → Canva** — connect Canva
3. **New Post** — compose and schedule

## Troubleshooting

| Issue | Fix |
|-------|-----|
| GitHub integration migration failed | Check Supabase **Integrations** logs; run SQL from `001_initial_schema.sql` manually in SQL Editor |
| OAuth redirect error | Verify redirect URIs match exactly in Meta/Canva apps |
| Canva "not connected" | Run `bash scripts/set-secrets.sh` after filling Canva credentials |
| Posts not publishing on schedule | Run `supabase/setup/cron.sql` in SQL Editor |
| CORS errors on Edge Functions | Functions include CORS headers; ensure you're logged in (JWT sent) |

## Quick checklist

```bash
bash scripts/setup-supabase.sh
```
