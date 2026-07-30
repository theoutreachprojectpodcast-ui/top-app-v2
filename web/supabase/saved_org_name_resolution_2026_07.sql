-- Saved organizations: confirm canonical EIN relationship + RLS (idempotent).
-- Canonical nonprofit key for favorites is the 9-digit EIN (matches directory / enrichment).
-- Name display is resolved at read time from:
--   nonprofits_search_app_v1 → nonprofit_directory_enrichment → nonprofit_profiles
-- Do not store a duplicated organization name on the saved relationship.

create table if not exists public.top_app_saved_org_eins (
  user_id text not null,
  ein text not null check (ein ~ '^[0-9]{9}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, ein)
);

create index if not exists top_app_saved_org_eins_user_idx
  on public.top_app_saved_org_eins (user_id);

create index if not exists top_app_saved_org_eins_ein_idx
  on public.top_app_saved_org_eins (ein);

alter table public.top_app_saved_org_eins enable row level security;

-- Normalize any dashed EIN values that may have slipped in before the check constraint
-- (safe no-op when all rows already match ^[0-9]{9}$).
do $$
begin
  if exists (
    select 1
    from public.top_app_saved_org_eins
    where ein !~ '^[0-9]{9}$'
  ) then
    -- Rewrite only when the normalized target is free for that user.
    update public.top_app_saved_org_eins s
    set ein = regexp_replace(s.ein, '\D', '', 'g')
    where s.ein !~ '^[0-9]{9}$'
      and length(regexp_replace(s.ein, '\D', '', 'g')) = 9
      and not exists (
        select 1
        from public.top_app_saved_org_eins o
        where o.user_id = s.user_id
          and o.ein = regexp_replace(s.ein, '\D', '', 'g')
      );
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'top_app_saved_org_eins'
      and pol.polname = 'top_app_saved_org_eins_owner_all'
  ) then
    drop policy top_app_saved_org_eins_owner_all on public.top_app_saved_org_eins;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'top_app_saved_org_eins'
      and pol.polname = 'top_app_saved_org_eins_block_anon'
  ) then
    create policy top_app_saved_org_eins_block_anon
      on public.top_app_saved_org_eins
      for all
      to anon
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'top_app_saved_org_eins'
      and pol.polname = 'top_app_saved_org_eins_block_authenticated'
  ) then
    create policy top_app_saved_org_eins_block_authenticated
      on public.top_app_saved_org_eins
      for all
      to authenticated
      using (false)
      with check (false);
  end if;
end
$$;

comment on table public.top_app_saved_org_eins is
  'User↔nonprofit favorites keyed by WorkOS user_id + 9-digit EIN. Names resolved via directory/enrichment/profile APIs.';
