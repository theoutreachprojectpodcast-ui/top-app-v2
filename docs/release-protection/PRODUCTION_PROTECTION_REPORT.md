# Phases 4–6 — Production protection report

**Date:** 2026-06-15

## Safety gates added

### 1. Build validation (CI + prebuild)

| Gate | Command / trigger |
|------|-------------------|
| TypeScript/Next build | `pnpm build` (CI) |
| ESLint | `pnpm lint` (CI) |
| Dependency audit | `pnpm --dir web run security:audit:ci` |
| Route generation | `pnpm --dir web run smoke:routes` |
| Static assets | PWA icons, manifest in `smoke:routes` |
| Trusted resources registry | `prebuild` verify scripts |
| Capacitor structure | `validate:capacitor` |

### 2. Environment validation

| Gate | Command |
|------|---------|
| Production env | `validate:env:prod`, `prebuild` on Vercel Production |
| QA env | `validate:env:qa` |
| Mobile/TestFlight | `validate:env:mobile` |
| Unified | `validate-environment.mjs --profile=*` |

Blocks: localhost, preview URLs, QA URLs, wrong Stripe/WorkOS mode on production.

### 3. Smoke tests

| Suite | Scope |
|-------|-------|
| `smoke:routes` | Required pages/API files exist |
| `smoke:qa:http` | QA deployed site — public pages, health, auth status, mobile paths |
| `smoke:production:http` | Live production — homepage, auth, health/*, community, trusted, podcasts, billing, mobile PKCE |
| `gate:production` | Orchestrates all static gates + optional live HTTP smoke |

### 4. Auth tests

| Check | Coverage |
|-------|----------|
| Auth freeze guards | `verify:auth-freeze` — PKCE cookie, callback, workos-go bridge |
| `/api/health/auth` | WorkOS configured, redirect URI |
| `/auth/workos-go` PKCE | Production smoke sets native UA, checks `wos-auth-verifier` cookie |
| `/callback` guard | Returns 400 without code (route exists) |
| Full email-code E2E | **Manual** — requires real WorkOS + inbox (document in release checklist) |

### 5. Mobile tests

| Check | Command |
|-------|---------|
| Capacitor config | `validate:capacitor` |
| Production embedded URL | `mobile:verify:prod` |
| Mobile env profile | `validate:env:mobile` |
| `/api/health/mobile` | HTTPS target, no localhost |
| Mobile auth paths | QA + production HTTP smoke |

## Health checks

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Aggregate (auth, db, env, mobile, stripe) |
| `GET /api/health/auth` | WorkOS config |
| `GET /api/health/db` | Supabase admin + OAuth handoff table |
| `GET /api/health/env` | Deployment profile + URL issues |
| `GET /api/health/mobile` | Capacitor target |
| `GET /api/health/stripe` | Stripe mode, price IDs, webhook configured |

No secrets exposed — only booleans, modes, and missing key names.

## Monitoring

| Signal | Mechanism |
|--------|-----------|
| Site uptime | `production-monitor.yml` every 30 min + `release-gates.yml` on push |
| 500/502 errors | HTTP smoke fails on status ≥ 500 |
| Failed auth callbacks | `/api/health/auth`, callback guard smoke |
| Failed email-code sends | Manual + Vercel function logs |
| DB connection failures | `/api/health/db` |
| Mobile deep-link failures | `/api/mobile/auth-health`, mobile smoke |
| Stripe membership failures | `/api/health/stripe`, `/api/billing/capabilities` |
| Deployment failures | Vercel deploy notifications + CI failure |

### GitHub Actions alerts

Failed workflow runs notify via GitHub (email/Slack integration):

- `production-monitor.yml` — scheduled production smoke
- `release-gates.yml` — post-merge QA and production gates
- `ci.yml` — PR and main push checks

### Recommended alerts (manual setup)

1. Vercel → Integrations → Slack/email on Production deploy failure.
2. External uptime monitor on `https://theoutreachproject.app/api/health` (200 + `"ok":true`).
3. Stripe Dashboard → Webhooks → alert on failed deliveries.
4. Supabase → project alerts on connection errors.
5. GitHub → Settings → Notifications → enable Actions failure alerts for the repo.

## Rollback process

See [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md).

## Deployment workflow

See [RELEASE_WORKFLOW.md](./RELEASE_WORKFLOW.md).

## Admin/content safeguards (Phase 8)

| Safeguard | Implementation |
|-----------|----------------|
| Content validation before publish | `contentPublishValidation.js` on create/update when `status=approved` |
| Image URL validation | HTTPS required for metadata URLs |
| Required field validation | title/body required for approved blocks |
| Draft/publish workflow | `status: draft` default; `approved` for public |
| Fallback UI | `PublicPageContentSlot` falls back when no approved block |
| Admin audit log | `writeAdminAuditLog` on content block mutations |
| Preview in QA | Test publish on QA Supabase before production |

## CI workflows

| Workflow | When |
|----------|------|
| `ci.yml` | All PRs; lint, build, security, production smoke on `main` push |
| `release-gates.yml` | QA gates on `QA` push; production gates on `main` push |
| `pr-branch-flow.yml` | Enforces `qa→QA→main` |

## Production deploy block conditions

Deploy must **not** proceed when:

- `gate:production` fails
- Vercel Production build fails (`prebuild` env validation)
- Post-deploy `smoke:production:http` fails → **rollback immediately**
