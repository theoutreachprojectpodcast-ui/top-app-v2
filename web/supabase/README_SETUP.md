# Supabase setup runbook (The Outreach Project / `web`)

Run scripts in the **SQL Editor** in the Supabase dashboard (or `psql`) as a role that can create tables and policies (usually **postgres** or the dashboard SQL editor).

All paths below are under `web/supabase/`.

**Principles**

- Prefer **idempotent** files (`IF NOT EXISTS`, additive `ALTER`) on every environment.
- The app talks to Postgres mostly through **Next.js route handlers + `SUPABASE_SERVICE_ROLE_KEY`** (bypasses RLS). **RLS** still protects against accidental use of the **anon** key in clients.
- **Directory search** expects an existing **`nonprofits_search_app_v1`** object (table or view) in `public` for live directory/trusted joins. That object is often maintained **outside** this repo (seed ETL, manual). If it is missing, directory APIs may return empty results until you add it.

---

## 1. Core profiles (required)

| Order | File |
|------:|------|
| 1 | `torp_v03_profiles.sql` |
| 2 | `torp_account_access_model_v03.sql` |
| 3 | `torp_profiles_membership_source.sql` |
| 4 | `torp_profiles_stripe_customer_idx.sql` |

---

## 2. Saved orgs + notifications (recommended)

| Order | File |
|------:|------|
| 5 | `top_app_saved_org_eins.sql` |
| 6 | `torp_platform_notifications.sql` |

---

## 3. Nonprofit directory enrichment (recommended)

Run at least one base enrichment definition; both are safe together if both use `CREATE IF NOT EXISTS` / additive alters.

| Order | File | Notes |
|------:|------|--------|
| 7 | `nonprofit_directory_enrichment.sql` | Base enrichment table + RLS |
| 8 | `org_header_image_enrichment.sql` | Header pipeline, storage-oriented fields (additive) |
| 9 | `nonprofit_enrichment_identity.sql` | Run after `nonprofit_directory_enrichment.sql` |
| 10 | `nonprofit_enrichment_research_v2.sql` | Optional enrichment metadata |

**Optional backfill (review first):** `org_header_image_enrichment_backfill_optional.sql`

---

## 4. Trusted resources

| Order | File |
|------:|------|
| 11 | `trusted_resources.sql` |
| 12 | `trusted_resource_applications.sql` |

**Legacy rename only** (if you still have `proven_allies` and not `trusted_resources`): `migrate_legacy_trusted_catalog_table_names.sql` — read the file before running; it is for migration, not greenfield installs.

---

## 5. Sponsors

| Order | File |
|------:|------|
| 13 | `sponsors_catalog.sql` |
| 14 | `sponsors_catalog_logo_review.sql` |
| 15 | `sponsor_applications.sql` |
| 16 | `sponsor_applications_checkout_columns.sql` |
| 17 | `sponsor_applications_invite_columns.sql` |
| 18 | `sponsor_logo_enrichment.sql` |
| 19 | `safe_alignment_extension_2026_04.sql` | Expects `sponsors_catalog` + `sponsor_applications` |

**Optional / cleanup:** `sponsors_clear_unsplash_backgrounds.sql` (review; may touch data)

---

## 6. Community

| Order | File |
|------:|------|
| 20 | `community.sql` |
| 21 | `community_v03_data_model.sql` | Requires `torp_profiles` (step 1) |

**Optional seed data:** `community_seed_stories.sql` (only if you want demo stories)

---

## 7. Platform admin (bookmarks + first admin email)

| Order | File |
|------:|------|
| 22 | `admin_platform_rbac_v04.sql` | Run after `torp_account_access_model_v03.sql`; community section runs only if `community_posts` exists (run steps 20–21 first) |

---

## 8. Podcasts (if you use podcast routes)

| Order | File |
|------:|------|
| 23 | `podcasts.sql` |
| 24 | `podcast_sponsor_checkout_events.sql` |

---

## 9. Diagnostics / optional

| File | Purpose |
|------|---------|
| `admin_enrichment_diagnostics.sql` | Read-only / operational checks (see comments inside) |
| `platform_future_hooks.sql` | Commented placeholders — **do not** run as-is |

---

## After SQL: environment variables

In Vercel (and local `web/.env.local`), set at least:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- WorkOS: `WORKOS_*`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI`, `APP_BASE_URL`, `NEXT_PUBLIC_APP_URL`
- Stripe (if billing): see `web/.env.local.example`

---

## Quick “minimum viable” sequence

If you want the shortest path to a working app shell + profiles + admin bootstrap:

1. `torp_v03_profiles.sql`  
2. `torp_account_access_model_v03.sql`  
3. `torp_profiles_membership_source.sql`  
4. `torp_profiles_stripe_customer_idx.sql`  
5. `top_app_saved_org_eins.sql`  
6. `torp_platform_notifications.sql`  
7. `nonprofit_directory_enrichment.sql`  
8. `trusted_resources.sql`  
9. `sponsors_catalog.sql` + `sponsor_applications.sql` + checkout/invite columns + `sponsor_logo_enrichment.sql` + `safe_alignment_extension_2026_04.sql` (as needed)  
10. `community.sql` → `community_v03_data_model.sql`  
11. `admin_platform_rbac_v04.sql`  

Then add **`nonprofits_search_app_v1`** in Supabase when you are ready for directory search data.
