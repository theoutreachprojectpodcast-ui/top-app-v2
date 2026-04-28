# tORP v0.3 — Account types, onboarding, billing, and gating

This note describes how **account intent**, **platform roles**, **billing (Stripe)**, and **entitlements** work together after the unified onboarding pass.

## Phase 1 — Audit snapshot (implementation vs gaps)

| Area | What exists | Notes |
|------|-------------|--------|
| Sign-up / sign-in | WorkOS AuthKit links (`/api/auth/workos/signup`, `signin`) | No app-hosted password fields; sessions are cookie-based. |
| Profile creation | First `PATCH /api/me/profile` inserts `torp_profiles` | Checkout requires an existing profile row. |
| Canonical onboarding | Single route: `/onboarding` + `OnboardingFlow.jsx` | Three steps: intent → profile → plan/billing (sponsor has sub-branch). |
| Account-type selection | Step 0 → `account_intent` in Supabase | Admin/moderator not shown publicly. |
| Stripe Checkout | `POST /api/billing/checkout` (mode `subscription`) | **Success/cancel URLs** use `requestOriginForStripeRedirects(request)` so port **3000** (`pnpm dev:alt`) matches return URLs without changing `APP_BASE_URL`. |
| Webhooks | `POST /api/billing/webhook` | Syncs `membership_*`, Stripe IDs, `platform_role` (non-staff). |
| Completion | `POST /api/me/onboarding/complete` | Durable `onboarding_completed`; returns `redirectPath`. After checkout, if webhook already set `active`, client **auto-calls** complete once. |
| Resume | `metadata.onboardingCurrentStep` (`0`–`2`) + `onboarding_status` | Persisted on each step; server DTO reload picks step back up. |
| Gating | `/api/me` entitlements + community POST guard | Pro member-only tools require **active** Pro subscription (not UI-only). |
| Pricing display | `membershipTiers.js` labels **$1.99/mo** Support, **$5.99/mo** Pro | **Stripe Dashboard** prices must match those amounts; env points to the correct `price_…` IDs. |

**What blocks “live” billing:** missing `STRIPE_*` env, webhook secret, or Supabase service role — APIs return **503/403** with messages; the app shell still loads.

## Canonical end-to-end flow (new WorkOS user)

1. User hits WorkOS sign-up → callback → signed in.
2. User opens `/onboarding` (or is sent there after signup).
3. Step 0: intent saved → `account_intent`, `onboarding_status = in_progress`, `onboardingCurrentStep = 1`.
4. Step 1: profile PATCH → names, bio, sponsor fields as needed → `onboardingCurrentStep = 2`.
5. Step 2: choose plan; if paid → `POST /api/billing/checkout` → Stripe hosted Checkout → return to `/onboarding?checkout=success|cancel`.
6. Webhook updates Supabase when subscription is active; user may auto-complete onboarding or tap **Finish onboarding**.
7. `POST /api/me/onboarding/complete` sets `onboarding_completed` and redirects via `postOnboardingDestination`.

## Supported account types (public vs internal)

| Concept | Storage | Notes |
|--------|---------|--------|
| **Account intent** (`account_intent`) | `torp_profiles.account_intent` | Public self-serve: `free_user`, `support_user`, `member_user`, `sponsor_user`. Internal: `admin_user`, `moderator_user` — **set only in the database** (or future admin tool), never from the public onboarding UI. |
| **Platform role** (`platform_role`) | `torp_profiles.platform_role` | Permission layer: `user`, `support`, `member`, `sponsor`, `moderator`, `admin`. Synced from paid tier via onboarding + Stripe webhooks, except **staff roles are preserved** when subscriptions change. |
| **Billing tier** | `membership_tier` + `membership_status` | `free`, `support`, `member`, `sponsor` with Stripe-driven `membership_status` (`none`, `pending`, `active`, etc.). Stripe remains the billing authority; webhooks update these fields. |
| **Onboarding lifecycle** | `onboarding_status` | `not_started` → `in_progress` (client may set via profile PATCH) → `completed` or `needs_review` (sponsor **application** path). |

## How onboarding branches

1. **Step 0 — Intent** — User picks Browse free / Support / Pro member / Sponsor. Stored as `account_intent`, `onboarding_status = in_progress` via `PATCH /api/me/profile`.
2. **Step 1 — Profile** — Names, bio, optional intent-specific fields (support interests, member note, sponsor org + website).
3. **Step 2 — Plan / billing** — Confirms `membership_tier`. Paid tiers can start **Stripe Checkout** (`POST /api/billing/checkout`). **Sponsors** choose either **Stripe subscription** or **partnership application** (no public admin/moderator choice).

