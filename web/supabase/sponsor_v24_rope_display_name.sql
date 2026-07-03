-- ROPE Solutions — canonical display name (ROPE in all caps).
-- Idempotent. Run when catalog or enrichment still has "Rope Solutions".

begin;

update public.sponsors_catalog
set
  name = 'ROPE Solutions',
  updated_at = now()
where slug = 'rope-solutions'
  and name is distinct from 'ROPE Solutions';

update public.sponsor_enrichment se
set
  canonical_display_name = 'ROPE Solutions',
  updated_at = now()
from public.sponsors_catalog sc
where se.sponsor_id = sc.id
  and sc.slug = 'rope-solutions'
  and se.canonical_display_name is distinct from 'ROPE Solutions';

commit;
