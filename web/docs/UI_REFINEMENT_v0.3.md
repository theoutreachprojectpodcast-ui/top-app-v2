# tORP v0.3 — UI / UX refinement (stacked on auth / onboarding / billing)

Checkpoint commit (before this work): `checkpoint: pre-ui-refinement-pass (tORP v0.3 stacked)`.

## Home membership CTA (unified)

- Replaced separate **Become a Supporter** and **Become a Member** hero buttons with one primary path:
  - **Signed out:** **Join — account & membership** (WorkOS signup → `/onboarding`, or local demo signup modal).
  - **Signed in (not Member tier):** **Choose membership & billing** (WorkOS users with incomplete onboarding → `/onboarding`; otherwise the in-app upgrade modal with link to onboarding when Stripe/WorkOS is enabled).
- **Browse nonprofits free** scrolls to the directory card (`#home-directory`).
- **Open Profile** / **Manage membership** remain for signed-in users as appropriate.

## Sponsor CTA (canonical)

- **Become a Sponsor** in the main app header and in **SubpageTopbarActions** now goes to **`/sponsors?packages=1`**, which opens the existing **Mission Partner Packages** modal via `SponsorHub` + `useSearchParams`.
- The home “Sponsors” featured tile uses the same destination (no embedded `SponsorHub` inside `TopApp`).
- `SponsorHub` creates its own Supabase client when `supabase` is not passed (standalone `/sponsors` route).

## Mission partners (`/sponsors`) layout

- Replaced the custom `sponsorRouteHeader` layout with **`AppShell`**, matching other subpages (brand stack, subpage top bar, bottom nav, content region).

## Podcast modals

- **Sponsor the show:** existing dark-token modal; overlay **opacity increased** (`rgba(2, 4, 9, 0.92)`) + **backdrop blur** on `.podcastModalOverlay`.
- **Apply to be on the show:** same chrome pattern as the sponsor flow (`podcastSponsorFlowModal__*` + `podcastScope` scroll), shared modal card tokens, `aria-labelledby`, and **no double “card”** on the apply form section (`.podcastApplySection--modalBody`).

## Community (auth-aware)

- **`userId`** is taken from `useProfileData` in `TopApp` (fixes undefined `userId` passed into `CommunityPage`).
- **Loading:** shows session loading state while profile hydrates.
- **Signed out:** hero CTAs (WorkOS signup/sign-in with `returnTo=/community`, or `/?signin=1` for demo), participation hint card, **public feed** still visible; **likes** disabled until signed in (`CommunitySocialActions`).
- **Signed in:** prior behavior (submit story when Member, connections, moderation when applicable).

## Auth UI (header)

- **Signed out (main app):** **Create account** + **Sign in** — WorkOS uses `/api/auth/workos/signup` and `/api/auth/workos/signin` with `returnTo`; demo opens the existing modal.
- **Signed in:** avatar **HeaderAccountMenu** unchanged.
- **Subpages:** `SubpageTopbarActions` is a **client** component that reads `/api/auth/status` + `/api/me` and shows **Profile** vs **Create account / Sign in** accordingly; sponsor button always **`/sponsors?packages=1`**.
- **`?signup=1`** with **`?signin=1`** opens the auth modal in **signup** mode (`TopApp`).

## Theme / scope notes

- Podcast overlays explicitly defeat light-theme global modal backdrop rules where needed (see `podcasts.css`).
- Broad “audit every hardcoded color” (Phase 7) is not fully enumerated here; this pass focused on sponsor routing, sponsors shell, home/community/auth flows, and podcast modals.

## Files touched (high level)

- `TopApp.js`, `HomeWelcomeSection.jsx`, `SubpageTopbarActions.jsx`, `app/sponsors/layout.js`, `SponsorHub.jsx`, `CommunityPage.jsx`, `CommunitySocialActions.jsx`, `PodcastsLandingPage.jsx`, `PodcastApplyGuestForm.jsx`, `podcasts.css`, `top-app.css`.
