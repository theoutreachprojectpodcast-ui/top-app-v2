# tORP v0.3 — Membership, sponsors, community seed (implementation pass)

See also: **`docs/TOP_V0_3_SESSION_ENRICHMENT_BILLING.md`** (persistent nav auth snapshot, enrichment batch script, podcast Stripe env + APIs).

## Membership naming & visuals

- Canonical UI labels live in `src/features/membership/membershipTiers.js`: **Free Membership**, **Support Membership**, **Pro Membership**, **Sponsor Membership**. Storage keys (`none`, `support`, `member`, `sponsor`) are unchanged.
- Tier artwork: `src/features/membership/components/MembershipTierArt.jsx` (SVG, theme-token colors). Used by `MembershipAtAGlance` on the profile tab.
- Onboarding plan cards: `src/features/onboarding/components/OnboardingFlow.jsx` use the same naming.

## Profile membership layout

- **MembershipAtAGlance** is the primary summary (with tier art).
- Duplicate status in **ProfileQuickStats** was removed; upgrade nudge for non–Pro users is a single card with CTA (Stripe/onboarding paths preserved).

## Community stories seed

- **WorkOS-aligned:** use `pnpm seed:local-dev` with `TOP_LOCAL_DATA_SEED=1` and `TOP_SEED_COMMUNITY_AUTHOR_WORKOS_USER_IDS` set to real WorkOS user ids (see `scripts/seed-local-dev-data.mjs`, `.env.local.example`). `community_posts.author_id` matches session `auth.user.id`.
- `supabase/community_seed_stories.sql` is deprecated (no-op); do not rely on non–WorkOS `author_id` values.
- Feed loads via `/api/community/posts` (no frontend-only mocks for production).

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

## Site chrome (home-matched header + footer)

- **Canonical shell** for non–podcast hub routes: `AppShell` with `usePrimaryTopbarChrome`, `useFooterDockChrome`, `showSiteFooter`, `useTopAppStructure`, and `shellClassName="appShell--siteChrome"`.
- **Layouts**: `app/sponsors/layout.js`, `app/trusted/layout.js`, `app/contact/layout.js` import `src/styles/site-route-shell.css` (spacing, footer glass dock, z-index for sponsor sections).
- **Pages** under those routes must **not** nest a second `AppShell` — the layout owns the shell; pages render content only (e.g. `trusted/page.js`, `contact/page.js`).
- App-wide footer nav includes **Partners** → `/sponsors` (`AppShell.js`). **Podcast** routes keep their own layouts/branding.

## Shared listing cards (Trusted Resources + Sponsors)

- **Styles**: `src/styles/torp-listing-cards.css` (imported after `top-app.css` in `app/globals.css`).
- **Trusted / directory cards**: `NonprofitCard.jsx` uses `resultCard--listingHero` with a top **hero strip** — photo from `heroImageUrl` or `thumbnailUrl` when set; otherwise a **category gradient** from `data-torp-listing-category` + `--np-*` tokens (same keys as `categoryMapper`).
- **Featured sponsor cards**: `FeaturedSponsorCard.jsx` adds `torpListingCard` + `torpListingCardHero` on the existing premium shell; **DB** `background_image_url` when present; otherwise a **deterministic warm-tone placeholder** (`torpListingCardHero--sponsorTone-{gold|copper|…}`), not a random stock pick.
- **Logo framing**: sponsor logo shell aligned to **64px** to match nonprofit listing plates (`torp-listing-cards.css` overrides `sponsorPremiumLogoShell`).
- **Manual review**: enrich `hero_image_url` / `background_image_url` in Supabase when moderators approve imagery; keep logo discovery behind `/api/admin/sponsors/logo-candidates` as documented below.

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
