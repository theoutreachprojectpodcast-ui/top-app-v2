# tORP v0.3 — Account types, onboarding, billing, and gating

This note describes how **account intent**, **platform roles**, **billing (Stripe)**, and **entitlements** work together after the unified onboarding pass.

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
- Lifecycle: `POST /api/billing/webhook` updates `membership_*`, `stripe_*`, and **non-staff** `platform_role` from subscription metadata.

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

## Missing configuration

- **Stripe:** `STRIPE_SECRET_KEY`, price IDs for support/member/sponsor, `STRIPE_WEBHOOK_SECRET` — see `web/docs/BILLING_STRIPE_v0.3.md`.
- **Supabase service role:** required for profile and webhook routes (`SUPABASE_SERVICE_ROLE_KEY`).
- **WorkOS:** AuthKit env as in existing setup; without it, localhost auth flows degrade as before.
