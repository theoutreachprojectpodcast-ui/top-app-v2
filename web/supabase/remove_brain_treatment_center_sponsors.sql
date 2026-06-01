-- Remove Brain Treatment Center from sponsors_catalog (all known slugs).
-- Child rows referencing sponsors_catalog(id) use ON DELETE CASCADE where applicable.
-- Run once per environment after deploy if legacy rows still exist.

begin;

delete from public.sponsors_catalog
where lower(slug) in (
  'brain-treatment-center',
  'brain-treatment-center-california',
  'brain-treatment-center-nova'
);

commit;
