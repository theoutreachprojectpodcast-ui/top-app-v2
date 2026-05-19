-- Gameday Men's Health — official horizontal wordmark (app-hosted JPEG).
update public.sponsors_catalog
set logo_url = '/sponsors/gameday-mens-health-wordmark.jpg'
where slug = 'gameday-mens-health'
  and coalesce(logo_url, '') in (
    '',
    '/sponsors/gameday-mens-health-logo-transparent.png',
    '/sponsors/gameday-mens-health-logo.png',
    '/sponsors/gameday-mens-health-logo.jpg'
  );
