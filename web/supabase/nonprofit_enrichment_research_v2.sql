-- Research pipeline metadata + on-site display name (additive).
-- Safe to run on existing projects.

alter table public.nonprofit_directory_enrichment
  add column if not exists display_name_on_site text;

alter table public.nonprofit_directory_enrichment
  add column if not exists research_status text;

alter table public.nonprofit_directory_enrichment
  add column if not exists research_confidence double precision;

alter table public.nonprofit_directory_enrichment
  add column if not exists source_summary text;

alter table public.nonprofit_directory_enrichment
  add column if not exists web_search_supplemented boolean not null default false;

alter table public.nonprofit_directory_enrichment
  add column if not exists canonical_display_name text;

alter table public.nonprofit_directory_enrichment
  add column if not exists website_verified_name text;

alter table public.nonprofit_directory_enrichment
  add column if not exists irs_name text;

alter table public.nonprofit_directory_enrichment
  add column if not exists legal_name text;

alter table public.nonprofit_directory_enrichment
  add column if not exists naming_confidence double precision;

alter table public.nonprofit_directory_enrichment
  add column if not exists naming_source_summary text;

alter table public.nonprofit_directory_enrichment
  add column if not exists naming_status text;

alter table public.nonprofit_directory_enrichment
  add column if not exists naming_last_checked_at timestamptz;

alter table public.nonprofit_directory_enrichment
  add column if not exists naming_verified_at timestamptz;

alter table public.nonprofit_directory_enrichment
  add column if not exists naming_review_required boolean not null default false;

comment on column public.nonprofit_directory_enrichment.display_name_on_site is
  'Organization title as presented on the official website (verified pass only).';

comment on column public.nonprofit_directory_enrichment.research_status is
  'Pipeline outcome: complete | verification_failed | fetch_failed | no_website | etc.';

comment on column public.nonprofit_directory_enrichment.source_summary is
  'Human-readable summary of sources used for verified enrichment.';

comment on column public.nonprofit_directory_enrichment.canonical_display_name is
  'Resolved public-facing nonprofit name chosen by multi-source website + source verification.';

comment on column public.nonprofit_directory_enrichment.website_verified_name is
  'Best website-extracted branding name candidate from official site content.';
