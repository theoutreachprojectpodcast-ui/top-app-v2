# Supabase Alignment Audit (Safe / Additive)

Date: 2026-04-07

Scope covered from current repository schema + app usage (non-destructive audit only):
- nonprofits
- trusted resources
- sponsors
- users/profiles
- community
- sponsor applications
- enrichment/social data

## Current tables found

- `nonprofits_search_app_v1` (read by directory/trusted join code; upstream canonical source)
- `nonprofit_profiles` (trusted fallback source)
- `nonprofits` (trusted fallback source)
- `nonprofit_directory_enrichment` (additive nonprofit enrichment + naming)
- `proven_allies` (trusted resources catalog, legacy table name but actively used)
- `proven_ally_applications`
- `sponsors_catalog` (new sponsor entity table, additive)
- `sponsor_applications`
- `top_app_user_profiles` (referenced by profile code/env; not defined in repo SQL)
- `top_app_saved_org_eins`
- `community_posts`
- `community_post_likes`
- `community_follows`

## Relationship status (current)

- Trusted resources:
  - app joins `proven_allies` -> directory/enrichment by EIN in code
  - no explicit DB FK to enrichment or nonprofit source in current SQL
- Sponsors:
  - `sponsor_applications` has no FK to `sponsors_catalog`
- Community:
  - likes table references posts via FK
  - follows and posts use text author IDs (no explicit FK to profile table)
- Favorites:
  - `top_app_saved_org_eins` keyed by (`user_id`, `ein`) with no explicit profile/org FKs

## Gaps vs target product alignment

1. No generalized social-link verification table across domains.
2. No dedicated sponsor enrichment table (currently enrichment lands in `sponsors_catalog` fields).
3. No explicit sponsor application -> sponsor entity linkage.
4. Trusted resource <-> nonprofit linkage is code-level (EIN join), not explicit relational table.
5. Community moderation/data model can scale, but lacks explicit optional linkage metadata to profile/nonprofit entities.
6. RLS/policy coverage is uneven across domains (some tables have explicit policies, others rely on default behavior).

## Safety constraints applied

- No destructive actions proposed (`DROP`, `TRUNCATE`, table replacement).
- No table renames.
- No duplicate domain tables created for existing domains.
- Additive-only migration prepared:
  - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
  - new supporting/link tables only
  - non-destructive indexes/constraints
  - safe backfill updates

## Deliverables added in this pass

- `web/supabase/safe_alignment_extension_2026_04.sql`
  - additive schema extensions and relationship tables
  - safe backfill statements
  - policy additions for public-read sponsor catalog
  - no destructive operations

## Notes

- This repo environment cannot run Supabase CLI directly (`supabase` binary unavailable here), so migration files are prepared in SQL-first form for your existing Supabase project.
- Apply migration in SQL editor (or your migration pipeline) and then run app/scripts.
