# Admin platform audit (sections 17–28)

Audit date: 2026-06-01. Covers every `/admin` route, admin subdomain behavior, navigation, and production readiness.

## Executive summary

| Category | Count |
|----------|-------|
| **Production-ready** | 16 routes |
| **Partial / beta** | 5 routes |
| **Placeholder (labeled)** | 1 route |
| **Redirects** | 1 route |
| **External admin URL** | Optional `admin.{apex}` via `NEXT_PUBLIC_ADMIN_URL` (same app, proxy rewrite) |

The admin platform is **operational for day-to-day CMS, moderation, users, and billing estimates** but **not** a full financial/BI product. Forecasts and MRR are **assumption-based estimates** from profile tiers—not Stripe-settled revenue.

---

## Admin routes audited

| Route | Panel / behavior | Readiness | Notes |
|-------|------------------|-----------|-------|
| `/admin` | Command center dashboard | **Production** | Queues, MRR estimate, Stripe health, quick actions |
| `/admin/content` | Content hub + homepage settings | **Production** | Sponsors/community links + `AdminHomepagePanel` |
| `/admin/content/create` | Guided content wizard | **Production** | Routes to section admins on publish |
| `/admin/content/announcements` | Site announcements | **Placeholder** | Banner shows “planned”; use community/homepage interim |
| `/admin/sponsors` | Sponsor catalog | **Production** | CRUD, featured, mission partner, logos |
| `/admin/community` | Posts moderation + org header review | **Production** | Queue, approve/deny, staff posts |
| `/admin/podcasts` | Applications, episodes, sync | **Production** | Default tab: applications + status filter |
| `/admin/users` | Users management center | **Production** | Search, roles, suspend, tier/status, detail activity |
| `/admin/membership` | Membership center | **Partial** | Live stats; tier **pricing** still code/env |
| `/admin/billing` | Billing & revenue operations | **Production** | MRR/ARR estimate, forecasts, transactions, invoice tools |
| `/admin/trusted` | Trusted resources | **Production** | Manual create + edit + scrape |
| `/admin/nonprofits` | EIN/directory enrichment | **Partial** | EIN lookup; manual create via Trusted |
| `/admin/images` | Page images | **Production** | Section images CRUD |
| `/admin/media-library` | Media library phase 1 | **Partial** | Lists `page_images`; upload tagging TBD |
| `/admin/analytics` | Analytics platform | **Production** | DB-backed counts; no page-view CTR yet |
| `/admin/operations` | Operations hub | **Production** | Links to contact, forms, applications, advanced |
| `/admin/contact` | Contact settings + submissions | **Production** | Uses contact-settings + form-submissions |
| `/admin/forms` | Form submissions inbox | **Production** | Wired to `/api/admin/form-submissions` |
| `/admin/applications` | Sponsorship applications | **Production** | Review workflow |
| `/admin/settings` | Settings + homepage | **Partial** | Homepage live; global env settings not in UI |
| `/admin/advanced` | QA + secondary links | **Production** | `AdminStatusPanel` counters |
| `/admin/status` | Redirect | **Redirect** | → `/admin/advanced` |
| `/admin-login` | Admin sign-in entry | **Production** | Outside `/admin` layout; magic link helper |

### Routes not in primary nav (still valid)

- `/admin/billing` — same as Billing section (invoice tab inside billing ops)
- Legacy links from Advanced page remain valid

### External / admin host

- `adminConsoleHref()` → `https://admin.theoutreachproject.app` when `NEXT_PUBLIC_ADMIN_URL` set
- Same Next.js deployment; middleware rewrites host to `/admin/*`
- **Admin View / Public site** toggle: `AdminViewToggle` in admin header; `AdminConsoleLink` on public app

---

## Fully functional pages

1. Dashboard command center (`/api/admin/command-center`)
2. Sponsors admin
3. Community moderation + staff posts
4. Podcast admin (applications, episodes, sync)
5. Users (search, patch, activity detail, onboarding reset)
6. Trusted resources (including `POST /api/admin/trusted`)
7. Page images
8. Content wizard + content hub
9. Sponsorship applications
10. Contact admin
11. Form submissions
12. Advanced / QA status
13. Analytics (operational DB metrics)
14. Billing operations + invoice email tools

