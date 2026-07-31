-- IRS EO BMF nonprofit directory ingestion (501(c)(19) / subsection 19).
-- Idempotent. Safe for QA first, then production.
--
-- Classification note: requested label "5019a" is not a valid IRS code.
-- Interpreted as IRC §501(c)(19) veterans' organizations (EO BMF SUBSECTION = '19').
-- See docs/IRS_NONPROFIT_IMPORT.md.

-- ---------------------------------------------------------------------------
-- 1) Canonical IRS import table (always owned by this migration)
-- ---------------------------------------------------------------------------
create table if not exists public.irs_eo_organizations (
  ein text primary key check (ein ~ '^[0-9]{9}$'),
  org_name text not null,
  irs_subsection text not null,
  irs_classification text null,
  foundation_code text null,
  city text null,
  state text null,
  zip text null,
  country text null default 'US',
  street text null,
  deductibility_code text null,
  deductibility_status text null,
  ruling_date text null,
  ntee_code text null,
  affiliation_code text null,
  organization_code text null,
  irs_status_code text null,
  group_exemption_number text null,
  sort_name text null,
  website text null,
  phone text null,
  description text null,
  category_tags text[] not null default '{}',
  audience_tags text[] not null default '{}',
  serves_veterans boolean not null default false,
  serves_first_responders boolean not null default false,
  directory_status text not null default 'pending_review'
    check (directory_status in ('pending_review', 'approved', 'hidden', 'rejected')),
  is_featured boolean not null default false,
  is_trusted boolean not null default false,
  irs_source_file text null,
  irs_source_date date null,
  last_verified_at timestamptz null,
  import_batch_id uuid null,
  data_origin text not null default 'irs_eo_bmf',
  curated_fields_locked jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_irs_eo_orgs_status on public.irs_eo_organizations (directory_status);
create index if not exists idx_irs_eo_orgs_subsection on public.irs_eo_organizations (irs_subsection);
create index if not exists idx_irs_eo_orgs_state on public.irs_eo_organizations (state);
create index if not exists idx_irs_eo_orgs_ntee on public.irs_eo_organizations (ntee_code);
create index if not exists idx_irs_eo_orgs_name_state_city
  on public.irs_eo_organizations (lower(org_name), state, lower(coalesce(city, '')));
create index if not exists idx_irs_eo_orgs_batch on public.irs_eo_organizations (import_batch_id);
create index if not exists idx_irs_eo_orgs_tags on public.irs_eo_organizations using gin (category_tags);
create index if not exists idx_irs_eo_orgs_audience on public.irs_eo_organizations using gin (audience_tags);

-- ---------------------------------------------------------------------------
-- 2) Import batch / reporting tables
-- ---------------------------------------------------------------------------
create table if not exists public.irs_nonprofit_import_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  mode text not null check (mode in ('dry_run', 'apply')),
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  classification_filter text not null default '19',
  classification_label text not null default '501(c)(19)',
  source_files text[] not null default '{}',
  source_file_date date null,
  states text[] not null default '{}',
  records_found integer not null default 0,
  records_processed integer not null default 0,
  records_added integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  records_failed integer not null default 0,
  error_summary text null,
  error_details jsonb not null default '[]'::jsonb,
  report jsonb not null default '{}'::jsonb,
  triggered_by_workos_user_id text null,
  triggered_by_email text null,
  dry_run_batch_id uuid null references public.irs_nonprofit_import_batches(id)
);

create index if not exists idx_irs_import_batches_created
  on public.irs_nonprofit_import_batches (created_at desc);
create index if not exists idx_irs_import_batches_status
  on public.irs_nonprofit_import_batches (status, mode);

create table if not exists public.irs_nonprofit_import_errors (
  id bigserial primary key,
  batch_id uuid not null references public.irs_nonprofit_import_batches(id) on delete cascade,
  created_at timestamptz not null default now(),
  ein text null,
  org_name text null,
  stage text not null default 'import',
  error_message text not null,
  row_payload jsonb null
);

