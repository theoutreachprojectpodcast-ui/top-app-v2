# Phase 10 — Validation report

**Date:** 2026-06-15  
**Branch:** working tree (pre-merge to `QA` / `main`)

## Static validation (executed locally)

| Gate | Command | Result |
|------|---------|--------|
| Route smoke | `pnpm --dir web run smoke:routes` | **PASS** — 36 required route files (incl. `/api/health/stripe`) |
| Production gate (static) | `pnpm --dir web run gate:production` with `SKIP_HTTP_SMOKE=1` | **PASS** — routes, security, auth freeze, env prod+mobile, Capacitor |
| Security guards | (included in gate) | **PASS** |
| Auth freeze | (included in gate) | **PASS** |
| Prod env structure | (included in gate) | **PASS** with dummy live Stripe/WorkOS vars |
| Mobile env | (included in gate) | **PASS** with `CAP_SERVER_URL=https://theoutreachproject.app` |
| Capacitor config | (included in gate) | **PASS** |
| Build | `pnpm build` | Run before merge — CI runs on every PR |

## Production HTTP smoke (live)

**Command:** `pnpm --dir web run smoke:production:http`  
**Target:** `https://theoutreachproject.app`  
**Executed:** 2026-06-15

| Check | Result |
|-------|--------|
| Homepage, sign-in, sign-up | **200** |
| Community, trusted, podcasts | **200** |
| `/api/health`, `/api/health/auth`, `/api/health/db`, `/api/health/env`, `/api/health/mobile` | **200**, ok:true |
| `/api/health/stripe` | **404** — route exists in repo; deploy pending |
| WorkOS PKCE bridge | **200**, `wos-auth-verifier` cookie set |
| Callback guard (no code) | **400** (expected) |
| Billing capabilities | **200** |
| Mobile auth paths | **200** / **302** |
| `outreachproject.app` (wrong domain) | Does not resolve (expected) |

**Action:** Merge and deploy to production so `/api/health/stripe` goes live; re-run smoke after deploy.

## QA HTTP smoke (live)

**Command:** `pnpm --dir web run smoke:qa:http`  
**Target:** `https://qa-the-outreach-project.vercel.app`  
**Executed:** 2026-06-15

| Check | Result |
|-------|--------|
| All public pages + health routes | **401** — Vercel Deployment Protection |

**Action required:** Add `VERCEL_AUTOMATION_BYPASS_SECRET` to GitHub repository secrets (Settings → Secrets → Actions). CI workflows `release-gates.yml` and `production-monitor.yml` already reference this secret.

After secret is set:

```bash
VERCEL_AUTOMATION_BYPASS_SECRET=… pnpm --dir web run gate:qa
```

## Auth test matrix

| Test | Automated | Manual |
|------|-----------|--------|
| Email-code sends | — | QA + prod inbox test |
| Email-code login completes | — | Browser on QA |
| Username/password login | — | If enabled |
| Signup completes | — | Browser on QA |
| Callback completes | Partial (guard + `/api/health/auth`) | Full OAuth flow |
| Session persists after refresh | — | Browser |
| Logout works | — | Browser |
| Login after logout | — | Browser |

Auth **invariants** protected by `verify:auth-freeze` in every CI run.

## Mobile / TestFlight test matrix

| Test | Automated | Manual |
|------|-----------|--------|
| Mobile web loads | QA/prod smoke (after bypass secret) | Device browser |
| Responsive layout | — | Device |
| iOS callback route exists | smoke | — |
| Capacitor production URL | `validate:env:mobile`, `mobile:verify:prod` | — |
| TestFlight not local/QA | env validation | Install TestFlight build |
| Mobile login returns to app | — | Device |
| Session after reopen | — | Device |

## Monitoring

| Signal | Mechanism | Status |
|--------|-----------|--------|
| Post-deploy smoke | `ci.yml` + `release-gates.yml` on push to `main` | **Active** |
| Scheduled uptime | `production-monitor.yml` every 30 min | **Added** — requires bypass secret |
| QA deploy smoke | `release-gates.yml` on push to `QA` | **Active** — requires bypass secret |
| External uptime | UptimeRobot/Better Stack on `/api/health` | **Manual setup recommended** |
| Stripe webhook failures | Stripe Dashboard alerts | **Manual setup recommended** |

## Known remaining risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Manual auth E2E not in CI | Medium | Required in release checklist before QA→main |
| Vercel env vars not in git | Medium | Templates + validation scripts |
| QA Supabase drift from prod schema | Medium | [MIGRATION_SAFETY.md](./MIGRATION_SAFETY.md) |
| Deployment Protection blocks CI without secret | **High until fixed** | Set `VERCEL_AUTOMATION_BYPASS_SECRET` in GitHub |
| YouTube key missing on QA | Low | Podcast section empty on QA only |
| Admin content bad publish | Low | `contentPublishValidation.js` + audit log |
| Stripe webhook misconfigured | Medium | `/api/health/stripe` after deploy + Stripe dashboard |
| `/api/health/stripe` not yet on production | Low | Deploy current branch |

## Acceptance criteria status

| Criterion | Status |
|-----------|--------|
| QA matches production functionality | **Mostly** — see [QA_PARITY_REPORT.md](./QA_PARITY_REPORT.md) |
| Missing QA items listed | **Yes** |
| Production cannot deploy with broken env | **Yes** — prebuild + validate-environment |
| Production cannot deploy with localhost/preview URLs | **Yes** |
| Public pages protected from auth crashes | **Yes** |
| Auth tested before production deploy | **Partial** — freeze guards + smoke; manual E2E required |
| Mobile/TestFlight config tested | **Yes** |
| Health checks exist | **Yes** — incl. stripe (pending deploy) |
| Monitoring exists | **Yes** — CI + scheduled workflow |
| Rollback process exists | **Yes** — [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md) |
| Admin edits cannot crash app | **Improved** — publish validation + fallbacks |
| QA → production workflow documented | **Yes** — [RELEASE_WORKFLOW.md](./RELEASE_WORKFLOW.md) |
