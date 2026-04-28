-- OPTIONAL / DESTRUCTIVE TO ROW DATA — run only if you explicitly want to copy legacy hero_image_url
-- into header_image_* fields for rows that have no header yet.
-- Safe in the sense it only touches rows where header_image_url is empty and hero_image_url is set;
-- it still overwrites null header metadata columns on those rows.
--
-- Prefer running moderator enrichment / API instead if you need reviewable pipeline fields.

update public.nonprofit_directory_enrichment e
set
  header_image_url = coalesce(nullif(trim(e.header_image_url), ''), nullif(trim(e.hero_image_url), '')),
  header_image_source_type = coalesce(e.header_image_source_type, 'legacy_hero_image_url'),
  header_image_status = coalesce(nullif(trim(e.header_image_status), ''), 'found'),
  header_image_review_status = coalesce(nullif(trim(e.header_image_review_status), ''), 'pending_review')
where
  coalesce(nullif(trim(e.header_image_url), ''), '') = ''
  and coalesce(nullif(trim(e.hero_image_url), ''), '') <> '';
