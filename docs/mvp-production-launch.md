# MVP production launch — streamlined checklist

One path from **QA → live** at `https://theoutreachproject.app`. Work sections **1–10** in order. Skip anything not needed for first real users.

**Last status update:** 2026-06-08 — Production on `main` at **`63a0088`**. **Supabase migrations complete** (#1–#39 including `page_content_blocks_admin_v10` + `safe_alignment_extension_2026_04`). **Vercel Production deploy Ready** (admin platform + idle sign-out fix). **Browser smoke passed** (WorkOS sign-in, live checkout, core routes). **Stripe Live webhooks delivering 200** (Workbench → Event deliveries). **Next:** §8 admin smoke on expanded platform; optional sponsor branding SQL; §10 go-live.

### Progress at a glance

| Step | Section | Status |
|------|---------|--------|
| 1 | Ship the code | **Done** — `63a0088` on `main`; Vercel Production **Ready** |
| 2 | Database | **Done** — #1–#39 applied; optional sponsor `sponsor_v06`…`v17` branding only if matching QA layout |
| 3 | Domains & Vercel | **Done** — apex, `www`→apex, `admin` host |
| 4 | Production env vars | **Done** — billing + auth flags healthy on live API |
| 5 | WorkOS Production | **Done** — sign-in/out verified in browser smoke |
| 6 | Stripe webhook (live) | **Done** — Live endpoint + Event deliveries **200** |
| 7 | Deploy & smoke test | **Done** — browser smoke passed (2026-06-08); CLI smoke passed earlier |
| 8 | Admin console | **Next** — run admin smoke on expanded layout at `admin.theoutreachproject.app` |
| 9 | Mobile stores | **Not started** (web-first) |
| 10 | Go live | **Next** — final legal review + announce |

### Next actions (do these now)

1. **Admin smoke on expanded platform** (§8) — command center, community moderation, sponsors, users, billing on `admin.theoutreachproject.app`.
2. **Optional:** run `sponsor_v06.sql` … `sponsor_v17.sql` if Production sponsor hub should match QA branding.
3. **Go live** (§10) — counsel review of `/privacy` + `/terms` if needed; announce; watch Vercel logs + Stripe deliveries for the first hour.

---

## Already done in repo (no action needed)

Shipped on **`main`** (and previously on **`QA`**) — verify on your branch if you diverged:

| Item | Notes |
|------|--------|
| CI parity | `pnpm install`, lint, build, `smoke:routes`, `security:guards` |
| Admin CMS (baseline) | Sponsors, community moderation, homepage settings, trusted manual create, podcast applications (`5818960`) |
| Admin platform (expanded) | Command center, searchable nav, users center, membership/billing ops, analytics, forms inbox, operations hub — see [ADMIN_PLATFORM_AUDIT.md](./ADMIN_PLATFORM_AUDIT.md) (**live on Production `63a0088`**) |
| WorkOS sign-in fix | No org pin on hosted login unless `WORKOS_PIN_ORG_ON_SIGNIN=1` (`524f38b`) |
| Admin hosts | `admin-qa` host, `deploymentHosts`, `adminConsoleHref()`, cross-subdomain auth return targets |
| Legal pages | `/privacy`, `/terms`, footer links |
| Mobile prep script | `pnpm --dir web run mobile:prep:prod` |
| Capacitor sync | Native projects synced with `CAP_SERVER_URL=https://theoutreachproject.app` |
| Supporting docs | [production-supabase-migration-order.md](./production-supabase-migration-order.md), [store-listing-copy.md](./store-listing-copy.md), [vercel-production-env.template](./vercel-production-env.template), [admin-qa-production-setup.md](./admin-qa-production-setup.md), [ADMIN_UPGRADE_READINESS.md](./ADMIN_UPGRADE_READINESS.md), [ADMIN_PLATFORM_AUDIT.md](./ADMIN_PLATFORM_AUDIT.md) |
| Vercel `WORKOS_COOKIE_DOMAIN` | Set to `theoutreachproject.app` (Production) — shared WorkOS session cookies across apex, `www`, and `admin` |

---

## Remaining manual steps — execution order

| Step | Section | You do this in… |
|------|---------|-------------------|
| 1 | [§1 Ship the code](#1-ship-the-code) | GitHub, local terminal |
| 2 | [§2 Database](#2-database-supabase-production) | Supabase Production SQL editor |
| 3 | [§3 Domains & Vercel](#3-domains--vercel) | Vercel Domains, DNS registrar |
| 4 | [§4 Production env vars](#4-production-environment-variables-vercel) | Vercel → Environment Variables |
| 5 | [§5 WorkOS Production](#5-workos-production) | WorkOS dashboard |
| 6 | [§6 Stripe webhook](#6-stripe-webhook-live) | Stripe Dashboard (Live mode) |
| 7 | [§7 Deploy & smoke test](#7-deploy--smoke-test-production) | Browser + real devices |
| 8 | [§8 QA admin (optional)](#8-qa-admin-optional-before-production) | Vercel Preview, WorkOS Staging |
| 9 | [§9 Mobile — App Store & Play](#9-mobile-app-capacitor--app-store--play-store) | Xcode (Mac), Android emulator/AAB, store consoles |
| 10 | [§10 Go live](#10-go-live) | Vercel, announce |

---

## 1. Ship the code

- [x] QA branch green in GitHub Actions (lint, build, security smoke).
- [x] Merge **QA → `main`** (or deploy QA if that is your production branch).
- [x] Confirm Vercel **Production** deploys from the correct branch (`main`).
- [x] Confirm Vercel **Production deploy succeeded** for prior releases (`93fd4ac`, `5818960`, `524f38b`, **`63a0088`**).
- [x] **Commit + merge + redeploy Production** — admin platform + `web/src/proxy.js` idle sign-out fix shipped 2026-06-08.

**Local sanity (from repo root):**

```bash
pnpm install
pnpm --dir web run validate:env:prod   # load Production env vars first
pnpm --dir web run build
pnpm --dir web run smoke:routes
pnpm --dir web run security:guards
```

---

## 2. Database (Supabase Production)

- [x] Use the **Production** Supabase project (not QA/dev).
- [x] Apply core migrations **#1–#36** in order: [production-supabase-migration-order.md](./production-supabase-migration-order.md).
- [x] **#3** `torp_profiles_membership_source.sql` — Supabase SQL Editor only; skip if `membership_source` already exists from #1.
- [x] **#6.5** `torp_profiles_membership_billing_v04.sql` — billing columns on profile (`renewal_date`, `billing_status`, etc.).
- [x] **SQL idempotency fixes (repo)** — removed Supabase “destructive” warnings from: `top_app_saved_org_eins.sql`, `trusted_resources.sql`, `nonprofit_directory_enrichment.sql`, `admin_audit_logs_v01.sql`, `admin_enrichment_diagnostics.sql`; fixed `podcast_v06_production.sql` and `safe_alignment_extension_2026_04.sql` for production apply.
- [x] **#37** `page_content_blocks_admin_v10.sql` — page copy blocks + `admin-media` bucket.
- [x] Optional **#37** `admin_enrichment_diagnostics.sql` — enrichment metrics helper (read-only).
- [x] Optional **#39** `safe_alignment_extension_2026_04.sql` — sponsor/trusted/social alignment tables.
- [x] Optional **#38** `platform_future_hooks.sql` — no-op (commented placeholders only; safe to skip).
- [ ] Optional **sponsor branding** — `sponsor_v06.sql` … `sponsor_v17.sql` if Production should match QA sponsor hub layout.
- [x] Verify **RLS** is enabled on user-facing tables (profiles, community, favorites, etc.).
- [x] Seed or verify **sponsor catalog** and **featured home sponsors** exist in Production.
  - If empty: `pnpm --dir web run seed:sponsors` (with Production Supabase keys in env), or run sponsor SQL manually.
- [x] Grant **platform admin** for ops emails (pattern in `admin_backend_v06_access_control.sql` — set `platform_role = admin`, `admin_access_enabled = true`, `admin_access_granted_by`).

**Post-migration verification (SQL editor):**

```sql
select count(*) from public.torp_profiles;
select count(*) from public.sponsors_catalog;
select platform_role, admin_access_enabled from public.torp_profiles limit 5;

-- After admin_enrichment_diagnostics.sql:
select * from public._torp_admin_enrichment_metrics() order by 1;
```

**Live check (2026-06-03):** `GET https://theoutreachproject.app/api/billing/capabilities` → `ok: true`, `membershipCheckout: true`, `stripeWebhook: true`.

---

## 3. Domains & Vercel

### Production domains

- [x] In Vercel → Domains, add:
  - `theoutreachproject.app` (**primary**)
  - `www.theoutreachproject.app`
  - `admin.theoutreachproject.app`
- [x] DNS: apex **A** + **CNAME** for `www` and `admin` → Vercel (see [deployment-domains.md](./deployment-domains.md)).
- [x] After deploy: `www` **301s** to apex (verified).
- [x] `admin.theoutreachproject.app/admin` → `/admin-login` when unsigned (no **500**; deploy `93fd4ac`).
- [x] Confirm `admin.theoutreachproject.app/` (root) rewrites to `/admin` ( `vercel.json` host rewrite).

### QA domains (optional — test admin before Production)

- [a] Preview / QA branch: `qa.theoutreachproject.app`, `admin-qa.theoutreachproject.app`
- [a] Full QA admin steps: [admin-qa-production-setup.md](./admin-qa-production-setup.md)

---

## 4. Production environment variables (Vercel)

Copy [vercel-production-env.template](./vercel-production-env.template) into **Vercel → Project → Settings → Environment Variables → Production**. Fill secrets from WorkOS Production, Supabase Production, and Stripe Live dashboards.

Set on **Production** only. **Redeploy** after changes (required for `NEXT_PUBLIC_*`).

| Area | Required |
|------|----------|
| **App URLs** | `NEXT_PUBLIC_APP_URL`, `APP_BASE_URL` = `https://theoutreachproject.app` |
| **Admin** | `NEXT_PUBLIC_ADMIN_URL` = `https://admin.theoutreachproject.app` |
| **WorkOS** | Production `WORKOS_API_KEY` (`sk_live_…`), `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD` (32+ chars, stable), `WORKOS_COOKIE_DOMAIN` = `theoutreachproject.app`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI` = `https://theoutreachproject.app/callback` |
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Stripe** | Live secret key, live webhook secret, live price IDs for membership (and sponsor checkout if enabled) |
| **MVP off switch** | `NEXT_PUBLIC_ENABLE_DEMO_FLOWS=0` (or unset) |
| **Admin sign-in toggle** | `ENABLE_ADMIN_EMAIL_LOGIN=0` for WorkOS-only admin at launch; `1` for approved-email magic link (`andy@volentelabs.com` + `PLATFORM_ADMIN_EMAILS`) |
| **Admin bootstrap** | `PLATFORM_ADMIN_EMAILS=ops@yourdomain.com` (optional; comma-separated) |

Details: [production-deployment.md](./production-deployment.md), [deployment-domains.md](./deployment-domains.md).

**Verify in Vercel → Production (check each):**

- [x] `NEXT_PUBLIC_APP_URL` / `APP_BASE_URL` = `https://theoutreachproject.app`
- [x] `NEXT_PUBLIC_ADMIN_URL` = `https://admin.theoutreachproject.app`
- [x] WorkOS **live** `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`
- [x] `WORKOS_COOKIE_DOMAIN` = `theoutreachproject.app`
- [x] `NEXT_PUBLIC_WORKOS_REDIRECT_URI` = `https://theoutreachproject.app/callback`
- [x] Supabase Production URL + anon + service role (app APIs respond)
- [x] Stripe live secret + webhook secret + membership price IDs (`GET /api/billing/capabilities` → `membershipCheckout`, `stripeWebhook` true)
- [x] `NEXT_PUBLIC_ENABLE_DEMO_FLOWS=0` (or unset) — verified on live deploy: `GET /api/auth/status` → `"demoFlowsEnabled": false` (2026-06-04)
- [x] `ENABLE_ADMIN_EMAIL_LOGIN` / `PLATFORM_ADMIN_EMAILS` per launch policy — verified: `"adminEmailLogin": false`, `"adminEmailLoginProduction": false` (WorkOS-only `/admin`; see below)

**§4 last two vars — what to set in Vercel → Production**

| Variable | Recommended for public launch | Verified on prod API |
|----------|------------------------------|----------------------|
| `NEXT_PUBLIC_ENABLE_DEMO_FLOWS` | `0` **or leave unset** (both disable demo on Vercel Production) | `demoFlowsEnabled: false` |
| `ENABLE_ADMIN_EMAIL_LOGIN` | `0` **or leave unset** (WorkOS-only admin; no magic-link on `/admin-login`) | `adminEmailLoginProduction: false` |
| `PLATFORM_ADMIN_EMAILS` | Optional comma-separated ops emails (e.g. `you@company.com,ops@company.com`) | N/A — only affects **who** can bootstrap as admin via WorkOS + approved-email list; does **not** turn on magic-link while `ENABLE_ADMIN_EMAIL_LOGIN` is off |

**Re-check after any Vercel env change** (requires redeploy for `NEXT_PUBLIC_*`):

```bash
curl -s https://theoutreachproject.app/api/auth/status
```

Expect: `"demoFlowsEnabled":false`, `"adminEmailLogin":false`, `"adminEmailLoginProduction":false`.

**Admin access without magic-link:** grant in Supabase (`platform_role = admin`, `admin_access_enabled = true`) **or** add the email to `PLATFORM_ADMIN_EMAILS` / the built-in bootstrap list in `adminPolicy.js` (andy@volentelabs.com, etc.) **and** sign in with WorkOS on `admin.theoutreachproject.app`.

---

## 5. WorkOS Production

Do this in the **WorkOS Production** environment (not Staging):

- [x] Switch WorkOS dashboard to **Production** (confirm in dashboard).
- [x] Copy `sk_live_…` and `client_…` into Vercel Production (must match §4).
- [x] Register redirect URI: **`https://theoutreachproject.app/callback`** (must match `NEXT_PUBLIC_WORKOS_REDIRECT_URI` exactly).
- [x] Add launch team emails to your **WorkOS Organization** (AuthKit sign-in requires org membership).
- [x] **Browser smoke:** sign in / sign out on `https://theoutreachproject.app` (real account).
- [x] Confirm `WORKOS_COOKIE_DOMAIN=theoutreachproject.app` on Vercel so sessions work on apex + `www` + `admin` + mobile WebView.
- [x] **Do not** set `WORKOS_PIN_ORG_ON_SIGNIN=1` on Production unless every user is pre-invited in the WorkOS org (`524f38b` — avoids “contact your organization admin” for non-members).

If sign-in fails with “not a valid redirect URI”, the URL in the error must appear in WorkOS **Production** → Redirects, and Vercel must be redeployed after any `NEXT_PUBLIC_*` change.

---

## 5b. Membership & billing (QA first, then Production)

Code is on **`main`** (`/api/billing/*`, profile Membership & billing center, `/admin/membership`, `/admin/billing` revenue ops). Complete **QA** before live Stripe.

### Phase A — Code on QA (done when Vercel shows latest `QA` deploy)

- [x] Push `QA` branch (membership/billing commits).
- [x] Vercel **Preview** deploy for `QA` is **Ready** — latest Preview deploy `02c234e` (2026-06-03); confirm dashboard shows **Ready** after any new push.
- [x] In browser (logged into Vercel protection if enabled): `https://qa-the-outreach-project.vercel.app/api/billing/capabilities` returns JSON with `"ok": true` (not 404, not an HTML “Authentication Required” page).
  - **2026-06-01:** unauthenticated probe returns **401** (Vercel Deployment Protection) — expected; test signed into Vercel or use bypass token (see below).
- [ ] If the URL shows Vercel’s login page, use **Vercel → Deployment Protection → bypass** for your team or test while signed into Vercel; membership flags are also on `GET /api/auth/status` when signed into the app.
- [ ] Profile → **Membership & billing** section; Home → **Become a member** cards.

### Phase B — Supabase (QA project)

Run in **Supabase SQL editor** for the database QA uses (often same project as prod with `top_qa_profiles` on Preview):

1. `web/supabase/torp_profiles_membership_billing_v04.sql` on **`torp_profiles`**
2. `web/supabase/top_qa_profiles_membership_billing_v04.sql` if Preview uses **`top_qa_profiles`** (`PROFILE_TABLE` / `VERCEL_ENV=preview`)

Confirm columns exist: `renewal_date`, `billing_status`, `sponsor_tier`, `payment_method_summary`.

### Phase C — Stripe **Test** mode + Vercel Preview env

1. Stripe Dashboard → **Test mode** → Products: **Support with $1** ($1/mo recurring), Pro **$5.99/mo** (copy `price_…` IDs into `STRIPE_PRICE_SUPPORT_MONTHLY` / `STRIPE_PRICE_PRO_MONTHLY`).
2. Vercel → **Preview** (branch `QA`) env vars: `STRIPE_SECRET_KEY=sk_test_…`, `STRIPE_PRICE_SUPPORT_MONTHLY`, `STRIPE_PRICE_PRO_MONTHLY`, optional `STRIPE_PRICE_SPONSOR_MONTHLY`, `STRIPE_WEBHOOK_SECRET`, `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` = QA host.
3. **Verify locally** (no secrets printed): `pnpm --dir web run verify:stripe-env` — all lines must be `OK`; `membershipCheckout` and `stripeWebhook` must be `true`. Secret key must start with `sk_test_` (not `mk_`); prices must be `price_…` (not `$1.99`).
4. Stripe → Webhooks (Test): `https://qa-the-outreach-project.vercel.app/api/billing/webhook` with events listed in §6 (include `payment_method.attached`).
5. **Redeploy** QA after env changes.
6. Customer Portal (Test): allow cancel at period end, update payment methods.
7. In browser (signed into QA app): `GET /api/billing/capabilities` → `"membershipCheckout": true`, `"stripeWebhook": true` (Vercel Deployment Protection blocks unauthenticated curl).

### Phase D — QA smoke test

**Live Stripe (wired products):** Support + Pro recurring (`membershipCheckout: true`). **Demo walkthrough:** podcast sponsor tiers and mission sponsor apply flows use in-page demo checkout until optional `STRIPE_PRICE_PODCAST_SPONSOR_*` / `STRIPE_PRICE_SPONSOR_MONTHLY` are set.

| Step | Pass? |
|------|-------|
| Sign in (WorkOS) | |
| Upgrade Support or Pro (card `4242 4242 4242 4242`) — **live Stripe** | |
| Profile shows tier + renewal; webhook deliveries **200** in Stripe | |
| Manage billing portal; cancel at period end | |
| Add payment method; billing history shows invoice | |
| Podcast **Sponsor the show** → demo payment screens → submit application | |
| `/admin/membership` and `/admin` command center counts update | |

Details: [membership-billing.md](./membership-billing.md), [stripe-webhooks.md](./stripe-webhooks.md).

### Phase E — Production (after QA passes)

Repeat Phase B on **production** Supabase, Phase C with **Live** keys/prices/webhook on **Production** env, then §6–§7 below.

---

## 6. Stripe webhook (live)

- [x] Stripe Dashboard → **Live** mode → **Workbench → Webhooks** → endpoint: `https://theoutreachproject.app/api/billing/webhook`.
- [x] Subscribe to these events (handled in `web/src/app/api/billing/webhook/route.js`):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `invoice.upcoming`
  - `payment_method.attached`
- [x] Copy **live** webhook secret into Vercel `STRIPE_WEBHOOK_SECRET` (prod API reports `stripeWebhook: true`).
- [x] Set live price IDs in Vercel Production (`STRIPE_PRICE_SUPPORT_MONTHLY`, `STRIPE_PRICE_PRO_MONTHLY`, etc.) (`membershipCheckout: true`).
- [x] Redeploy Production after webhook secret + price IDs.
- [x] Confirm **200** on Live deliveries — **Workbench → Webhooks → your endpoint → Event deliveries** (Live mode has no “Send test webhook”; use checkout deliveries or **Resend** on a recent event). Verified 2026-06-08.

---

## 7. Deploy & smoke test (Production)

Run through once on **real devices** (phone + desktop) after Production is live:

| Check | Pass? |
|-------|-------|
| Home, directory search, trusted, sponsors, community, podcasts load | [x] browser (2026-06-08) |
| Sign up / sign in / sign out (WorkOS) | [x] browser |
| `/api/me` returns profile when signed in | [x] browser |
| Profile + onboarding save | [x] browser |
| One **live** membership checkout (small amount) → Stripe receipt → profile tier updates | [x] browser + Stripe Event deliveries **200** |
| Admin host: only platform admins reach `/admin`; others redirect to login | [x] browser |
| Admin command center loads; moderation queue counts plausible | [ ] after expanded admin platform deploy (§1) |
| Admin: approve/deny test community post; sponsor CRUD smoke | [ ] after expanded admin platform deploy (§1) |
| Contact form / sponsor application submits | [x] browser |
| `/privacy`, `/terms`, `/contact` load | [x] |
| No demo-only UI (“Reset demo”, etc.) visible | [x] browser |

Optional CLI (against live Production URL):

```bash
pnpm --dir web run verify:workos-auth
pnpm --dir web run smoke:qa:http https://theoutreachproject.app
```

- [x] `node scripts/qa-http-smoke.mjs https://theoutreachproject.app` — all checks passed (2026-06-04).
- [ ] `pnpm --dir web run verify:workos-auth` (requires WorkOS env locally).

If mobile is in scope, also run section **9.3** on a physical device before store submission.

---

## 8. Admin console (Production + QA)

Production admin URL: **`https://admin.theoutreachproject.app`** (or `/admin` on apex if `NEXT_PUBLIC_ADMIN_URL` unset). Full route audit: [ADMIN_PLATFORM_AUDIT.md](./ADMIN_PLATFORM_AUDIT.md). Operator guide: [ADMIN_UPGRADE_READINESS.md](./ADMIN_UPGRADE_READINESS.md).

### Production prerequisites

- [x] Merge and **deploy** latest **expanded** admin platform code to Vercel Production (baseline CMS already on `main`; see §1).
- [x] Grant **platform admin** in Supabase Production (`platform_role = admin`, `admin_access_enabled = true`) for ops emails, **or** add emails to `PLATFORM_ADMIN_EMAILS` / bootstrap list in `adminPolicy.js`.
- [x] Sign in with **WorkOS** on admin host (`ENABLE_ADMIN_EMAIL_LOGIN=0` for launch = no magic-link on `/admin-login`).
- [x] `NEXT_PUBLIC_ADMIN_URL=https://admin.theoutreachproject.app` on Production (already recommended in §4).

### Production smoke (after deploy)

| Check | Pass? |
|-------|-------|
| `/admin` command center — queues, quick actions, Stripe health flags | |
| Nav search finds Users, Billing, Community; mobile menu works | |
| **Public site** toggle returns to apex; **Admin** link on public app opens admin | |
| `/admin/community` — moderation queue; approve/deny test post | |
| `/admin/sponsors` — list + edit sponsor | |
| `/admin/users` — search user; detail shows posts/applications | |
| `/admin/billing` — revenue tab + forecast disclaimer visible | |
| `/admin/advanced` — QA status counters load | |
| Non-admin account cannot access `/admin` or `/api/admin/*` | |

### QA admin (optional, before Production)

Test on Preview before flipping Production. See [admin-qa-production-setup.md](./admin-qa-production-setup.md).

- [ ] Vercel **Preview** env: `NEXT_PUBLIC_ADMIN_URL=https://admin-qa.theoutreachproject.app`
- [ ] `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` = `https://qa.theoutreachproject.app`
- [ ] `QA_PLATFORM_ADMIN_EMAILS=you@example.com,teammate@example.com` (server-only)
- [ ] `WORKOS_COOKIE_PASSWORD` (32+ chars) — enables **admin email magic-link** on QA `/admin-login` (no WorkOS)
- [ ] `WORKOS_COOKIE_DOMAIN=theoutreachproject.app`
- [ ] WorkOS **Staging** (optional): register QA callback `https://qa.theoutreachproject.app/callback`
- [ ] Redeploy Preview; repeat Production smoke table on `admin-qa` host

**Known partial modules (labeled in UI):** site announcements (`/admin/content/announcements`), membership tier **pricing** edit without deploy, media library upload tagging, page-view analytics.

---

## 9. Mobile app (Capacitor → App Store & Play Store)

Native iOS and Android shells live under **`web/`**. They do **not** bundle the Next.js build — the WebView loads your **live Production URL** (`CAP_SERVER_URL`). Ship **web Production first** (sections 1–7), then build and submit native wrappers.

For how web + mobile relate to the **legacy App Store client** (direct Supabase vs Next `/api/*`), see [connecting-web-mobile-to-legacy-api.md](./connecting-web-mobile-to-legacy-api.md).

**Identity (update before first store upload if branding changes):**

| Field | Value |
|-------|--------|
| Bundle / application ID | `org.theoutreachproject.torp` |
| Display name | The Outreach Project |
| Config | `web/capacitor.config.js` |
| Native projects | `web/ios/`, `web/android/` |

Draft store copy: [store-listing-copy.md](./store-listing-copy.md).  
**Mobile launch checklist:** [MOBILE_LAUNCH_CHECKLIST.md](./MOBILE_LAUNCH_CHECKLIST.md) (all iOS/Android todos).  
Mobile prep: [MOBILE_READINESS.md](./MOBILE_READINESS.md), gaps: [MOBILE_ARCHITECTURE_GAPS.md](./MOBILE_ARCHITECTURE_GAPS.md).  
Deep technical reference: [web/docs/CAPACITOR_MOBILE.md](../web/docs/CAPACITOR_MOBILE.md).

---

### 9.1 Prerequisites

- [ ] **Production web** live at `https://theoutreachproject.app` (section 7 passed — browser smoke + billing verified 2026-06-08).
- [ ] **Node ≥ 22** for Capacitor CLI (`pnpm exec cap …`).
- [ ] **Apple Developer Program** enrolled ([developer.apple.com](https://developer.apple.com)) — required for TestFlight and App Store.
- [ ] **Google Play Console** account ([play.google.com/console](https://play.google.com/console)) — one-time registration fee.
- [ ] **macOS + Xcode** (latest stable) for iOS builds and App Store upload.
- [x] **Android Studio** + SDK on Windows — emulator run + signed AAB per [ANDROID_STUDIO_SETUP.md](./ANDROID_STUDIO_SETUP.md)
- [x] **Privacy policy URL** live: `https://theoutreachproject.app/privacy`
- [x] **Terms URL** live: `https://theoutreachproject.app/terms`
- [x] **Support / contact URL** live: `https://theoutreachproject.app/contact`

---

### 9.2 Point Capacitor at Production & sync

From repo root:

```bash
pnpm --dir web run mobile:prep:prod
```

This sets `CAP_SERVER_URL=https://theoutreachproject.app`, runs `pnpm run build`, then `cap sync`.

**Before every store build**, confirm Production is live and re-run `mobile:prep:prod` if you changed `capacitor.config.js` or `capacitor-www/`.

Open native IDEs:

```bash
pnpm --dir web run cap:open:ios      # macOS only → Xcode
pnpm --dir web run cap:open:android  # Android Studio
```

---

### 9.3 WorkOS & auth for mobile WebView

The app loads the same WorkOS AuthKit flow as the browser (see §5):

- [ ] Redirect URI registered: `https://theoutreachproject.app/callback`
- [x] `WORKOS_COOKIE_DOMAIN=theoutreachproject.app` on Vercel Production

**Smoke on a real device** (not only emulator):

- [ ] Sign in / sign out
- [ ] Profile load after cold start
- [ ] Stripe membership checkout (Safari/Chrome in-app browser or return to app)
- [ ] Core tabs: Home, Directory, Community, Profile

---

### 9.4 Store assets & versioning (both platforms)

- [ ] Replace placeholder **app icon** and **splash** (see [Capacitor assets guide](https://capacitorjs.com/docs/guides/splash-screens-and-icons) or `pnpm exec capacitor-assets` from `web/`).
- [ ] Prepare **screenshots** (phone required; tablet optional for iPad / Play feature graphic).
- [ ] Use draft copy from [store-listing-copy.md](./store-listing-copy.md) — replace `[support@…]` and reviewer test account placeholders.
- [ ] Bump version before each submission:
  - **iOS:** `MARKETING_VERSION` + build number in Xcode (`web/ios/App/App.xcodeproj`)
  - **Android:** `versionName` + increment `versionCode` in `web/android/app/build.gradle`

---

### 9.5 Apple App Store process

#### A. App Store Connect setup

1. [ ] [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**.
2. [ ] Platform: **iOS**. Name: **The Outreach Project**. Primary language. Bundle ID: **`org.theoutreachproject.torp`** (must exist in [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)).
3. [ ] SKU: internal id (e.g. `torp-ios-001`). User Access as needed.

#### B. Xcode signing & archive

1. [ ] Xcode → open via `pnpm --dir web run cap:open:ios`.
2. [ ] **Signing & Capabilities:** Team = your Apple Developer team; **Automatically manage signing** (or manual profiles for release).
3. [ ] Scheme: **App**, destination: **Any iOS Device (arm64)**.
4. [ ] **Product → Archive** → **Distribute App** → **App Store Connect** → Upload.

#### C. TestFlight (recommended before public release)

1. [ ] After upload, build appears in App Store Connect → **TestFlight** (processing ~5–30 min).
2. [ ] **Internal testing:** add team Apple IDs — immediate.
3. [ ] **External testing:** create group, submit for **Beta App Review** (lighter than full review).
4. [ ] Run section 9.3 smoke on TestFlight build.

#### D. App Store submission

In App Store Connect → your app → **App Store** tab:

| Item | Notes |
|------|--------|
| **Privacy Policy URL** | `https://theoutreachproject.app/privacy` |
| **App Privacy** | Declare data collected (account email, usage if analytics, purchases via Stripe web — clarify no in-app purchase SKU if billing is web-only) |
| **Age rating** | Complete questionnaire |
| **Screenshots** | 6.7" and 6.5" iPhone sizes minimum |
| **Review notes** | Test account email + password; explain app loads `theoutreachproject.app` in WebView |
| **Export compliance** | Typically “No” for standard HTTPS-only apps unless custom encryption |

1. [ ] Select the uploaded build under **Build**.
2. [ ] **Add for Review** → submit.

**Review time:** often 24–48 hours; rejections usually missing login, broken callback, or privacy metadata — fix and resubmit.

#### E. After Apple approval

- [ ] **Release manually** or **automatically** per your App Store Connect setting.
- [ ] Monitor crashes (Xcode Organizer / App Store Connect **Metrics**).
- [ ] For updates: bump version → archive → upload → new App Store version.

---

### 9.6 Google Play Store process

#### A. Play Console app record

1. [ ] Play Console → **Create app**.
2. [ ] Name: **The Outreach Project**. Default language. App / game: **App**. Free (membership billed on web via Stripe).
3. [ ] Accept Play policies; complete **Dashboard** setup tasks.

#### B. Signing & release build

1. [ ] **Play App Signing:** enable (Google manages app signing key; you use upload key).
2. [ ] Generate **upload keystore** (store securely — loss blocks updates):

   ```bash
   keytool -genkey -v -keystore torp-upload.keystore -alias torp -keyalg RSA -keysize 2048 -validity 10000
   ```

3. [ ] Android Studio → **Build → Generate Signed Bundle / APK** → **Android App Bundle (AAB)** recommended.
4. [ ] Or from CLI after configuring signing in `web/android/app/build.gradle` / `gradle.properties`.

#### C. Store listing & policy forms

Complete under **Grow → Store presence** and **Policy**:

| Task | Notes |
|------|--------|
| **Main store listing** | Title, short/full description, icon 512×512, feature graphic 1024×500, phone screenshots |
| **Privacy policy** | `https://theoutreachproject.app/privacy` |
| **App access** | If login required, provide **test credentials** for reviewers |
| **Ads** | Declare if app contains ads (typically No) |
| **Content rating** | Complete IARC questionnaire |
| **Data safety** | Declare account info, payment info (if collected on web), security practices |
| **Target audience** | Age groups; comply with Families policy if applicable |

#### D. Testing tracks → Production

1. [ ] **Internal testing:** upload AAB, add tester emails — fast iteration.
2. [ ] **Closed testing** (optional): wider QA group.
3. [ ] **Open testing** (optional): public beta.
4. [ ] **Production:** promote release from testing track or upload directly after checks pass.

First **Production** submission triggers **Google review** (often hours to a few days).

#### E. After Play approval

- [ ] Confirm **Production** rollout at 100% (or staged %).
- [ ] Watch **Android vitals** (crashes, ANRs) in Play Console.
- [ ] Updates: increment `versionCode`, build new AAB, new release notes.

---

### 9.7 Mobile launch checklist (summary)

| Check | Pass? |
|-------|-------|
| `mobile:prep:prod` run before release build | |
| Sign-in / sign-out on physical iOS + Android | |
| Membership checkout completes on device | |
| Icons + splash not placeholders (or acceptable for v1) | |
| Privacy policy + support URLs live | |
| TestFlight / internal track validated | |
| Store listings + reviewer test account submitted | |
| iOS + Android approved and published | |

**Note:** Most product changes ship via **Vercel web deploy** — users get updates without a store release. Store resubmission is needed for native shell changes (Capacitor upgrade, permissions, icon, `Info.plist` / manifest changes).

---

## 10. Go live

- [ ] Review `/privacy` and `/terms` copy with counsel if needed (pages are MVP drafts in repo).
- [x] Admin **placeholder pages removed** — analytics, forms, media-library, settings wired to real panels; only **Site announcements** is explicitly “planned” ([ADMIN_PLATFORM_AUDIT.md](./ADMIN_PLATFORM_AUDIT.md)).
- [ ] Confirm **privacy / terms / contact** pages are correct for Production.
- [ ] Announce / flip DNS only after section 7 passes.
- [ ] Watch Vercel logs + Stripe webhook deliveries for the first hour.

---

## Quick reference URLs (Production)

| URL | Purpose |
|-----|---------|
| https://theoutreachproject.app | Public app |
| https://admin.theoutreachproject.app | Admin console (command center, CMS, users, billing ops) |
| https://admin.theoutreachproject.app/admin/advanced | QA status & diagnostics |
| https://theoutreachproject.app/privacy | Privacy policy |
| https://theoutreachproject.app/terms | Terms of use |
| https://theoutreachproject.app/contact | Support / contact |
| https://theoutreachproject.app/api/billing/webhook | Stripe live webhook |

---

## MVP launch blockers (do not skip)

**Web**

| # | Blocker | Status |
|---|---------|--------|
| 1 | **WorkOS Production** keys + callback URI aligned with Vercel env (§4–§5) | [x] browser sign-in/out verified (2026-06-08) |
| 2 | **Supabase Production** migrations applied (§2) | [x] #1–#39 complete |
| 3 | **Stripe live** checkout + webhook updating membership status (§6) | [x] live checkout + Event deliveries **200** |
| 4 | **Demo mode off** in Production (`NEXT_PUBLIC_ENABLE_DEMO_FLOWS=0`) | [x] verified on prod API; re-check after redeploy |
| 5 | **Admin** gated to platform admins only | [x] baseline; expanded admin platform pending §1 deploy |

**Mobile (if shipping native apps with MVP)**

6. **Production web** stable before `mobile:prep:prod` (§9.2).
7. **WorkOS callback + cookies** verified inside iOS/Android WebView (§9.3).
8. **Store policy forms** complete (privacy URL, data safety / App Privacy, reviewer test account).
9. **Signed release builds** uploaded; not debug builds pointed at QA.

---

## Reference docs (deeper detail)

- [ADMIN_PLATFORM_AUDIT.md](./ADMIN_PLATFORM_AUDIT.md) — every `/admin` route, readiness, billing/forecast notes
- [ADMIN_UPGRADE_READINESS.md](./ADMIN_UPGRADE_READINESS.md) — admin upgrade summary, routes, moderation
- [admin-qa-production-setup.md](./admin-qa-production-setup.md) — QA admin host + production mirror
- [../web/docs/CAPACITOR_MOBILE.md](../web/docs/CAPACITOR_MOBILE.md) — Capacitor architecture, scripts, dev URLs
- [connecting-web-mobile-to-legacy-api.md](./connecting-web-mobile-to-legacy-api.md) — legacy mobile data layer vs Next BFF; Capacitor + web integration
- [production-deployment.md](./production-deployment.md)
- [deployment-domains.md](./deployment-domains.md)
- [production-supabase-migration-order.md](./production-supabase-migration-order.md)
- [store-listing-copy.md](./store-listing-copy.md)
- [vercel-production-env.template](./vercel-production-env.template)
- [launch-handoff.md](./launch-handoff.md) — condensed handoff summary (superseded by this doc)
- [../security/deployment-hardening-checklist.md](../security/deployment-hardening-checklist.md)
