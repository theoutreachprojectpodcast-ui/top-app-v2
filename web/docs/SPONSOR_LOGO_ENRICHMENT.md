# Sponsor logo enrichment (tORP v0.3)

## How it works

1. **Moderator** runs **Run logo enrichment** or **Batch (8)** from **Sponsors** → admin tools (`SponsorLogoReviewPanel`), or calls `POST /api/admin/sponsors/logo-enrichment`.
2. Server loads `sponsors_catalog.website_url`, fetches the homepage HTML, and builds an ordered candidate list via `buildOrderedSponsorLogoCandidates` (`<link rel="apple-touch-icon" | icon>`, then Open Graph image when the path suggests a logo, then `/favicon.ico`).
3. Each candidate is downloaded once; bytes are validated (dimensions / aspect ratio for raster images; relaxed rules for `.ico` / favicon).
4. Passing images are uploaded to Supabase Storage bucket **`sponsor-logos`** (override with `SPONSOR_LOGO_BUCKET`). If upload fails, the verified source URL is stored with a note (same pattern as org header images).
5. Rows are updated with `logo_url`, `logo_source_url`, `logo_source_type`, `logo_status` (`found`), `logo_review_status` (`pending_review`), and `logo_notes`.

## Database

- Table: **`sponsors_catalog`**
- Fields: `logo_url`, `logo_source_url`, `logo_source_type`, `logo_status`, `logo_last_enriched_at`, `logo_review_status`, `logo_notes`
- Migration: `web/supabase/sponsor_logo_enrichment.sql` (additive `ALTER TABLE` only)

## Card rendering

- `getSponsorCardViewModel` / `getSponsorProfileViewModel` resolve display URL with `resolveSponsorListingLogoUrl` (respects `rejected`, supports legacy rows with `logo_url` only).
- **`FeaturedSponsorCard`** uses only the resolved `logoUrl` — no Clearbit or Google favicon fallback on render.
- Offline seed data in `featuredSponsors.js` uses `logoUrl: null` so placeholders are wordmarks until Supabase data exists.

## Admin / moderator review

- **API:** `GET /api/admin/sponsors/logo-enrichment?slug=` · `POST` (`{ slug }` or `{ mode: "batch", limit }`) · `PATCH` (`approve` | `reject` | `curate` + optional `logo_url`, `notes`).
- **Locks:** `logo_review_status` / `logo_status` of **`curated`**, or **approved** pair, skip re-enrichment unless `force: true`.
- **Legacy:** rows with `logo_url` set but both `logo_status` and `logo_review_status` empty (e.g. older OG/meta fills) are skipped so existing good art is not replaced unless `force: true`.

## Fallbacks

- If discovery fails and there is no existing `logo_url`, status may be set to **`fallback`** with `pending_review`.
- Rejected logos clear `logo_url` for listing; cards show the **wordmark** (`sponsorPremiumWordmark`).

## Relation to org header-image enrichment

- Same architectural pattern: server pipeline, storage-first, moderator review, resolver for public display.
- **Sponsor background images** remain on `background_image_url` / `POST /api/sponsors/enrich` — unchanged.
