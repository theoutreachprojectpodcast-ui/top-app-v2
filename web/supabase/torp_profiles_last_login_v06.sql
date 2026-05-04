-- v0.6 — Last login timestamp (throttled updates from GET /api/me).
-- Safe additive migration.

alter table public.torp_profiles
  add column if not exists last_login_at timestamptz;

comment on column public.torp_profiles.last_login_at is 'Updated on authenticated /api/me (throttled, e.g. 5m).';

-- QA table may not exist on all projects; skip if missing.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'top_qa_profiles' and c.relkind = 'r'
  ) then
    alter table public.top_qa_profiles
      add column if not exists last_login_at timestamptz;
  end if;
end
$$;
