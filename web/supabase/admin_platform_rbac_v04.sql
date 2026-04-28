-- tORP v0.4 — Platform admin RBAC + community follow-up bookmarks (additive).
-- Run after torp_account_access_model_v03.sql.
--
-- Row level security (RLS): this file does NOT add or change policies.
-- - community_posts RLS is defined in community_v03_data_model.sql: anon/authenticated may SELECT only
--   approved, public-facing rows; they have no INSERT/UPDATE/DELETE policies (denied).
-- - The Next.js app reads/writes posts via Route Handlers using the Supabase service role, which bypasses RLS
--   after WorkOS + application-level admin/moderator checks — that is intentional.
-- - torp_profiles uses deny-all RLS for anon/authenticated JWTs; profile data is only mutated server-side.
-- If clients ever queried community_posts with the anon key directly, SELECT policies return whole rows
-- (including any new columns). The product uses /api/community/posts instead; avoid exposing raw PostgREST.
--
-- If you see a notice that community_posts was skipped, create the table first by running (in order):
--   web/supabase/community.sql
--   web/supabase/community_v03_data_model.sql
-- then re-run this file to add bookmark columns.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- First platform admin (by email)
-- Only promotes from user/moderator (or null) — does not overwrite member/sponsor/support/admin.
-- Re-runs are no-ops once andy@… is already admin.
-- ---------------------------------------------------------------------------
update public.torp_profiles
set
  platform_role = 'admin',
  updated_at = now()
where lower(trim(coalesce(email, ''))) = lower(trim('andy@valentelabs.com'))
  and (
    platform_role is null
    or platform_role in ('user', 'moderator')
  );

-- ---------------------------------------------------------------------------
-- Community posts: admin follow-up bookmarks (only when community_posts exists)
-- ---------------------------------------------------------------------------
do $admin_bookmark_block$
declare
  has_deleted_col boolean;
begin
  if to_regclass('public.community_posts') is null then
    raise notice 'admin_platform_rbac_v04: skipped community_posts — table missing. Run community.sql + community_v03_data_model.sql, then re-run this file.';
    return;
  end if;

  alter table public.community_posts
    add column if not exists admin_bookmark boolean not null default false;

  alter table public.community_posts
    add column if not exists admin_bookmark_at timestamptz;

  alter table public.community_posts
    add column if not exists admin_bookmark_note text;

  alter table public.community_posts
    add column if not exists admin_bookmark_by uuid references public.torp_profiles (id) on delete set null;

  comment on column public.community_posts.admin_bookmark is 'Staff follow-up flag for customer outreach (admin console).';
  comment on column public.community_posts.admin_bookmark_by is 'torp_profiles.id of admin who bookmarked.';

  -- Use := not SELECT … INTO — some SQL runners misparse INTO <name> as a table target (42P01).
  has_deleted_col := exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'community_posts'
      and column_name = 'deleted_at'
  );

  if has_deleted_col then
    execute $idx$
      create index if not exists community_posts_admin_bookmark_idx
      on public.community_posts (admin_bookmark, created_at desc)
      where admin_bookmark = true and deleted_at is null
    $idx$;
  else
    execute $idx$
      create index if not exists community_posts_admin_bookmark_idx
      on public.community_posts (admin_bookmark, created_at desc)
      where admin_bookmark = true
    $idx$;
  end if;
end $admin_bookmark_block$;
