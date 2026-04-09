-- Safe logo discovery / review metadata (no auto-publish).

alter table public.sponsors_catalog
  add column if not exists logo_candidate_url text,
  add column if not exists logo_review_status text not null default 'unset',
  add column if not exists logo_reviewed_at timestamptz,
  add column if not exists logo_reviewed_by text;

comment on column public.sponsors_catalog.logo_review_status is 'unset | pending | approved | rejected';
comment on column public.sponsors_catalog.logo_candidate_url is 'Proposed URL from discovery workflow; apply to logo_url only after approval.';
