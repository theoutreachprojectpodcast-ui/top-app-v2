# Phase 3 — Environment config report

**Date:** 2026-06-15

## Canonical config layer

All environment-derived values should import from:

```
web/src/lib/runtime/environmentConfig.js  ← primary SSOT (new)
web/src/lib/runtime/appUrls.js          ← URL helpers (existing)
web/src/lib/billing/stripeConfig.js     ← Stripe (existing)
```

### Exported accessors

| Constant | Function | Source env vars |
|----------|----------|-----------------|
| `WEB_BASE_URL` | `webBaseUrl()` | `NEXT_PUBLIC_APP_URL`, `APP_BASE_URL` |
| `API_BASE_URL` | same as web | same |
| `QA_BASE_URL` | `QA_ORIGIN` | constant `https://qa.theoutreachproject.app` |
| `PROD_BASE_URL` | `PRODUCTION_ORIGIN` | constant |
| `AUTH_CALLBACK_URL` | `authCallbackUrl()` | `NEXT_PUBLIC_WORKOS_REDIRECT_URI`, `WORKOS_REDIRECT_URI` |
| `MOBILE_AUTH_CALLBACK_URL` | web + `/mobile/auth/callback` | derived |
| `IOS_URL_SCHEME` | `IOS_URL_SCHEME` env or default bundle scheme | `IOS_URL_SCHEME` |
| `DATABASE_URL` | Supabase project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `STORAGE_URL` | Supabase storage API | derived from Supabase URL |
| `STRIPE_MODE` | `live` / `test` / `unknown` | `STRIPE_SECRET_KEY` prefix |
| `STRIPE_PRICE_IDS` | tier → price id map | `STRIPE_PRICE_*` |
| `EMAIL_PROVIDER_CONFIG` | Resend metadata | `ADMIN_EMAIL_PROVIDER`, `RESEND_API_KEY`, `ADMIN_EMAIL_FROM` |
| `ALLOWED_ORIGINS` | CORS/browser allowlist | constants + `ALLOWED_ORIGINS` env |
| `ALLOWED_REDIRECTS` | WorkOS redirect URIs | derived + `WORKOS_MOBILE_REDIRECT_URI` |

## Validation scripts

| Script | npm command | Profile |
|--------|-------------|---------|
| `validate-environment.mjs` | `validate:env` | auto / `--profile=` |
| same | `validate:env:prod` | production (via legacy wrapper + strict) |
| same | `validate:env:qa` | qa |
| same | `validate:env:mobile` | mobile/TestFlight |
| `validate-production-env.mjs` | `prebuild` | Vercel Production / CI |

### When validation runs

| Trigger | Enforcement |
|---------|-------------|
| `pnpm build` locally | Warn-only unless `TOP_VALIDATE_ENV=1` |
| Vercel Production build | **Fail** on missing/wrong env |
| GitHub CI `lint-and-build` | Structure check with dummy prod vars |
| `gate:production` | **Fail** on any gate |

### Production build failures

Production deploy **fails** when:

- Required env vars missing
- `APP_BASE_URL` uses localhost, QA hostname, or preview `*.vercel.app`
- WorkOS `sk_test_*` on Vercel Production
- Stripe not live mode on production profile
- Invalid domain `outreachproject.app` (missing `the`)

## Environment variable checklist

### Local (`.env.local`)

See `web/.env.local.example` — copy from example, use dev Supabase + WorkOS staging.

### QA (Vercel Preview, branch `QA`)

| Variable | Expected |
|----------|----------|
| `APP_BASE_URL` | `https://qa-the-outreach-project.vercel.app` |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | QA URL + `/callback` |
| `NEXT_PUBLIC_SUPABASE_URL` | QA project |
| `STRIPE_SECRET_KEY` | `sk_test_*` |
| `STRIPE_WEBHOOK_TEST_SECRET` | test webhook secret |
| `NEXT_PUBLIC_ENABLE_DEMO_FLOWS` | `1` or unset (demo on) |

### Production (Vercel Production)

Full template: `docs/vercel-production-env.template`

| Variable | Expected |
|----------|----------|
| `APP_BASE_URL` | `https://theoutreachproject.app` |
| `WORKOS_COOKIE_DOMAIN` | `theoutreachproject.app` |
| `WORKOS_API_KEY` | `sk_live_*` |
| `STRIPE_SECRET_KEY` | `sk_live_*` |
| `STRIPE_WEBHOOK_LIVE_SECRET` | live webhook secret |
| `NEXT_PUBLIC_ENABLE_DEMO_FLOWS` | `0` |

### TestFlight / Capacitor

| Variable | Expected |
|----------|----------|
| `CAP_SERVER_URL` | `https://theoutreachproject.app` |
| Embedded `server.url` | `https://theoutreachproject.app/mobile` |

Set at sync time via `pnpm --dir web run mobile:prep:prod`.

## Missing or changed env vars (action)

| Var | Status |
|-----|--------|
| `STRIPE_WEBHOOK_TEST_SECRET` | Required for QA webhook tests — add to Vercel Preview if missing |
| `STRIPE_WEBHOOK_LIVE_SECRET` | Preferred over legacy `STRIPE_WEBHOOK_SECRET` on Production |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Required in GitHub for CI smoke against protected deployments |
| `ALLOWED_ORIGINS` | Optional override; defaults cover prod + QA + admin hosts |
