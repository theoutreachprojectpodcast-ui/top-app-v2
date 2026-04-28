-- One-time migration: rename legacy Trusted Resources tables/columns to current names.
-- Run in Supabase SQL editor (postgres role) after backup.
-- Prerequisites: either legacy catalog tables still present, or `public.trusted_resources` (already migrated).

-- 1) Catalog: legacy catalog -> trusted_resources
do $$
begin
  if to_regclass('public.proven_allies') is not null
     and to_regclass('public.trusted_resources') is null then
    alter table public.proven_allies rename to trusted_resources;
  end if;
end $$;

alter index if exists idx_proven_allies_listing rename to idx_trusted_resources_listing;

do $$
begin
  if to_regclass('public.trusted_resources') is null then
    return;
  end if;
  execute 'drop policy if exists proven_allies_select_active on public.trusted_resources';
  execute 'drop policy if exists proven_allies_insert_pending on public.trusted_resources';
  execute 'drop policy if exists proven_allies_update_pending on public.trusted_resources';
  execute 'drop policy if exists trusted_resources_select_active on public.trusted_resources';
  execute 'drop policy if exists trusted_resources_insert_pending on public.trusted_resources';
  execute 'drop policy if exists trusted_resources_update_pending on public.trusted_resources';
end $$;

do $$
begin
  if to_regclass('public.trusted_resources') is null then
    return;
  end if;
  execute $p$
    create policy trusted_resources_select_active on public.trusted_resources
      for select to anon, authenticated
      using (listing_status = 'active')
  $p$;
  execute $p$
    create policy trusted_resources_insert_pending on public.trusted_resources
      for insert to anon, authenticated
      with check (listing_status = 'pending')
  $p$;
  execute $p$
    create policy trusted_resources_update_pending on public.trusted_resources
      for update to anon, authenticated
      using (listing_status = 'pending')
      with check (listing_status = 'pending')
  $p$;
end $$;

-- 2) Applications: legacy intake -> trusted_resource_applications
do $$
begin
  if to_regclass('public.proven_ally_applications') is not null
     and to_regclass('public.trusted_resource_applications') is null then
    alter table public.proven_ally_applications rename to trusted_resource_applications;
  end if;
end $$;

alter index if exists idx_proven_ally_applications_created_at rename to idx_trusted_resource_applications_created_at;
alter index if exists idx_proven_ally_applications_review_status rename to idx_trusted_resource_applications_review_status;
alter index if exists proven_ally_applications_created_at_idx rename to trusted_resource_applications_created_at_idx;
alter index if exists proven_ally_applications_review_status_idx rename to trusted_resource_applications_review_status_idx;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trusted_resource_applications'
      and column_name = 'why_join_proven_allies'
  ) then
    alter table public.trusted_resource_applications
      rename column why_join_proven_allies to why_join_trusted_resources;
  end if;
end $$;

-- 3) Optional: normalize link provenance label
do $$
begin
  if to_regclass('public.trusted_resource_nonprofit_links') is not null then
    update public.trusted_resource_nonprofit_links
    set link_source = 'trusted_resources_ein'
    where link_source = 'proven_allies_ein';
  end if;
end $$;
