# ChatGPT Project Context: top-app-v2

Use this document as the first context block when starting a new ChatGPT session for this repo.

## Project Snapshot

- **Name:** The Outreach Project app (`top-app-v2`)
- **Type:** Static single-page web app (HTML/CSS/vanilla JS)
- **Primary users:** Veterans, first responders, supporters
- **Core purpose:** Help users discover nonprofit resources and trusted organizations, with a demo membership experience.

## Tech Stack

- Plain `index.html`, `styles.css`, `app.js`
- Supabase JS client loaded from CDN
- No bundler, no framework, no package manager config in this repo
- Runs via static hosting or a local static HTTP server

## How To Run Locally

- From repo root, start a static server (example):
  - `python -m http.server 5500`
- Open:
  - `http://localhost:5500`

## File Map

- `index.html`
  - App layout and sections (Home, Trusted, Profile, Contact, plus Sponsors/Community gates)
  - Modal markup (upgrade + edit profile)
  - Includes Supabase CDN script and then `app.js`
- `app.js`
  - App state, Supabase queries, UI wiring, membership gating, localStorage persistence
- `styles.css`
  - Full app visual system and responsive layout
- `manifest.json`
  - PWA metadata and icons
- `assets/`
  - Logos, icons, sponsor images, backgrounds

## Data + External Dependencies

- Supabase credentials are defined in `app.js`:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- Main tables used:
  - `nonprofits_search_app_v1` (directory search source)
  - `nonprofit_profiles` (trusted profile metadata)
  - `nonprofits` (trusted org enrichment)

## Product Behavior (Current)

- **Directory Search**
  - Requires a selected state
  - Optional city/org text search
  - Optional service area filter (NTEE major letter)
  - Optional audience filter (`veteran` / `first_responder`)
  - Paginated at 100 rows/page
- **Trusted Resources**
  - Hydrates from trusted profiles + org table merge
  - Displays social/site links when available
- **Membership (Demo mode)**
  - `DEMO_MODE = true` in `app.js`
  - Member-only gates for Sponsors, Community features, favorites, saved org list
  - "Become a Member" flow is simulated in UI
- **Profile/Favorites**
  - Stored in `localStorage` (`top_profile_v3`, `top_favorites_v3`)
  - No backend auth/session currently

## Architecture Notes

- State is mostly module-level globals in `app.js` (`els`, `currentPage`, caches, etc.)
- Rendering is DOM-string and DOM-node based (no virtual DOM)
- Event wiring is centralized in `wireEvents()`
- Entry point is `init()` on `DOMContentLoaded`

## Constraints To Respect

- Keep implementation vanilla JS/CSS/HTML (no framework migration unless requested)
- Preserve member-gating behavior unless explicitly changing product rules
- Avoid breaking Supabase table/field assumptions without coordinated schema updates
- Maintain accessibility basics (button semantics, labels, keyboard escape for modals)

## Known Risks / Improvement Areas

- Supabase anon key is client-exposed (expected for public anon usage, but still sensitive to policy design)
- Large `app.js` file combines data, state, rendering, and event logic (harder to maintain)
- No automated tests or lint setup currently
- `.DS_Store` exists in repo and may be accidental noise

## Recommended First Tasks For Any New ChatGPT Session

1. Confirm local run still works (`python -m http.server 5500`).
2. Reproduce target issue or UX request in browser.
3. Keep fixes focused in existing files (`app.js`, `styles.css`, `index.html`).
4. For bigger changes, propose a small refactor plan before editing.

## Prompt Starter (Copy/Paste)

```text
You are assisting on The Outreach Project web app in this repo.
Read CHATGPT_CONTEXT.md first, then inspect index.html, app.js, and styles.css.
Preserve vanilla JS architecture and current membership-gating behavior unless I explicitly ask otherwise.
When making changes, explain what you changed, why, and how to verify in the browser.
```