Completing the wizard calls `POST /api/me/onboarding/complete`, which sets `onboarding_completed`, final `onboarding_status`, `platform_role` (unless staff), and returns `redirectPath` for a role-aware landing.

## Data in Supabase (`torp_profiles`)

Core profile fields, `metadata` JSON (sponsor notes, `sponsorOnboardingPath`, `sponsorApplicationStatus`, etc.), Stripe IDs, and the columns above. **No passwords** are stored (WorkOS handles credentials).

**Migration:** run `web/supabase/torp_account_access_model_v03.sql` after `torp_v03_profiles.sql` so `platform_role`, `account_intent`, and `onboarding_status` exist. Without this, API writes to those columns will fail until the migration is applied.

## WorkOS → durable account

Each WorkOS user maps to **one** row keyed by `workos_user_id` (unique). Session persistence is **WorkOS AuthKit** (HTTP-only cookies); the app does not implement IP-based “remember password” behavior.

## Paid onboarding and Stripe

- Checkout: `POST /api/billing/checkout` (metadata includes `workos_user_id`, `membership_tier`).
- **Price mapping (env):** `STRIPE_PRICE_SUPPORT_MONTHLY` → Support (**$1.99/mo** in product copy), `STRIPE_PRICE_PRO_MONTHLY` (or legacy `STRIPE_PRICE_MEMBER_MONTHLY`) → Pro (**$5.99/mo**), `STRIPE_PRICE_SPONSOR_MONTHLY` → sponsor subscription tier.
- Success URL: `{origin}{returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`; cancel: `?checkout=cancel`. **Origin** comes from the **request Host** when the API runs, so localhost:3000 and localhost:3001 both work.
- Lifecycle: `POST /api/billing/webhook` updates `membership_*`, `stripe_*`, and **non-staff** `platform_role` from subscription metadata.
- Customer Portal: `POST /api/billing/portal` uses the same request-based return URL fallback when `STRIPE_CUSTOMER_PORTAL_RETURN_URL` is unset.

## Member-only content gating

- **Server:** `POST /api/community/posts` requires `profileMaySubmitCommunityStory` — active **Pro** billing (`membership_tier === member` and `membership_status === active`) **or** `platform_role` `admin`/`moderator`.
- **Client hint:** `GET /api/me` returns `entitlements.communityStorySubmit` and `entitlements.podcastMemberContent` from the same rules. The profile hook uses `communityStorySubmit` for WorkOS `isMember` (story submission / upgrade UX), so **pending** checkout alone does not unlock member tools.

## Admin / moderator onboarding

- **No** public self-signup. Grant access by setting `platform_role` (and optionally `account_intent`) in SQL, e.g.:

```sql
update public.torp_profiles
set platform_role = 'moderator', account_intent = 'moderator_user', updated_at = now()
where lower(email) = lower('you@example.com');
```

- **Env allow-lists** (`COMMUNITY_MODERATOR_EMAILS`, etc.) still work; **DB `platform_role`** is now honored in moderator checks so staff can be managed centrally.

## Secure autofill / password managers

- Onboarding collects **name** fields with `autocomplete="given-name"` / `family-name` / `nickname`, **email** read-only with `autocomplete="email"`, and **organization/URL** where relevant.
- **Staying signed in** uses WorkOS session cookies, not stored passwords in Supabase and not IP-derived credential memory.

## Missing configuration (exact keys for live verification)

| Key | Purpose |
|-----|---------|
| `STRIPE_SECRET_KEY` | Create Checkout + verify webhooks |
| `STRIPE_WEBHOOK_SECRET` | Verify `POST /api/billing/webhook` |
| `STRIPE_PRICE_SUPPORT_MONTHLY` | Support subscription ($1.99/mo product in Stripe) |
| `STRIPE_PRICE_PRO_MONTHLY` or `STRIPE_PRICE_MEMBER_MONTHLY` | Pro subscription ($5.99/mo product) |
| `STRIPE_PRICE_SPONSOR_MONTHLY` | Optional sponsor subscription tier |
| `SUPABASE_SERVICE_ROLE_KEY` | Profile + webhook writes to `torp_profiles` |
| `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` | WorkOS callback and any non-request-based redirects; optional for membership checkout returns if the app is opened on the same host that calls the API |
| `WORKOS_*` | AuthKit (see `.env.local.example`) |

See also `web/docs/BILLING_STRIPE_v0.3.md`.
