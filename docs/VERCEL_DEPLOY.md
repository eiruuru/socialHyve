# Vercel production deployment

## 1. Deploy

```bash
npx vercel login
npx vercel --prod
```

Or connect the GitHub repo in [vercel.com/new](https://vercel.com/new) → import `eiruuru/socialHyve`.

**Build settings** (auto-detected for Vite):
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

## 2. Environment variables (Vercel Dashboard → Settings → Environment Variables)

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://hfbxonnowvfkxmmkgftz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | your anon key |

Apply to **Production**, **Preview**, and **Development**.

## 3. Supabase Auth (after you have the Vercel URL)

→ [URL Configuration](https://supabase.com/dashboard/project/hfbxonnowvfkxmmkgftz/auth/url-configuration)

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** add `https://your-app.vercel.app/**`

Keep `http://localhost:5173/**` for local dev.

## 4. Edge Function secrets

Update `APP_URL` to your production URL:

```bash
# In .env
APP_URL=https://your-app.vercel.app
bash scripts/set-secrets.sh
```

OAuth callbacks (Meta/Canva) stay on Supabase — no change needed.

## 5. Custom domain (optional)

Vercel Dashboard → Project → Settings → Domains
