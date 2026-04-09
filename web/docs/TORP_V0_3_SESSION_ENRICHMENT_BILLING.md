# tORP v0.3 — Persistent sessions, card enrichment, podcast Stripe

## Signed-in state across navigation

- **Root `AuthSessionProvider`** (`src/components/auth/AuthSessionProvider.jsx`) wraps the app in `app/layout.js` (inside `ColorSchemeRoot`).
- It calls `/api/auth/status` and `/api/me` with `credentials: "include"` on **route changes** (`usePathname`) and when the tab becomes **visible** again.
- A **sessionStorage** snapshot (`torp_nav_auth_v1` via `src/lib/auth/navAuthCache.js`) stores the last known `authenticated` / `workos` flags so the UI can recover quickly after refresh (revalidated immediately by the next fetch).
- **`SubpageTopbarActions`** reads `useAuthSession()` instead of running its own fetch per mount, so moving between `/sponsors`, `/trusted`, `/contact`, etc. does not reset the header to a long-lived “loading” or false signed-out state.
- **Sign out** (`profile/hooks.js`) calls `clearNavAuthCache()` before redirecting to WorkOS sign-out or clearing demo state.

WorkOS cookies remain the source of truth; this layer only coordinates **client UI consistency** with the server.

## Trusted Resource / sponsor website enrichment

- **Trusted / directory rows**: enrichment is persisted by **`POST /api/nonprofit/enrich`** into `nonprofit_directory_enrichment` (and related profile fallbacks). Rows are merged in **`mergeDirectoryRowWithEnrichment`** so cards read DB-backed `tagline`, `headline`, `short_description`, socials, etc.—not live scraping on render.
- **Sponsors**: **`POST /api/sponsors/enrich`** fetches the organization website once, then updates `sponsors_catalog` (see route implementation). Run from admin tooling when needed.
- **Batch helper**: `scripts/enrich-trusted-registry-eins.mjs` — loops EINs discovered in `provenAllyRegistry.js` and POSTs to `/api/nonprofit/enrich` with throttling. Requires a running dev server and server-side Supabase credentials.

## Card subheaders (unified presentation)

- **Nonprofit cards**: `mapNonprofitCardRow` sets **`cardSubheader`** (truncated tagline → headline → on-site display name when distinct). Rendered in `NonprofitCard.jsx` as `.nonprofitCardSubheader`.
- **Sponsor cards**: `getSponsorCardViewModel` sets **`cardSubheader`** from long description → tagline → short description → type. Rendered in `FeaturedSponsorCard.jsx` as `.sponsorPremiumSubheader`.

## Podcast “Sponsor the show” — Stripe

- **Capabilities**: `GET /api/billing/capabilities` returns `podcastSponsorCheckout` (boolean) and `podcastSponsorMissingEnv` (list of unset env keys).
- **Checkout**: `POST /api/billing/podcast-sponsor-checkout` — requires WorkOS session, creates a **one-time** Checkout Session (`mode: payment`) for the selected podcast tier.
- **Return verification**: `GET /api/billing/verify-podcast-session?session_id=…` — confirms `payment_status === paid` and metadata matches the signed-in user.
- **Env vars** (all required for “live” podcast checkout): `STRIPE_SECRET_KEY` plus  
  `STRIPE_PRICE_PODCAST_SPONSOR_COMMUNITY`,  
  `STRIPE_PRICE_PODCAST_SPONSOR_IMPACT`,  
  `STRIPE_PRICE_PODCAST_SPONSOR_FOUNDATIONAL`  
  (map to tier ids `podcast-community-500`, `podcast-impact-1000`, `podcast-foundational-2500` — see `src/lib/billing/stripeConfig.js`).
- **When podcast Stripe is not configured**: the application form shows the **exact missing env keys** and allows **review-only submission** with the Step 6 deferred-billing acknowledgement (no demo “fake paid” button for the podcast skin).

## Header / footer shells

- Non-podcast hub routes continue to use **`appShell--siteChrome`** + `site-route-shell.css` (see `TORP_V0_3_IMPLEMENTATION_PASS.md`). Home, profile, and community routes use **`TopApp`**; podcast keeps **`appShell--podcast`**.
