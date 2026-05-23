-- Green Gorilla Land Management — official wordmark (white stencil on black; use dark logo shell in UI).
update public.sponsors_catalog
set
  logo_url = '/sponsors/green-gorilla-land-management-logo.png?v=2',
  logo_source_url = 'https://gglandmanagement.com/wp-content/uploads/2023/08/gg_logo.png',
  logo_source_type = 'manual',
  logo_status = coalesce(nullif(trim(logo_status), ''), 'curated'),
  logo_review_status = coalesce(nullif(trim(logo_review_status), ''), 'approved'),
  updated_at = now()
where slug = 'green-gorilla-land-management';
