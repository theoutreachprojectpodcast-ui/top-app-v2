# Production Supabase migration order

Run in the **Production** Supabase project SQL editor (or CLI). Skip files prefixed `qa_` unless you intentionally want QA seed data in prod.

Apply in order. If a migration was already applied, Postgres will error on duplicate objects — note which step failed and continue from the next file.

## Core (required for MVP)

| # | File | Purpose |
|---|------|---------|
| 1 | `torp_v03_profiles.sql` | Profiles table |
| 2 | `torp_account_access_model_v03.sql` | Access model |
| 3 | `torp_profiles_membership_source.sql` | Membership source column |
| 4 | `torp_profiles_stripe_customer_idx.sql` | Stripe customer index |
| 5 | `torp_profiles_last_login_v06.sql` | Last login tracking |
| 6 | `profile_onboarding_v06_questionnaire.sql` | Onboarding fields |
| 7 | `community.sql` | Community posts |
| 8 | `community_v03_data_model.sql` | Community v3 extensions |
| 9 | `top_app_saved_org_eins.sql` | Saved organizations |
| 10 | `torp_platform_notifications.sql` | Notifications |
| 11 | `trusted_resources.sql` | Trusted resources catalog |
| 12 | `trusted_resource_applications.sql` | Trusted resource applications |
| 13 | `trusted_resources_detail_v01.sql` | Trusted detail v1 |
| 14 | `trusted_resources_detail_v02.sql` | Trusted detail v2 |
| 15 | `sponsors_catalog.sql` | Sponsor catalog |
| 16 | `sponsor_applications.sql` | Sponsor applications |
| 17 | `sponsor_applications_checkout_columns.sql` | Checkout columns |
| 18 | `sponsor_applications_invite_columns.sql` | Invite columns |
| 19 | `sponsor_logo_enrichment.sql` | Logo enrichment |
| 20 | `sponsors_catalog_logo_review.sql` | Logo review |
| 21 | `podcasts.sql` | Podcasts base |
| 22 | `podcast_content_pipeline_v05.sql` | Content pipeline |
| 23 | `podcast_v06_production.sql` | Podcast production |
| 24 | `podcast_episodes_transcript.sql` | Episode transcripts |
| 25 | `podcast_upcoming_guests_v09_status_topic.sql` | Upcoming guests |
| 26 | `podcast_landing_curated_slots_v08.sql` | Landing slots |
| 27 | `podcast_sponsor_checkout_events.sql` | Podcast sponsor checkout audit |
| 28 | `nonprofit_directory_enrichment.sql` | Directory enrichment |
| 29 | `nonprofit_enrichment_identity.sql` | Enrichment identity |
| 30 | `nonprofit_enrichment_research_v2.sql` | Enrichment research |
| 31 | `org_header_image_enrichment.sql` | Org header images |
| 32 | `content_quality_enrichment_v04.sql` | Content quality |
| 33 | `admin_platform_rbac_v04.sql` | Admin RBAC |
| 34 | `admin_backend_v06_access_control.sql` | Admin access control |
| 35 | `admin_cms_v05_all_in_one.sql` | Admin CMS |
| 36 | `admin_audit_logs_v01.sql` | Admin audit logs |
| 37 | `admin_enrichment_diagnostics.sql` | Admin diagnostics (optional) |
| 38 | `platform_future_hooks.sql` | Future hooks (optional) |
| 39 | `safe_alignment_extension_2026_04.sql` | Safe alignment patch |

## Sponsor display / branding (apply after catalog exists)

Run the `sponsor_v*.sql` files in version order (`sponsor_v06` … `sponsor_v17`) if Production should match current QA sponsor hub layout. These are mostly data/copy updates — review each before running on prod.

## Post-migration verification

```sql
-- Profiles + RLS
select count(*) from public.torp_profiles limit 1;

-- Sponsors seeded
select count(*) from public.sponsors_catalog;

-- Admin columns present
select platform_role, admin_access_enabled from public.torp_profiles limit 1;
```

Confirm **RLS enabled** on user-facing tables in Supabase Dashboard → Database → Tables.

## Seed sponsors (if catalog empty)

From repo root with Production Supabase credentials in env:

```bash
pnpm --dir web run seed:sponsors
```

Or run sponsor SQL seeds manually after reviewing content.
