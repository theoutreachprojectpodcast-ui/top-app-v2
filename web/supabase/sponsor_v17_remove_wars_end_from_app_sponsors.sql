-- Remove War's End from the public sponsors hub (/sponsors). Slug wars-end-merch retained for audit/history.

begin;

update public.sponsors_catalog
set
  is_active = false,
  sponsor_scope = coalesce(nullif(trim(sponsor_scope), ''), 'app'),
  admin_notes = coalesce(
    nullif(trim(admin_notes), ''),
    'Removed from public sponsors hub (v1.7).'
  ),
  updated_at = now()
where slug = 'wars-end-merch';

commit;
