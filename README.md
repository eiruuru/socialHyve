# socialHyve

Loomly-style social media scheduler for Facebook and Instagram with Canva artwork integration.

## Stack

- React 18 + Vite + Tailwind
- Supabase (Auth, Postgres, Storage, Edge Functions)

## Setup

1. Copy `.env.example` to `.env` and fill in Supabase credentials.
2. Create a Supabase project and run migrations:
   ```bash
   supabase db push
   ```
3. Set Edge Function secrets (Meta, Canva, token encryption key).
4. Install and run:
   ```bash
   npm install
   npm run dev
   ```

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
