-- Apex Global Outdoors: official circular wordmark (PNG in `/public/sponsors/`). Idempotent.
update public.sponsors_catalog
set
  logo_url = '/sponsors/apex-global-outdoors-logo.png?v=2',
  updated_at = now()
where slug = 'apex-global-outdoors';
