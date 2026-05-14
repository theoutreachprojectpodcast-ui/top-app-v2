-- The Veterans Veteran — official logo asset (v0.12 in web/public/sponsors).
-- Safe/idempotent: only updates when row exists.

update public.sponsors_catalog
set
  logo_url = '/sponsors/the-veterans-veteran-logo.png',
  updated_at = now()
where slug = 'the-veterans-veteran';
