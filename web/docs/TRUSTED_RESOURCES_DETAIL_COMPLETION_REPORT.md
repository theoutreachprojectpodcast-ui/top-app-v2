# Trusted Resources detail-page completion report

Date: 2026-07-28

## 1. Root cause of loading failures

Primary cause: **dual navigation systems**.

- `/trusted` listing cards correctly opened `/trusted/[slug]`.
- In-shell TopApp Trusted Resources cards (`NonprofitCard` with `actionMode="trustedResource"`) always opened `/nonprofit/{EIN}`.
- `/nonprofit/[ein]` loads the IRS directory profile. When that query failed (RLS, missing row, config), the UI showed **“Could not load this organization.”**

Secondary causes:

- Detail resolution **hard-gated** on the static `TRUSTED_RESOURCE_BY_SLUG` registry, so DB-only / admin-created rows could not resolve even with a valid slug.
- Code expected `trusted_resources.slug`, but there was **no checked-in migration** adding / uniquing that column; create/PATCH did not persist slugs.
- Admin create used synthetic `MANUAL…` EINs, which produced fragile `/nonprofit/…` links when cards fell back to EIN.

## 2. Files changed (high level)

- `web/src/features/nonprofits/components/NonprofitCard.jsx` — trusted cards → `/trusted/[slug]`
- `web/src/features/nonprofits/components/NonprofitProfilePage.jsx` — EIN miss tries trusted catalog redirect; removed user-facing “Could not load this organization.”
- `web/src/features/trusted-resources/api/trustedResourceCatalogApi.js` — DB-first resolve; UUID/EIN fallback; redirect metadata
- `web/src/app/api/trusted/catalog/route.js` — no registry hard-gate; alias lookup
- `web/src/app/trusted/[slug]/page.js` — server resolve + canonical redirect
- `web/src/features/trusted-resources/components/TrustedResourceDetailPage.jsx` — resilient load / polished not-found
- `web/src/lib/trusted/trustedResourceSlug.js` — slug helpers
- `web/src/app/api/admin/trusted/route.js` + `[id]/route.js` — slug on create/patch + aliases
- `web/src/features/admin/AdminTrustedPanel.jsx` — slug, verification fields, public preview link
- `web/supabase/trusted_resources_slug_and_verification_2026_07.sql`
- `web/supabase/trusted_resources_registry_slug_backfill_2026_07.sql`
- `web/scripts/verify-trusted-resources-integrity.mjs` + `package.json` prebuild wiring

## 3. Database migrations created

1. `trusted_resources_slug_and_verification_2026_07.sql` — `slug`, aliases table, verification/field_lock columns, indexes, RLS deny for aliases
2. `trusted_resources_registry_slug_backfill_2026_07.sql` — EIN → registry slug backfill for known orgs

**Required ops step:** run both SQL files in Supabase (QA then production).

## 4. RLS policies added/changed

- `trusted_resource_slug_aliases`: RLS enabled; deny-all for `anon` and `authenticated` (service-role APIs only), matching `trusted_resources`.

Public catalog continues to be served via `/api/trusted/catalog` (membership-gated) / server read clients — not direct anon table reads.

## 5. Canonical routing strategy

- Canonical: `/trusted/[slug]`
- Resolve order: published catalog slug → UUID → EIN digits → legacy alias table → curated registry fallback
- Non-canonical params redirect to canonical slug
- TopApp trusted cards use `/trusted/[slug]` (not `/nonprofit/[ein]`)
- Directory `/nonprofit/[ein]` remains for general directory orgs; on directory load failure it attempts a trusted redirect by EIN

## 6. Enrichment and verification strategy

- Existing admin scrape (`POST /api/admin/trusted/[id]/scrape`) remains the enrichment entry (fills empty fields; server-side).
- New columns: `verification_status`, `last_verified_at`, `field_locks`, `data_quality_status`.
- Pages render from **stored** catalog + registry presentation — not live scrapes.
- Admin preview link opens `/trusted/{slug}` before publish.

Full field-diff approval UI / scheduled refresh jobs are scaffolded via columns + scrape; deeper review workflow can extend without changing the public route contract.

## 7–9. Existing resources reviewed

| Metric | Count |
|--------|------:|
| Curated registry records reviewed in CI | **17** |
| Registry records with unique kebab slugs + website/description | **17** |
| Live DB rows requiring admin review after SQL backfill | **Run SQL, then admin audit** (environment-specific) |

Organizations still requiring administrator review after migration:

- Any DB row with `listing_status=active` but empty `slug` after backfill
- Manual/`MANUAL…` EIN rows without website
- Rows with `verification_status` in `imported_awaiting_review` / `incomplete` / `source_unavailable`

## 10. Test results (web / iOS / Android)

| Check | Result |
|-------|--------|
| `node scripts/verify-trusted-resources-registry.mjs` | Pass (17) |
| `node scripts/verify-trusted-resources-integrity.mjs` | Pass |
| Manual web/iOS/Android device matrix | **Pending operator QA** after deploy + SQL |

## 11. CI / production-build

- Integrity script added to `prebuild` as `verify-trusted-resources-integrity.mjs`.
- Full production build not run in this session (env-dependent). Run `pnpm prebuild` / deploy pipeline after SQL.

## 12. Environment variables

No new required env vars. Existing:

- `NEXT_PUBLIC_SUPABASE_URL`
- Supabase anon / `SUPABASE_SERVICE_ROLE_KEY` (server catalog + admin)

## 13. Supabase / Vercel configuration steps

1. Apply `trusted_resources_slug_and_verification_2026_07.sql`
2. Apply `trusted_resources_registry_slug_backfill_2026_07.sql`
3. In Admin → Trusted: confirm every **active** row has a slug; open preview link
4. Redeploy web (Vercel) and ship mobile builds that pick up the same web routes

## 14. Confirmation — every published card opens the correct page

- **Code path:** Yes for TopApp + `/trusted` listing when `trustedResourceSlug` is present (registry merge or DB slug).
- **Production data:** Confirmed after SQL backfill + admin check that every `listing_status=active` row has a unique slug resolving via `/api/trusted/catalog?slug=…`.

## 15. Confirmation — no “Could not load this organization” on trusted experience

- Removed from trusted feature/source trees (CI integrity forbids the string).
- Nonprofit directory page no longer uses that exact phrase; redirects to `/trusted/[slug]` when the EIN maps to a trusted resource.

## Definition of Done checklist (status)

| Criterion | Status |
|-----------|--------|
| Cards open correct org page | Fixed in code; confirm after SQL |
| Pages render without live website scrape | Yes |
| Future admin resources share same detail system | Yes (slug on create + DB resolve) |
| Direct links / refresh | Yes (server + client resolve) |
| Draft/internal data not public via anon RLS | Unchanged deny-all + API gate |
| Automated integrity in CI | Yes (prebuild) |
| No permanent loading / no forbidden copy on trusted paths | Yes |
| Full enrichment review UI / bulk migration report | Partial — columns + scrape; ops SQL required |
| Device matrix + production smoke | Pending deploy |
