# tORP v0.3 — Member billing, sponsor reconciliation, account continuity

Concise implementation notes for the stacked pass (member recurring billing, sponsor surfaces, session/profile persistence, autofill).

## 1. Support and Pro pricing

- **Support Membership:** $1.99/month — env `STRIPE_PRICE_SUPPORT_MONTHLY`.
- **Pro Membership:** $5.99/month — env `STRIPE_PRICE_PRO_MONTHLY` (fallback: `STRIPE_PRICE_MEMBER_MONTHLY`).
- UI labels live in `web/src/features/membership/membershipTiers.js` and profile/onboarding copy; no price IDs in components.

## 2. Direct profile-page billing

- WorkOS-authenticated users call `POST /api/billing/checkout` with `{ tier: "support" | "member" | "sponsor", returnPath?: "/profile" }`.
- Server loads `torp_profiles` by WorkOS id, reuses `stripe_customer_id` when present, creates a **subscription** Checkout Session.
- Success/cancel return to `returnPath` with `?checkout=success|cancel`; the profile shell refreshes WorkOS-backed profile after success (WorkOS session only).
- Tier/status in DB are updated by **webhooks**, not by the client.

## 3. Sponsor purchases across podcast, mission partners, and profile

- **Profile / onboarding:** recurring **Sponsor Membership** only when `STRIPE_PRICE_SPONSOR_MONTHLY` is set; same checkout route as Support/Pro.
- **Podcast:** one-time Checkout via `POST /api/billing/podcast-sponsor-checkout` + webhook merge into profile metadata (`podcastSponsorLastTierId`, etc.).
- **Mission partners:** application + optional **demo** payment acknowledgment only — no production Stripe package IDs wired here; avoids fake paid state.

## 4. Session continuity

- WorkOS AuthKit session drives `sessionKind === "workos"`.
- Supabase profile is keyed by `workos_user_id` upsert on callback; returning users attach to the same row.

## 5. WorkOS → Supabase profile

- `upsertProfileFromWorkOSUser` (and related server helpers) ensure one row per WorkOS user.
- `torp_profile_id` and `workos_user_id` in Stripe metadata link payments to that row.

## 6. Profile fields in Supabase (`torp_profiles`)

- Identity and display: `first_name`, `last_name`, `display_name`, `email` (synced from WorkOS where applicable), `bio`, `profile_photo_url`, `mission_statement`, etc. (see `serverProfile` field lists).
- Billing: `membership_tier`, `membership_status`, `membership_source`, `stripe_customer_id`, `stripe_subscription_id`.

## 7. Secure autofill / password managers

- Passwords are **not** stored in Supabase or app DB; WorkOS handles credentials.
- Demo/local sign-in forms in `TopApp` use `autoComplete` (`email`, `current-password`, `new-password`, `given-name`, `family-name`) and appropriate `name` attributes where applicable.
- Sponsor application contact fields use `given-name`, `family-name`, `email`, `tel`.

## 8. Missing Stripe config (live verification)

For **Support + Pro** from profile:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_SUPPORT_MONTHLY`
- `STRIPE_PRICE_PRO_MONTHLY` or `STRIPE_PRICE_MEMBER_MONTHLY`

For **full onboarding** (includes optional Sponsor Membership subscription):

- All of the above plus `STRIPE_PRICE_SPONSOR_MONTHLY`

For **podcast pay now**:

- All three: `STRIPE_PRICE_PODCAST_SPONSOR_COMMUNITY`, `STRIPE_PRICE_PODCAST_SPONSOR_IMPACT`, `STRIPE_PRICE_PODCAST_SPONSOR_FOUNDATIONAL`

Also set `APP_BASE_URL` (or `NEXT_PUBLIC_APP_URL`) for return URLs. Apply `web/supabase/torp_profiles_membership_source.sql` before relying on `membership_source` updates.
