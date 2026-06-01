-- Apex: hero background PNG is distinct from circular wordmark logo (PNG in `/public/sponsors/`). Idempotent for DBs that still reference the old SVG path.

begin;

update public.sponsors_catalog
set
  logo_url = '/sponsors/apex-global-outdoors-logo.png',
  background_image_url = '/sponsors/featured-bg-apex-global-outdoors.png',
  updated_at = now()
where slug = 'apex-global-outdoors';

commit;
