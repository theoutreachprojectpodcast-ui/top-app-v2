-- tOP v0.6 — Production admin backend + access control model.
-- Safe to re-run in local / QA / production.

begin;

alter table if exists public.torp_profiles
  add column if not exists user_type text not null default 'member',
  add column if not exists user_status text not null default 'active',
  add column if not exists invited_by text,
  add column if not exists permissions jsonb not null default '[]'::jsonb,
  add column if not exists admin_access_enabled boolean not null default false,
  add column if not exists admin_access_granted_by text,
  add column if not exists admin_access_granted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'torp_profiles_user_type_chk'
      and conrelid = 'public.torp_profiles'::regclass
  ) then
    alter table public.torp_profiles
      add constraint torp_profiles_user_type_chk check (
        user_type in (
          'member',
          'admin',
          'sponsor',
          'resource_partner',
          'podcast_guest',
          'moderator',
          'organization_owner',
          'guest'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'torp_profiles_user_status_chk'
      and conrelid = 'public.torp_profiles'::regclass
  ) then
    alter table public.torp_profiles
      add constraint torp_profiles_user_status_chk check (user_status in ('active', 'invited', 'suspended'));
  end if;
end $$;

create index if not exists torp_profiles_user_type_idx on public.torp_profiles (user_type);
create index if not exists torp_profiles_user_status_idx on public.torp_profiles (user_status);
create index if not exists torp_profiles_admin_access_enabled_idx on public.torp_profiles (admin_access_enabled);

-- Seed/update approved admins by email (upsert semantics on existing users).
update public.torp_profiles
set
  platform_role = 'admin',
  user_type = 'admin',
  user_status = 'active',
  admin_access_enabled = true,
  admin_access_granted_by = coalesce(nullif(trim(admin_access_granted_by), ''), 'seed:top-app-v06'),
  admin_access_granted_at = coalesce(admin_access_granted_at, now()),
  updated_at = now()
where lower(trim(coalesce(email, ''))) in (
  'andy@volentelabs.com',
  'jmelching1@gmail.com',
  'hodge5403@gmail.com'
);

commit;

