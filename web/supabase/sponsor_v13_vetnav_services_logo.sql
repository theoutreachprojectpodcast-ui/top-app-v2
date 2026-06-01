-- Vet Nav Services — official logo asset (v0.13 in web/public/sponsors).
-- Safe/idempotent: only updates when row exists.

update public.sponsors_catalog
set
  logo_url = '/sponsors/vetnav-services-logo.png',
  updated_at = now()
where slug = 'vetnav-services';