create index if not exists idx_irs_import_errors_batch
  on public.irs_nonprofit_import_errors (batch_id);

alter table public.irs_eo_organizations
  drop constraint if exists irs_eo_organizations_import_batch_id_fkey;
alter table public.irs_eo_organizations
  add constraint irs_eo_organizations_import_batch_id_fkey
  foreign key (import_batch_id) references public.irs_nonprofit_import_batches(id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- 3) Ensure directory search table exists (greenfield) + IRS columns (existing)
-- ---------------------------------------------------------------------------
do $$
declare
  relkind char;
begin
  select c.relkind into relkind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'nonprofits_search_app_v1';

  if relkind is null then
    create table public.nonprofits_search_app_v1 (
      ein text primary key,
      org_name text not null,
      city text null,
      state text null,
      zip text null,
      ntee_code text null,
      website text null,
      domain text null,
      logo_url text null,
      phone text null,
      description text null,
      serves_veterans boolean not null default false,
      serves_first_responders boolean not null default false,
      verification_tier text null,
      verification_source text null,
      is_trusted boolean not null default false,
      is_featured boolean not null default false,
      directory_status text not null default 'approved'
        check (directory_status in ('pending_review', 'approved', 'hidden', 'rejected')),
      irs_subsection text null,
      irs_classification text null,
      foundation_code text null,
      deductibility_code text null,
      deductibility_status text null,
      ruling_date text null,
      country text null,
      category_tags text[] not null default '{}',
      audience_tags text[] not null default '{}',
      irs_source_file text null,
      irs_source_date date null,
      last_verified_at timestamptz null,
      import_batch_id uuid null,
      data_origin text null,
      last_checked_at timestamptz null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists idx_np_search_state on public.nonprofits_search_app_v1 (state);
    create index if not exists idx_np_search_status on public.nonprofits_search_app_v1 (directory_status);
    create index if not exists idx_np_search_veterans on public.nonprofits_search_app_v1 (serves_veterans);
    create index if not exists idx_np_search_ntee on public.nonprofits_search_app_v1 (ntee_code);
    create index if not exists idx_np_search_org_name on public.nonprofits_search_app_v1 (org_name);
  elsif relkind = 'r' then
    alter table public.nonprofits_search_app_v1 add column if not exists zip text;
    alter table public.nonprofits_search_app_v1 add column if not exists phone text;
    alter table public.nonprofits_search_app_v1 add column if not exists description text;
    alter table public.nonprofits_search_app_v1 add column if not exists serves_veterans boolean default false;
    alter table public.nonprofits_search_app_v1 add column if not exists serves_first_responders boolean default false;
    alter table public.nonprofits_search_app_v1 add column if not exists is_trusted boolean default false;
    alter table public.nonprofits_search_app_v1 add column if not exists is_featured boolean default false;
    alter table public.nonprofits_search_app_v1 add column if not exists directory_status text;
    alter table public.nonprofits_search_app_v1 add column if not exists irs_subsection text;
    alter table public.nonprofits_search_app_v1 add column if not exists irs_classification text;
    alter table public.nonprofits_search_app_v1 add column if not exists foundation_code text;
    alter table public.nonprofits_search_app_v1 add column if not exists deductibility_code text;
    alter table public.nonprofits_search_app_v1 add column if not exists deductibility_status text;
    alter table public.nonprofits_search_app_v1 add column if not exists ruling_date text;
    alter table public.nonprofits_search_app_v1 add column if not exists country text;
    alter table public.nonprofits_search_app_v1 add column if not exists category_tags text[] default '{}';
    alter table public.nonprofits_search_app_v1 add column if not exists audience_tags text[] default '{}';
    alter table public.nonprofits_search_app_v1 add column if not exists irs_source_file text;
    alter table public.nonprofits_search_app_v1 add column if not exists irs_source_date date;
    alter table public.nonprofits_search_app_v1 add column if not exists last_verified_at timestamptz;
    alter table public.nonprofits_search_app_v1 add column if not exists import_batch_id uuid;
    alter table public.nonprofits_search_app_v1 add column if not exists data_origin text;
    alter table public.nonprofits_search_app_v1 add column if not exists updated_at timestamptz default now();

    -- Legacy rows keep directory_status NULL (= publicly visible in app filters).
    -- Do NOT backfill 1.9M+ rows here; NULL is intentional for pre-import catalog data.
    create index if not exists idx_np_search_status on public.nonprofits_search_app_v1 (directory_status);
    create index if not exists idx_np_search_irs_sub on public.nonprofits_search_app_v1 (irs_subsection);
  end if;
  -- If relkind = 'v' (view): IRS columns must exist on the underlying table.
  -- Import still succeeds into irs_eo_organizations; directory mirror is best-effort.
end $$;

-- ---------------------------------------------------------------------------
-- 4) RLS — deny direct PostgREST; app uses service role
-- ---------------------------------------------------------------------------
alter table public.irs_eo_organizations enable row level security;
alter table public.irs_nonprofit_import_batches enable row level security;
alter table public.irs_nonprofit_import_errors enable row level security;

