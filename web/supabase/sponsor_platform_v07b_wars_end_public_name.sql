-- Idempotent: catalog public title for wars-end-merch → "War's End" (slug unchanged).
-- Safe to re-run. Use after v07 if rows still show "Just War's End".

begin;

update public.sponsors_catalog
set
  name = 'War''s End',
  display_name = 'War''s End',
  long_description = replace(coalesce(long_description, ''), 'Just War''s End is', 'War''s End is'),
  internal_alias = replace(coalesce(internal_alias, ''), 'Just War''s End', 'War''s End'),
  updated_at = now()
where slug = 'wars-end-merch';

commit;
