-- Per-user saved nonprofit EINs (favorites). Safe to run multiple times.
--
-- Non-destructive by design (for Supabase SQL editor):
--   No DROP POLICY / DROP TABLE. Policies are created only if missing (see pg_policies checks).
-- If you ever need to change a policy definition in place, drop the policy manually in the
-- dashboard (or a one-off script), then re-run this file.

create table if not exists public.top_app_saved_org_eins (
  user_id text not null,
  ein text not null check (ein ~ '^[0-9]{9}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, ein)
);

create index if not exists top_app_saved_org_eins_user_idx on public.top_app_saved_org_eins (user_id);

alter table public.top_app_saved_org_eins enable row level security;

-- Idempotent RLS: create only when missing (avoids DROP POLICY).
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class cls on cls.oid = pol.polrelid
    join pg_catalog.pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'top_app_saved_org_eins'
      and pol.polname = 'top_app_saved_org_eins_owner_all'
  ) then
    -- Demo/local: match profile table pattern — adjust to auth.uid() when using real Supabase Auth.
    create policy top_app_saved_org_eins_owner_all
      on public.top_app_saved_org_eins
      for all
      using (true)
      with check (true);
  end if;
end
$$;
