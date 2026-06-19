# Phase 2 — QA parity report

**Date:** 2026-06-15  
**QA URL:** `https://qa-the-outreach-project.vercel.app`  
**Production URL:** `https://theoutreachproject.app`

## Summary

QA runs the **same codebase** as production (branch flow: `qa` → `QA` → `main`). Functional parity is high; differences are intentional (demo data, test Stripe, staging WorkOS) or require manual Vercel/dashboard alignment.

## What matches production

| Area | Status |
|------|--------|
| Pages & routing | Same Next.js app — `/`, `/community`, `/trusted`, `/podcasts`, `/profile`, `/admin/*` |
| Auth flow | WorkOS AuthKit (staging keys on QA) |
| Account types / membership logic | Same code paths; Stripe test checkout |
| Profile storage | QA Supabase `top_qa_profiles` (preview/QA profile; prod uses `torp_profiles`) |
| Community features | Same APIs; demo seeds visible on QA (`launchMode.js`) |
| Trusted resources | Same catalog APIs |
| Nonprofit directory | Same search/enrichment routes |
| Podcast/content | Same YouTube pipeline (requires `YOUTUBE_API_KEY` in QA env) |
| Admin editing | Same admin platform; use `admin-qa` host or `/admin` on QA URL |
| Mobile-responsive layouts | Identical CSS/components |
| iOS-compatible auth paths | `/mobile/auth/start`, `/callback`, `/mobile/auth/complete` exist on QA |
| Health endpoints | `/api/health/*` including new `/api/health/stripe` |

## What is missing or degraded on QA

| Item | Impact | Fix |
|------|--------|-----|
| Live Stripe webhooks | Membership state may lag until manual sync | Set `STRIPE_WEBHOOK_TEST_SECRET` + Stripe test webhook to QA URL |
| WorkOS Production org pinning | QA uses Staging org — acceptable | None for QA |
| YouTube API key | Podcast “Last 10” may empty | Add `YOUTUBE_API_KEY` to Vercel Preview (QA branch) |
| Sponsor branding SQL (`sponsor_v06`–`v17`) | QA sponsor hub may differ from prod layout | Run optional SQL on QA Supabase |
| Admin email login | May differ if `ENABLE_ADMIN_EMAIL_LOGIN` toggled | Match prod toggle or use WorkOS admin |
| Deployment Protection | HTTP smoke returns 401 without bypass secret | Set `VERCEL_AUTOMATION_BYPASS_SECRET` in CI |

## What is broken (verify after deploy)

Run after each QA deploy:

```bash
VERCEL_AUTOMATION_BYPASS_SECRET=… pnpm --dir web run gate:qa
```

Automated checks cover homepage, auth pages, community, trusted, podcasts, health routes, auth status, billing capabilities, mobile auth paths.

## Production-only (by design)

- Live Stripe (`sk_live_*`) and live webhooks
- WorkOS Production keys and production user directory
- Production Supabase data (real users)
- `NEXT_PUBLIC_ENABLE_DEMO_FLOWS=0`
- Store/TestFlight builds pointing at production origin only
- `admin.theoutreachproject.app` production admin host

## QA-only (by design)

- Demo community seeds (`shouldHideDemoCommunitySeeds()` false on QA)
- Demo auth shortcuts when enabled
- Stripe test mode and test price IDs
- `admin-qa.theoutreachproject.app` host
- `mobile:prep:qa` Capacitor profile

## Must fix before QA is trusted for release sign-off

1. **Vercel Preview env for branch `QA`** — all required keys from `docs/vercel-production-env.template` but with QA Supabase + test Stripe + staging WorkOS + QA URLs.
2. **Run `gate:qa` green** on stable QA hostname after every QA merge.
3. **Apply pending Supabase migrations to QA first** — see [MIGRATION_SAFETY.md](./MIGRATION_SAFETY.md).
4. **Manual auth smoke** — complete sign-in, sign-up, logout on QA browser + mobile web.
5. **If mobile code changed** — run `mobile:prep:qa` device smoke before prod mobile prep.

## Mobile differences

| Check | QA | Production |
|-------|-----|------------|
| Capacitor `server.url` | QA prep only | `https://theoutreachproject.app/mobile` |
| TestFlight | Must NOT ship QA URL | Production URL only |
| Auth return | QA callback registered in WorkOS Staging | Production callback in WorkOS Production |

## Auth differences

| Check | QA | Production |
|-------|-----|------------|
| WorkOS keys | `sk_test_*` | `sk_live_*` |
| Cookie domain | Preview hostname or `qa.theoutreachproject.app` | `theoutreachproject.app` |
| Session sharing apex/admin | N/A on `*.vercel.app` | `WORKOS_COOKIE_DOMAIN=theoutreachproject.app` |

## Admin/content differences

- Same CMS panels; content stored in **separate** Supabase projects.
- Publish validation now blocks invalid URLs / empty approved blocks (`contentPublishValidation.js`).
- Preview content in QA before copying SQL or re-publishing on production.
