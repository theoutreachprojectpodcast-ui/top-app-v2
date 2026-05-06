# Podcast Sponsor Stripe Verification

## Sponsor checkout path

Primary route:

- `POST /api/billing/podcast-sponsor-checkout`

Webhook route:

- `POST /api/billing/webhook`

Capabilities route:

- `GET /api/billing/capabilities`

## Required Stripe env for podcast sponsor checkout

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PODCAST_SPONSOR_COMMUNITY`
- `STRIPE_PRICE_PODCAST_SPONSOR_IMPACT`
- `STRIPE_PRICE_PODCAST_SPONSOR_FOUNDATIONAL`

## Redirect safety

Checkout success/cancel URLs are derived from request origin and safe return paths.
Production should resolve to:

- `https://theoutreachproject.app`

## UI behavior

Podcast page now surfaces a clear warning when podcast sponsor checkout is not configured in the current environment (via `/api/billing/capabilities`) instead of implying a fake success path.
