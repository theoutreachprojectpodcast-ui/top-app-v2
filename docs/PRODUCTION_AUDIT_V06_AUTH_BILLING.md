# tOP v0.6 — Production audit: Auth, accounts, membership, billing

**Date:** 2026-04-30 (branch `v0.6-production-auth-billing`)  
**Scope:** Codebase review against enterprise account + membership goals. This document is the Phase 1 audit; implementation gaps are tracked inline and addressed incrementally in the same release branch where feasible.

---

## 1. Executive summary

| Area | Status | Notes |
|------|--------|--------|
| WorkOS AuthKit (sign-in/up, callback) | **Exists** | `@workos-inc/authkit-nextjs`, `/api/auth/workos/signin`, `/signup`, `/callback`, `src/proxy.js` |
| Session / cookies / idle | **Exists** | `WORKOS_COOKIE_DOMAIN`, idle cookies in `proxy.js`, `POST /api/auth/activity`, `AuthSessionProvider` soft retries |
| Profile storage | **Exists** | `torp_profiles` (or `top_qa_profiles` in QA), `PATCH /api/me/profile`, callback upsert |
| Membership + Stripe | **Partial** | Checkout + portal routes exist; webhooks update `torp_profiles`; tiers `free`/`support`/`member`/`sponsor` |
| Entitlements (server) | **Fixed in v0.6** | Previously only `member` + active unlocked paid surfaces; now **support** and **sponsor** with active billing too; `trialing` treated as active for gates |
| Last login | **Added in v0.6** | Column + throttled `PATCH` from `GET /api/me` |
| Separate `users` / `memberships` / `billing_events` tables | **Missing** | Single **`torp_profiles`** row is the canonical account; **`billing_records`** for admin invoice log |
| Members-only content | **Partial** | Entitlements drive API/UI in places; not a global middleware gate for every route |
| Admin user CRM | **Partial** | `AdminUsersPanel` + `/api/admin/users` PATCH role/tier; no full “billing history” UI |
| Demo mode | **Exists** | `NEXT_PUBLIC_ENABLE_DEMO_FLOWS`, local demo auth — must stay off in production |

---

## 2. WorkOS & session

**Exists:** `workosConfigured.js`, sign-in/up routes, `callback/route.js` with `handleAuth` + `upsertProfileFromWorkOSUser`, `sign-out` route, `resolveWorkOSRouteUser`, `getWorkOSUserFromCookies`, `proxy.js` (www redirect, admin host rewrite, WorkOS proxy, idle cookies).

**Risks / ops (not code bugs):** Redirect URI must match **`NEXT_PUBLIC_WORKOS_REDIRECT_URI`** in the **same** WorkOS environment as API keys. Staging vs Production mismatch causes the common “invalid redirect URI” error.

**Fake / demo:** Local email/password auth when WorkOS is not configured (`NEXT_PUBLIC_ENABLE_DEMO_FLOWS`).

---

## 3. Database model

**Canonical account:** `public.torp_profiles` — `workos_user_id` (unique), email, names, `membership_tier`, `membership_status`, `membership_source`, Stripe IDs, `platform_role`, `account_intent`, `onboarding_status`, `metadata` jsonb, timestamps. **QA mirror:** `top_qa_profiles` when `PROFILE_TABLE` / env selects QA.

**Missing vs idealized spec:** Dedicated `users`, `user_profiles`, `memberships`, `billing_customers`, `billing_events` tables are **not** present as separate entities; behavior is **intentionally consolidated** in `torp_profiles` + Stripe + `billing_records` to avoid duplicate sources of truth. A future migration could normalize if required.

**Non-destructive:** New columns use `ADD COLUMN IF NOT EXISTS` in additive SQL files.

---

## 4. Profile persistence

**Exists:** `PATCH /api/me/profile`, `persistProfile` in `hooks.js`, completion via `computeProfileCompletion` and `/api/me` `profileCompletion`. Callback upsert respects user-edited display name (does not overwrite if set).

**Known UX:** “Complete profile” must not send logged-in users to sign-in — mitigated by `loadingProfile` gating on home notice and nav cache rules (see workspace rules).

---

## 5. Billing & Stripe

**Exists:** `POST /api/billing/webhook` (subscription lifecycle → `torp_profiles`), checkout + portal routes under `api/billing/`, Stripe env validation in scripts.

**Trust model:** Correct — webhooks mutate billing authority; client cannot set WorkOS tier directly (`setMembershipStatus` no-op for WorkOS).

**Gaps:** Explicit **`trialing`** in DB is normalized to **`active`** in webhook mapper today. “Comped” / custom statuses would need schema + product rules. Sponsor application → invoice → activation is partially in admin + `billing_records`; full workflow documentation in `docs/membership-billing.md` and admin docs.

---

## 6. Access control

**Server:** `admin/layout.js` (WorkOS + platform admin), `/api/admin/*` handlers, `resolveWorkOSRouteUser` + service role for mutations, `computeEntitlementsFromProfileRow` for capabilities.

**Gaps:** Not every “member-only” page has a dedicated RSC guard; some gates are feature-level (e.g. community submit, podcast member content lists). A route-level policy matrix is a follow-up.

---

## 7. Environment & domains

**Exists:** `docs/deployment-domains.md`, `vercel.json` www redirect, `NEXT_PUBLIC_ADMIN_URL`, `WORKOS_COOKIE_DOMAIN` alignment for cookies.

**QA vs prod:** Use Preview/QA WorkOS + Stripe test keys; production keys only on production project.

---

## 8. Recommended follow-ups (post v0.6)

1. Optional **normalize** Stripe subscription period fields onto profile or a `billing_events` table for admin reporting.  
2. **Route guard** helper for member-only RSC layouts (single pattern).  
3. **Compress** large static sponsor hero assets.  
4. **Admin:** billing history read-only from Stripe API or mirrored events table.

---

## 9. Validation commands

From repo root: `pnpm install`, `pnpm --filter web build`, `pnpm --filter web lint` (if configured). Apply new SQL in Supabase SQL editor: `web/supabase/torp_profiles_last_login_v06.sql`.
