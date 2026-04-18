# tORP v0.3 — Directory reset, session persistence, media enrichment

## 1. Directory reset (`useDirectorySearch`)

**Issue:** The session-restore `useEffect` depended on `runSearch`, so any filter change recreated the callback and re-ran the effect. After a search wrote `sessionStorage`, later edits to filters (e.g. city text) could re-apply stored filters and wipe in-progress input.

**Fix:**

- Restore from `torp-directory-session-v1` **once** when the Supabase client is ready (`useEffect` depends only on `supabase`).
- **Clear** still resets filters to defaults (`state`, `q`, `service`, `audience`), clears results/status/meta/page/total, and removes session storage.
- **Race safety:** each `runSearch` uses a generation counter; **Clear** bumps the generation so in-flight responses are ignored.

Outcome: **Clear** is a full slate; typing after a search is not overwritten by storage replay.

## 2. Signed-in state across pages

**Auth shell:** `AuthSessionProvider` wraps the app in `app/layout.js` (with WorkOS cookies as source of truth).

**Flicker reduction:**

- `useLayoutEffect` applies `readNavAuthCache()` before paint so the first client frame can show the last known signed-in state (≤45m stale, `torp_nav_auth_v1`).
- Route changes still call `refresh({ soft: true })` so a transient network error does not clear auth; explicit sign-out clears the cache (`profile` hooks + `/sign-out` flow).

**Subpage header:** `SubpageTopbarActions` treats **loading + cached authenticated** as signed-in for the auth cluster so the bar does not flash empty while `/api/me` completes.

## 3. Enrichment & rendering (logos / hero images)

**Principle:** No scraping on render; cards use DB/API fields already on the row. Invalid URLs should not become `<img src>` or CSS `url()`.

**`sanitizeDisplayableImageUrl`** (`lib/media/safeImageUrl.js`): allows same-origin paths (`/…`, not `//…`) and `http:` / `https:` only.

**Applied to:**

- `resolveOrgListingHeaderImageUrl` — directory + trusted + any card using this resolver (header/hero/thumbnail chain).
- `mapNonprofitCardRow` — `logoUrl`, `cityImageUrl`, `thumbnailUrl`.
- `FeaturedSponsorCard` — mission partners / sponsors / podcast tiers using the same premium card.
- `SponsorProfilePage` — hero background + logo.
- `GuestCard` (podcasts) — guest avatars.

**Fallbacks:** When a URL is empty or rejected, existing UI paths keep category/tone backgrounds and wordmarks (no random remote images).

## 4. Manual review / repair

- Approved or curated assets in `nonprofit_directory_enrichment` / `sponsors_catalog` should not be bulk-overwritten here; use existing admin/moderator tools and enrichment scripts.
- Rows with missing logos remain on moderator review queues; sanitization only hides bad URLs from the browser.

## 5. QA checklist

- Home directory: **Clear** → all filters empty, quick-pick “All areas”, no results until a new search.
- Sign in → visit `/sponsors`, `/trusted`, `/community`, `/profile`, `/notifications` → header stays signed-in; refresh keeps session when valid.
- Cards: broken `javascript:` / malformed image URLs do not render as active media; safe http(s) and `/public` paths still work.