-- Service role must be able to read/write (RLS still blocks anon/authenticated).
revoke all on table public.irs_eo_organizations from anon, authenticated, public;
revoke all on table public.irs_nonprofit_import_batches from anon, authenticated, public;
revoke all on table public.irs_nonprofit_import_errors from anon, authenticated, public;
grant select, insert, update, delete on table public.irs_eo_organizations to service_role;
grant select, insert, update, delete on table public.irs_nonprofit_import_batches to service_role;
grant select, insert, update, delete on table public.irs_nonprofit_import_errors to service_role;
grant usage, select on sequence public.irs_nonprofit_import_errors_id_seq to service_role;
grant all on table public.irs_eo_organizations to postgres;
grant all on table public.irs_nonprofit_import_batches to postgres;
grant all on table public.irs_nonprofit_import_errors to postgres;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irs_eo_organizations'
      and policyname = 'irs_eo_organizations_deny_anon'
  ) then
    create policy irs_eo_organizations_deny_anon on public.irs_eo_organizations
      as restrictive for all to anon using (false) with check (false);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irs_eo_organizations'
      and policyname = 'irs_eo_organizations_deny_authenticated'
  ) then
    create policy irs_eo_organizations_deny_authenticated on public.irs_eo_organizations
      as restrictive for all to authenticated using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irs_nonprofit_import_batches'
      and policyname = 'irs_import_batches_deny_anon'
  ) then
    create policy irs_import_batches_deny_anon on public.irs_nonprofit_import_batches
      as restrictive for all to anon using (false) with check (false);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irs_nonprofit_import_batches'
      and policyname = 'irs_import_batches_deny_authenticated'
  ) then
    create policy irs_import_batches_deny_authenticated on public.irs_nonprofit_import_batches
      as restrictive for all to authenticated using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irs_nonprofit_import_errors'
      and policyname = 'irs_import_errors_deny_anon'
  ) then
    create policy irs_import_errors_deny_anon on public.irs_nonprofit_import_errors
      as restrictive for all to anon using (false) with check (false);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'irs_nonprofit_import_errors'
      and policyname = 'irs_import_errors_deny_authenticated'
  ) then
    create policy irs_import_errors_deny_authenticated on public.irs_nonprofit_import_errors
      as restrictive for all to authenticated using (false) with check (false);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5) Public directory helper: only approved (or legacy NULL) rows
-- ---------------------------------------------------------------------------
create or replace function public.directory_row_is_public(p_status text)
returns boolean
language sql
immutable
as $$
  select p_status is null or p_status = 'approved';
$$;

comment on table public.irs_eo_organizations is
  'IRS EO BMF imports. New rows default to pending_review; never auto-featured/trusted.';
comment on table public.irs_nonprofit_import_batches is
  'Admin/reporting log for IRS nonprofit import dry-runs and apply runs.';
comment on column public.irs_eo_organizations.irs_subsection is
  'EO BMF SUBSECTION code (e.g. 19 = 501(c)(19) veterans organizations).';
