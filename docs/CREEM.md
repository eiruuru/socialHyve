# Creem payments setup

socialHyve uses [Creem](https://creem.io) as merchant of record for Starter and Pro subscriptions.

## 1. Create a Creem account

1. Sign up at [creem.io](https://creem.io).
2. Enable **Test Mode** in the dashboard while integrating.

## 2. Create products

Create two **recurring monthly** products in Test Mode:

| Product | Price (must match website) | Notes |
|---------|----------------------------|--------|
| socialHyve Starter | $2/month (intro; regular $5) | Manual upload, no team/client members/Canva |
| socialHyve Pro | $15/month | Team, client members, Canva |

Copy each test `product_id` (`prod_…`).

Website prices are defined in [`src/lib/plans.js`](../src/lib/plans.js) — keep them in sync with Creem.

## 3. API keys & webhook

1. **Developers** → copy **Test API key** and **Webhook secret**.
2. Register webhook URL:

   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/creem-webhook`

3. Add to `.env`:

```bash
CREEM_API_KEY=creem_test_...
CREEM_WEBHOOK_SECRET=...
CREEM_TEST_MODE=true
CREEM_PRODUCT_STARTER=prod_...
CREEM_PRODUCT_PRO=prod_...
```

4. Push secrets and deploy functions:

```bash
bash scripts/set-secrets.sh
bash scripts/deploy-edge-functions.sh
```

## 4. Test checkout

1. Sign in as an organization owner.
2. Open **Settings → Billing** or `/pricing`.
3. Subscribe to Starter or Pro — use Creem test cards from [test mode docs](https://docs.creem.io/getting-started/test-mode.md).
4. Confirm webhook updates `organizations.plan` and `subscription_status`.

## 5. Creem account review

When submitting for approval, note:

- **Product is live:** https://socialhyve.app
- **Pricing:** https://socialhyve.app/pricing
- **Legal:** Privacy, Terms, Acceptable Use linked in footer
- **Support:** work@hivem.nl
- **Invite-only:** public signup disabled; waitlist at `/waitlist`
- **AI:** optional text-only AI Caption (OpenAI); **no** image/video generation — **Moderation API not required**

## 6. Production

1. Create production products with the same prices.
2. Switch dashboard to production mode; copy production API key, webhook secret, and product IDs.
3. Set `CREEM_TEST_MODE=false` and production keys in Supabase secrets.
4. Update webhook URL if needed (same function, production events).
