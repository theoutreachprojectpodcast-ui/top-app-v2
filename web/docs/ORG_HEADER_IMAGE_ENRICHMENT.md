# Organization header image enrichment (tORP v0.3)

## Card types

- **Nonprofit directory** and **Trusted Resource** listings both render through `NonprofitCard` and `mapNonprofitCardRow`. They resolve a single **listing header URL** from `nonprofit_directory_enrichment` (and optional `proven_allies` overrides) using `resolveOrgListingHeaderImageUrl`.
- **Sponsor** cards keep their existing shell: `FeaturedSponsorCard` / `sponsors_catalog.background_image_url` with sponsor-specific gradients and tone classes — not merged into this workflow.

## How discovery works

1. Moderators call `POST /api/admin/orgs/header-image` with `{ "ein": "123456789" }` (or use **Batch (8)** from Community → admin tools).
2. Server loads (or seeds) `nonprofit_directory_enrichment`, resolves a **website** from enrichment or `nonprofits_search_app_v1`, then runs `researchOfficialWebsite` + `verifyEnrichmentAgainstRecord` (same verification rules as profile enrichment).
3. The chosen image is **Twitter card image first**, then **Open Graph image**, matching the existing trusted hero extraction policy.
4. The file is **downloaded once** and uploaded to Supabase Storage bucket `org-header-images` (override with `ORG_HEADER_IMAGE_BUCKET`) when possible. If upload fails, the **verified remote URL** is stored with a note so the row is still reviewable.

## Where data lives

- **Primary:** `nonprofit_directory_enrichment` columns `header_image_url`, `header_image_source_*`, `header_image_status`, `header_image_review_status`, `header_image_notes`, `header_image_last_enriched_at`.
- **Trusted catalog overrides:** optional matching columns on `proven_allies` when a listing needs a catalog-only image; `header_image_review_status = curated` skips enrichment overlay from the join.
- **SQL:** apply `web/supabase/org_header_image_enrichment.sql` on existing databases (non-destructive: additive only, no policy drops or data updates). Optional one-time hero→header copy: `org_header_image_enrichment_backfill_optional.sql`. Base table definitions were updated in `nonprofit_directory_enrichment.sql` and `proven_allies.sql` for fresh installs.

## Overlay / filters

- Nonprofit/trusted heroes use `.torpListingCardHero--photo` (mild saturation/contrast) plus `.torpListingCardHeroScrim--resource.torpListingCardHeroScrim--orgListing` for a slightly deeper gradient than the base resource strip.
- Sponsor cards remain on their own background/gradient treatment in `FeaturedSponsorCard.jsx` and related CSS.

## Moderator review

- **Community** page (signed-in moderators): **Organization header images** panel — load by EIN, **Run enrichment**, **Approve** / **Reject**, **Save curated URL**, or **Batch (8)**.
- **API:** `GET /api/admin/orgs/header-image?ein=` · `POST` (single or `{ "mode": "batch", "limit": 8 }`) · `PATCH` with `{ "ein", "action": "approve" | "reject" | "curate", "header_image_url"?, "notes"? }`.
- **Locks:** rows with `header_image_status` or `header_image_review_status` of **`curated`**, or **approved** pair, are skipped unless `force: true` on POST.

## Fallbacks

- If enrichment rejects the image, moderators reject, or URLs are empty, cards fall back to **category gradient** heroes (no random stock URLs in the client).
- Legacy `hero_image_url` / `thumbnail_url` still contribute when the new header pipeline does not supply a displayable URL.

## Storage bucket

Create **`org-header-images`** in Supabase (public read if using `getPublicUrl`). Service-role API routes perform uploads; anonymous users only receive already-public URLs stored in the database.

## Localhost (`pnpm dev` → http://localhost:3000)

API routes use the **Node.js** runtime and require **`SUPABASE_SERVICE_ROLE_KEY`** for enrich/review writes and Storage. Add your WorkOS user email to **`COMMUNITY_MODERATOR_EMAILS`** in `.env.local`. See `.env.local.example`.

## Related: sponsor logos

Sponsor **logos** use a parallel pipeline: see `web/docs/SPONSOR_LOGO_ENRICHMENT.md` and `/api/admin/sponsors/logo-enrichment`. Sponsor **background** images stay on `background_image_url` / `POST /api/sponsors/enrich`.
