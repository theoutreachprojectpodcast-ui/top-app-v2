# tORP v0.3 — Membership, sponsors, community seed (implementation pass)

## Membership naming & visuals

- Canonical UI labels live in `src/features/membership/membershipTiers.js`: **Free Membership**, **Support Membership**, **Pro Membership**, **Sponsor Membership**. Storage keys (`none`, `support`, `member`, `sponsor`) are unchanged.
- Tier artwork: `src/features/membership/components/MembershipTierArt.jsx` (SVG, theme-token colors). Used by `MembershipAtAGlance` on the profile tab.
- Onboarding plan cards: `src/features/onboarding/components/OnboardingFlow.jsx` use the same naming.

## Profile membership layout

- **MembershipAtAGlance** is the primary summary (with tier art).
- Duplicate status in **ProfileQuickStats** was removed; upgrade nudge for non–Pro users is a single card with CTA (Stripe/onboarding paths preserved).

## Community stories seed

- SQL: `supabase/community_seed_stories.sql` — inserts three **approved** posts with synthetic `author_id` `seed-community-torp`. Run on your Supabase project after `community.sql` and `community_v03_data_model.sql`.
- Feed continues to load via `/api/community/posts` (no frontend-only mocks for production).

## Home hero image placeholder

- Structure: `TopApp` home wraps the welcome card in `.homeHeroBackdrop` (see `top-app.css`).
- Default asset: `public/brand/home-hero-placeholder.svg`.
- Override: set CSS variable `--home-hero-image` on `.topApp` (e.g. `url('/your/photo.jpg')`) for a production image.

## Sponsor modal triggers

- Header **Become a Sponsor** and home **Sponsors** tile navigate to `/sponsors` **without** `?packages=1`.
- Package and apply modals open only from explicit CTAs on the partners hub (or `?packages=1` / `?apply=1` deep links).

## Stripe vs mission partner flows

- **Account tiers** (Support / Pro / Sponsor Membership): Stripe checkout via `/api/billing/checkout` from onboarding (`OnboardingFlow`).
- **Mission partner packages** (Supporting / Growth / Strategic): application + review in sponsor modals; clarified in `MissionPartnerPackagesModal` copy.

## Partners (`/sponsors`) layout

- `app/sponsors/layout.js` uses `AppShell` with `usePrimaryTopbarChrome`, `useFooterDockChrome`, `showSiteFooter`, and `useTopAppStructure` so content clears the fixed logo and footer matches the glass dock pattern.
- Styles: `src/features/sponsors/styles/sponsors-shell.css`.
- App-wide footer nav includes **Partners** → `/sponsors` (`AppShell.js`).

## Sponsor applications & invites

- **POST** ` /api/sponsor-applications` — public submit, service-role insert (no fake local “success”).
- **Admin** `GET`/`PATCH` `/api/admin/sponsor-applications` — moderator-gated (`COMMUNITY_MODERATOR_EMAILS` / related envs, same helper as community moderation).
- Invite scaffold: `supabase/sponsor_applications_invite_columns.sql` (`invite_token`, `invite_status`, …). Post-submit update sets `pending_provider` when columns exist.
- **Outbound email**: connect a provider (e.g. Resend, SendGrid) and read `invite_*` rows; not wired in this pass.

## Logo discovery (review-first)

- Server helper: `src/lib/sponsors/logoDiscoveryServer.js` (candidate URLs only).
- **POST** `/api/admin/sponsors/logo-candidates` — moderators only; returns `{ candidates }` for manual approval.
- DB metadata: `supabase/sponsors_catalog_logo_review.sql` (`logo_candidate_url`, `logo_review_status`, …). Do not auto-copy to `logo_url` without review.
- CLI probe: `node scripts/sponsor-logo-probe.mjs https://example.com`

## Admin sponsor tools visibility

- `SponsorHub` probes `GET /api/admin/sponsor-applications`; **SponsorAdminEditorSection** and **SponsorAdminReviewSection** render only when the response is **200** (moderator signed in).

## Remaining production wiring

- `SUPABASE_SERVICE_ROLE_KEY` required for application POST + admin routes.
- Email provider + template for sponsor invite links (WorkOS magic link or verification flow).
- Optional: UI button in sponsor admin editor to call `/api/admin/sponsors/logo-candidates` and paste into `logo_url`.
