-- tOP v0.6: War's End display name + official wordmark (slug remains wars-end-merch).
-- Run in Supabase so /sponsors matches brand; keeps sponsor_enrichment title in sync.

begin;

update public.sponsors_catalog
set
  name = 'War''s End',
  logo_url =
    'https://images.squarespace-cdn.com/content/v1/6959573fd567e738e7c613f3/cfd220a6-7daf-4845-8d83-fdb8c2ffa128/ChatGPT+Image+Jan+7%2C+2026%2C+08_37_51+PM.png?format=2500w',
  logo_status = coalesce(nullif(trim(logo_status), ''), 'curated'),
  logo_review_status = coalesce(nullif(trim(logo_review_status), ''), 'curated'),
  updated_at = now()
where slug = 'wars-end-merch';

update public.sponsor_enrichment se
set
  canonical_display_name = 'War''s End',
  updated_at = now()
where se.sponsor_id = (select id from public.sponsors_catalog where slug = 'wars-end-merch' limit 1);

commit;
