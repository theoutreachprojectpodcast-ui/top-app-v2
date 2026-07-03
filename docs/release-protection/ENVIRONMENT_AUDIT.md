# Phase 1 — Environment audit

**Date:** 2026-06-15

## Environments

| Environment | Base URL | Vercel target | Git branch |
|-------------|----------|---------------|------------|
| **Local** | `http://localhost:3000` (or `:3001` via `dev:alt`) | — | `qa` |
| **Preview** | `*.vercel.app` per PR deploy | Preview | any PR |
| **QA** | `https://qa-the-outreach-project.vercel.app` | Preview (branch `QA`) | `QA` |
| **QA custom** | `https://qa.theoutreachproject.app`, `https://admin-qa.theoutreachproject.app` | Preview (branch `QA`) | `QA` |
| **Production** | `https://theoutreachproject.app` | Production | `main` |
| **Production admin** | `https://admin.theoutreachproject.app` | Production (host rewrite) | `main` |
| **iOS/TestFlight** | Capacitor WebView → `https://theoutreachproject.app/mobile` | Native shell (App Store Connect) | release tag from `main` |

## Per-environment configuration

### Local

| Setting | Value |
|---------|-------|
| API URL | Same origin (`http://localhost:3000/api/*`) |
| Auth callback | `http://localhost:3000/callback` |
| Mobile callback | Not used locally unless Capacitor dev |
| Database | Dev Supabase project (`.env.local`) |
| Stripe | `sk_test_*` / `pk_test_*` |
| WorkOS | Staging (`sk_test_*`) |
| Storage | Dev Supabase `admin-media` bucket |
| Email | Resend test / unset (forms queue only) |
| Demo flows | May enable `NEXT_PUBLIC_ENABLE_DEMO_FLOWS=1` |

### Preview (PR)

| Setting | Value |
|---------|-------|
| Base URL | Per-deploy `*.vercel.app` |
| API URL | Same origin |
| Auth callback | Must match preview URL `/callback` in WorkOS Staging |
| Database | QA Supabase (Preview env vars in Vercel) |
| Stripe | Test mode |
| WorkOS | Staging |
| Demo flows | On by default (`launchMode.js`) |

### QA

| Setting | Value |
|---------|-------|
| Base URL | `https://qa-the-outreach-project.vercel.app` |
| API URL | Same origin |
| Auth callback | `https://qa-the-outreach-project.vercel.app/callback` |
| Mobile callback | `https://qa.theoutreachproject.app/mobile/auth/callback` (QA prep only) |
| Database | **QA Supabase project** (not Production) |
| Stripe | Test keys + `STRIPE_WEBHOOK_TEST_SECRET` |
| WorkOS | Staging environment |
| Storage | QA Supabase buckets |
| Email | Test sender or disabled |
| Vercel | Preview env scoped to branch `QA` |
| Capacitor QA prep | `pnpm --dir web run mobile:prep:qa` → `CAP_SERVER_URL=https://qa.theoutreachproject.app` |

### Production

| Setting | Value |
|---------|-------|
| Base URL | `https://theoutreachproject.app` |
| API URL | Same origin |
| Auth callback | `https://theoutreachproject.app/callback` |
| Mobile callback | HTTPS `/callback` in WebView (not custom scheme for document flow) |
| Database | Production Supabase |
| Stripe | Live keys + `STRIPE_WEBHOOK_LIVE_SECRET` |
| WorkOS | Production (`sk_live_*`) |
| Storage | Production Supabase |
| Email | Resend production sender |
| Vercel | Production env on branch `main` |
| Capacitor prod | `pnpm --dir web run mobile:prep:prod` → `https://theoutreachproject.app` |
| iOS URL scheme | `com.theoutreachproject.theoutreachproject` |

### iOS/TestFlight

| Setting | Value |
|---------|-------|
| Capacitor server.url | `https://theoutreachproject.app/mobile` (embedded at `cap sync`) |
| Auth | WorkOS via in-app browser → production `/callback` |
| Post-login | `/mobile/auth/complete` |
| Must NOT use | localhost, QA hostname, preview URLs |

## Environment mismatch risks

| Risk | Status | Mitigation |
|------|--------|------------|
| localhost in production bundles | **Guarded** | `validate-production-env.mjs`, `validate-environment.mjs --profile=production`, `/api/health/env` |
| Preview URLs in TestFlight | **Guarded** | `validate-environment.mjs --profile=mobile`, `validate-capacitor-production.mjs` |
| Production DB used by QA | **Manual** | Separate Supabase projects; verify `NEXT_PUBLIC_SUPABASE_URL` in Vercel Preview vs Production |
| QA missing production features | **Partial** | See [QA_PARITY_REPORT.md](./QA_PARITY_REPORT.md) |
| Missing QA env vars | **Guarded** | `validate:env:qa`, `gate:qa` |
| Hardcoded URLs | **Centralized** | `appUrls.js`, `environmentConfig.js`; remaining intentional refs in Capacitor bootstrap |
| Auth callbacks single-environment | **Documented** | Each env needs matching WorkOS Redirect URI |
| Stripe live/test mismatch | **Guarded** | Env validation rejects `sk_live_*` on QA and `sk_test_*` on Production |

## Hardcoded URL inventory (intentional SSOT)

- `web/src/lib/runtime/appUrls.js` — production/QA origins
- `web/capacitor.server-urls.json` — mobile server profiles
- `web/capacitor.config.js` — default production origin
- `web/src/app/layout.js` — Capacitor stale-shell bounce to production (safety net)
- Scripts default to `theoutreachproject.app` for smoke/mobile prep

## Action items (manual, outside repo)

1. Confirm Vercel **Preview env for branch `QA`** uses QA Supabase + WorkOS Staging + Stripe test.
2. Confirm Vercel **Production env** uses Production Supabase + WorkOS Production + Stripe live.
3. Attach `VERCEL_AUTOMATION_BYPASS_SECRET` to GitHub Actions for protected deployments.
4. Register all `ALLOWED_REDIRECTS()` from `environmentConfig.js` in WorkOS dashboards per environment.
