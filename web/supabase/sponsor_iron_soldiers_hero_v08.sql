-- Iron Soldiers Coffee Company — card hero + official logo (v0.8 assets in web/public/sponsors).
-- Safe/idempotent: only updates when row exists.

update public.sponsors_catalog
set
  background_image_url = '/sponsors/featured-bg-iron-soldiers-coffee-company.png',
  logo_url = '/sponsors/iron-soldiers-coffee-company-logo.png',
  updated_at = now()
where slug = 'iron-soldiers-coffee-company';
