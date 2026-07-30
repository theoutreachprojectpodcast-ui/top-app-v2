-- Optional backfill: set canonical registry slugs on matching trusted_resources rows by EIN.
-- Run AFTER trusted_resources_slug_and_verification_2026_07.sql.
-- Idempotent. Does not overwrite a different non-empty slug unless it matches the registry value.
--
-- Production uses FORCE ROW LEVEL SECURITY on trusted_resources; this script sets
-- `row_security = off` for the transaction so the UPDATE can run in the SQL editor.

begin;

set local row_security = off;

update public.trusted_resources tr
set
  slug = v.slug,
  updated_at = now()
from (
  values
    ('923487010', 'say-when-and-remember-him'),
    ('993469766', 'back-country-heroes'),
    ('883575938', 'hero-to-the-line'),
    ('412739043', 'heros-journey-healing-foundation'),
    ('541411430', 'freedom-alliance'),
    ('813997855', 'southern-outdoor-dreams'),
    ('474655361', 'frontline-healing-foundation'),
    ('823021911', 'hometown-hero-outdoors'),
    ('333897165', 'the-rivetin-rosies-project'),
    ('822820269', 'changed-by-nature-outdoors'),
    ('331313139', 'shepherds-light-foundation')
) as v(ein_digits, slug)
where regexp_replace(coalesce(tr.ein, ''), '\D', '', 'g') = v.ein_digits
  and (tr.slug is null or btrim(tr.slug) = '' or lower(tr.slug) = v.slug);

commit;
