-- Canonical logo for Eduardo Pico Designs (Shopify CDN). Run in QA/prod as needed.
update public.sponsors_catalog
set
  logo_url = 'https://eduardopicodesigns.com/cdn/shop/files/eduardo_pico_logo.png?v=1775735693&width=240',
  logo_status = coalesce(nullif(trim(logo_status), ''), 'curated'),
  updated_at = now()
where slug = 'eduardo-pico-designs';
