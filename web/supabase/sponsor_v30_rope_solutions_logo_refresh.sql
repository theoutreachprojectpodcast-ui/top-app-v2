-- ROPE Solutions — updated official mark on black (2026-07).
update public.sponsors_catalog
set
  logo_url = '/sponsors/rope-solutions-logo.png?v=3',
  logo_review_status = 'approved',
  logo_status = 'approved',
  updated_at = now()
where slug = 'rope-solutions';