---

## Partially functional pages

| Area | Works today | Gap |
|------|-------------|-----|
| **Membership center** | Tier counts, subscription health from profiles | Edit pricing/benefits/trials without deploy; no conversion/churn analytics pipeline |
| **Media library** | Upload to `admin-media` + browse page images | No “where used” graph |
| **Nonprofit directory** | EIN enrichment | No full manual directory row without IRS |
| **Settings** | Homepage carousel settings | No env/WorkOS/Stripe config UI |
| **Billing** | Estimates + `billing_records` + Stripe flags | No live Stripe Customer/Subscription list API in admin (by design—PCI scope) |
| **Content** | Per-section admins + `page_content_blocks` | Public pages may not read blocks yet |
| **Analytics** | Counts from Supabase | Views, favorites CTR, retention cohorts need instrumentation |

---

## Placeholder / stub (clearly labeled)

| Route | Status |
|-------|--------|
| `/admin/content/announcements` | `AdminScopeBanner` — planned module |

**Removed misleading stubs:** `/admin/analytics`, `/admin/forms`, `/admin/media-library`, `/admin/settings` previously showed only placeholder text; now wired to real (or partial) panels.

---

## Broken links / legacy / duplicate

| Item | Resolution |
|------|------------|
| `/admin/status` | Redirects to `/admin/advanced` (not broken) |
| Duplicate “Membership” in old flat nav | Consolidated under Users + Memberships sections |
| `images` vs `media-library` | Both kept; media-library aggregates page_images |
| `nonprofits` vs `trusted` | Both kept; nonprofits = EIN tool, trusted = listings |

No broken internal admin links found in navigation config.

---

## Mock / demo functionality

- `NEXT_PUBLIC_ENABLE_DEMO_FLOWS` may affect **public** flows; admin APIs use `requirePlatformAdmin*` and service role—not demo stubs.
- QA seed community posts may exist in DB; production can hide via `shouldHideDemoCommunitySeeds()`.
- Revenue **forecasts** are explicitly labeled non-GAAP estimates.

---

## New admin modules added (this buildout)

| Module | Files |
|--------|-------|
| Navigation IA | `lib/admin/adminNavConfig.js`, `components/admin/AdminPlatformNav.jsx` |
| Command center | `api/admin/command-center`, `AdminCommandCenterDashboard.jsx` |
| Analytics API + UI | `api/admin/analytics`, `AdminAnalyticsPlatform.jsx` |
| Billing operations | `api/admin/billing/operations`, `lib/admin/revenueForecast.js`, `AdminBillingOperationsCenter.jsx` |
| User activity | `api/admin/users/[workosUserId]/activity` |
| Membership center | `AdminMembershipCenter.jsx` |
| Forms inbox | `AdminFormSubmissionsPanel.jsx` |
| Media library (phase 1) | `AdminMediaLibraryPanel.jsx` |
| Settings (homepage) | `AdminSettingsPanel.jsx` |
| Operations hub | `/admin/operations` |
| Scope banners | `AdminScopeBanner.jsx` |

---

## Data models used (no new SQL in this pass)

Existing tables: `top_profiles`, `community_posts`, `sponsors_catalog`, `trusted_resources`, `podcast_guest_applications`, `sponsor_applications`, `form_submissions`, `billing_records`, `page_images`, `admin_settings`, `admin_audit_logs`.

**API additions (read/compute only):**

- `GET /api/admin/command-center`
- `GET /api/admin/analytics`
- `GET /api/admin/billing/operations?scenario=&memberGrowth=&churn=&sponsorGrowth=`
- `GET /api/admin/users/:workosUserId/activity`
- `PATCH` users: `reset_onboarding: true`

---

## Billing integrations reviewed

| Capability | Implementation | Admin visibility |
|------------|----------------|------------------|
| Stripe secret | `STRIPE_SECRET_KEY` | Health flags on command center + billing ops |
| Member checkout | `/api/billing/checkout` | Tier counts, subscription status on profiles |
| Customer portal | `/api/billing/portal` | “Has stripe_customer_id” on users table |
| Webhook | `/api/billing/webhook` | `stripeWebhookConfigured()` |
| Sponsor checkout | `/api/billing/podcast-sponsor-checkout` | Listed in integration review |
| Manual invoices | `/api/admin/billing` POST → `billing_records` | Transaction table in billing ops |

