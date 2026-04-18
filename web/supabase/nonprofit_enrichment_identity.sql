-- Additive EIN identity flags on enrichment (optional; app defaults to IRS-directory EIN validity when null).
-- Run after nonprofit_directory_enrichment.sql.

alter table public.nonprofit_directory_enrichment
  add column if not exists ein_identity_verified boolean not null default true;

alter table public.nonprofit_directory_enrichment
  add column if not exists identity_verified_at timestamptz;

comment on column public.nonprofit_directory_enrichment.ein_identity_verified is
  'When false, app should not treat this EIN row as a full directory identity (manual revocation).';

comment on column public.nonprofit_directory_enrichment.identity_verified_at is
  'Timestamp when EIN-backed nonprofit identity was last confirmed for enrichment row.';
