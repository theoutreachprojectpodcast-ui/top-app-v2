-- Keep Iron Soldiers Coffee Company off the main `/sponsors` hub: podcast program only.
-- Safe/idempotent.

begin;

update public.sponsors_catalog
set
  sponsor_scope = 'podcast',
  sponsor_type = case
    when coalesce(trim(sponsor_type), '') = 'foundational_sponsor' then 'podcast_sponsor'
    else coalesce(nullif(trim(sponsor_type), ''), 'podcast_sponsor')
  end,
  updated_at = now()
where slug = 'iron-soldiers-coffee-company';

commit;
