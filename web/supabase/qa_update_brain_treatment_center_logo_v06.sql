-- tOP v0.6: set Brain Treatment Center sponsor logo asset.
-- Safe/idempotent update for QA/main sponsor catalog rows.

begin;

update public.sponsors_catalog
set
  logo_url = '/sponsors/brain-treatment-center-logo.svg',
  logo_status = coalesce(nullif(logo_status, ''), 'curated'),
  logo_review_status = coalesce(nullif(logo_review_status, ''), 'curated'),
  updated_at = now()
where
  slug = 'brain-treatment-center'
  or lower(name) like '%brain treatment center%';

commit;