**Not exposed in admin (intentional):** card numbers, CVC, full Stripe PaymentIntent payloads. Operators use Stripe Dashboard for PCI-scoped detail.

---

## Forecasting models implemented

Client-visible in **Billing → Revenue & forecast**:

- **MRR/ARR** from profile tier counts × list prices ($1 support, $5.99 pro)
- **Scenarios:** conservative (0.85×), expected (1×), aggressive (1.2×)
- **Adjustable assumptions:** monthly member growth %, churn %, sponsor growth %
- **12-month charts:** membership MRR points + illustrative sponsor revenue

Source: `lib/admin/revenueForecast.js` + `GET /api/admin/billing/operations`.

**Disclaimer shown in UI:** forecasts are not financial statements.

---

## Remaining gaps

1. Stripe Subscription/Invoice browser inside admin (optional future read-only Stripe API)
2. Page-view / engagement analytics (PostHog, Plausible, etc.)
3. Editable membership catalog in DB (avoid code deploy for price copy)
4. Global announcements module
5. Dedicated media storage with upload + reuse tracking
6. Admin activity feed UI (audit logs written on some mutations)
7. Footer/header nav text CMS
8. Conversion/churn **actuals** (needs billing history warehouse)
9. Future modules (events, donations, etc.) — metadata only in `ADMIN_FUTURE_MODULES`

---

## Production readiness assessment

| Area | Ready? |
|------|--------|
| CMS (sponsors, community, trusted, homepage) | **Yes** |
| Moderation & permissions | **Yes** (platform admin gate) |
| User operations | **Yes** (with Stripe Dashboard for payments) |
| Billing **operations** visibility | **Yes** (estimates + records) |
| Financial **reporting** | **No** — use Stripe + accounting tools |
| Unified nav + audit clarity | **Yes** |
| Every nav item meaningful | **Yes** (announcements labeled “Soon”) |

---

## Recommended next-phase improvements

1. **Stripe read-only admin module** — list customers/subscriptions (no PAN data)
2. **`membership_plans` table** — admin-editable pricing/benefits
3. **`site_announcements` table** — dismissible banners
4. **Media storage** — Supabase bucket + admin upload picker
5. **Wire public pages** to read approved `page_content_blocks` (About, footer, membership)
6. **“Where used” graph** for media assets
7. **Retention cohort report** — weekly active users from `last_login_at`

---

## Navigation structure (implemented)

See `web/src/lib/admin/adminNavConfig.js` — sections: Dashboard, Content (children), Users, Memberships, Billing, Sponsors, Community, Podcast, Resources, Media, Analytics, Operations, Advanced, Settings.

Features: search, quick actions, breadcrumbs, localStorage bookmarks, mobile menu toggle, readiness badges (Soon / Beta).

---

## Definition of done (section 28) — status

| Criterion | Status |
|-----------|--------|
| Every nav item has meaningful functionality or clear “planned” label | ✅ |
| All admin routes reviewed | ✅ |
| User management production-ready | ✅ (core ops) |
| Membership management | ⚠️ Partial (stats + user-level; not catalog editor) |
| Billing visibility | ✅ (estimates + records + Stripe health) |
| Financial projections dashboard | ✅ (assumption-based) |
| Sponsor/community/podcast complete | ✅ |
| Site-wide content | ⚠️ Partial (per-section; not every page in one CMS) |
| Command center dashboard | ✅ |
| Admin/Public view toggle | ✅ |
| Public app intact | ✅ (no breaking changes) |
| QA in Advanced | ✅ |
| Documentation | ✅ (this file + `ADMIN_UPGRADE_READINESS.md`) |

---

## Manual validation checklist

1. `/admin` — command center loads; queue counts plausible
2. Nav search finds “Podcast”, “Billing”, “Users”
3. Bookmark a page; reload; bookmark persists
4. `/admin/users` — select user; activity loads
5. `/admin/billing` — change scenario; charts update
6. `/admin/content/announcements` — shows planned banner only
7. `admin.theoutreachproject.app` (if configured) — same pages as `/admin` on apex
8. Non-admin user cannot access `/admin` or `/api/admin/*`
