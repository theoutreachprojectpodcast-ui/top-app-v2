-- tORP v0.4 — Content quality & QA promotion metadata (additive only).
-- Run after nonprofit_directory_enrichment, trusted_resources, sponsors_catalog exist.
-- No DROP / TRUNCATE. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Nonprofit directory enrichment: QA scores & flags
-- ---------------------------------------------------------------------------
alter table public.nonprofit_directory_enrichment
  add column if not exists content_quality_score double precision;

alter table public.nonprofit_directory_enrichment
  add column if not exists enrichment_qa_flags jsonb not null default '[]'::jsonb;

alter table public.nonprofit_directory_enrichment
  add column if not exists last_quality_audit_at timestamptz;

alter table public.nonprofit_directory_enrichment
  add column if not exists enrichment_promotion_ready boolean not null default false;

comment on column public.nonprofit_directory_enrichment.content_quality_score is '0..1 composite completeness + confidence (app-computed).';
comment on column public.nonprofit_directory_enrichment.enrichment_qa_flags is 'JSON array of string codes: missing_logo, weak_description, review_name, etc.';
comment on column public.nonprofit_directory_enrichment.enrichment_promotion_ready is 'True when score/confidence thresholds met and no blocking review flags.';

create index if not exists nonprofit_directory_enrichment_quality_idx
  on public.nonprofit_directory_enrichment (content_quality_score asc nulls last, last_quality_audit_at desc);

-- ---------------------------------------------------------------------------
-- Trusted resources
-- ---------------------------------------------------------------------------
alter table public.trusted_resources
  add column if not exists content_quality_score double precision;

alter table public.trusted_resources
  add column if not exists enrichment_qa_flags jsonb not null default '[]'::jsonb;

alter table public.trusted_resources
  add column if not exists last_quality_audit_at timestamptz;

alter table public.trusted_resources
  add column if not exists enrichment_promotion_ready boolean not null default false;

-- ---------------------------------------------------------------------------
-- Sponsors catalog
-- ---------------------------------------------------------------------------
alter table public.sponsors_catalog
  add column if not exists content_quality_score double precision;

alter table public.sponsors_catalog
  add column if not exists enrichment_qa_flags jsonb not null default '[]'::jsonb;

alter table public.sponsors_catalog
  add column if not exists last_quality_audit_at timestamptz;

alter table public.sponsors_catalog
  add column if not exists enrichment_promotion_ready boolean not null default false;
