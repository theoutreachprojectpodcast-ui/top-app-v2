-- TOP Benefits v0.1 — catalog, evidence, location, review, saved-list, and savings foundation.
-- Apply after top_v03_profiles.sql. Safe to re-run.
--
-- Product guardrails:
--   1. Direct browser access is denied; Next.js route handlers use service_role.
--   2. Published benefits require a completed human review.
--   3. Automated research writes proposed changes to top_benefit_review_items only.
--      This migration intentionally creates no trigger or function that auto-applies a proposal.
--   4. Local/participating-location benefits are represented separately from nationwide benefits.
--
-- ROLLBACK (manual, only after dependent app code is removed): drop the seven top_benefit*
-- tables and top_benefit_number_seq. Keep an export first if member saves or savings exist.

create sequence if not exists public.top_benefit_number_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1;

create table if not exists public.top_benefits (
  id uuid primary key default gen_random_uuid(),
  benefit_number bigint not null default nextval('public.top_benefit_number_seq'),
  public_id text generated always as (lpad(benefit_number::text, 6, '0')) stored,
  slug text not null,
  title text not null,
  provider_name text not null,
  provider_url text null,
  benefit_type text not null
    check (benefit_type in (
      'discount', 'freebie', 'grant', 'scholarship', 'program', 'hidden_gem',
      'waiver', 'refund', 'travel', 'service', 'other'
    )),
  category_tags text[] not null default '{}',
  audience_tags text[] not null default '{}',
  summary text not null,
  description text null,
  eligibility_summary text not null,
  eligibility_rules jsonb not null default '{}'::jsonb,
  availability_scope text not null
    check (availability_scope in (
      'national', 'statewide', 'regional', 'local', 'participating_locations',
      'online', 'hybrid'
    )),
  country_code text not null default 'US',
  state_codes text[] not null default '{}',
  location_notice text null,
  redemption_method text not null default 'varies'
    check (redemption_method in (
      'automatic', 'application', 'in_person', 'online', 'phone', 'mail',
      'lender_or_provider', 'varies'
    )),
  redemption_steps text[] not null default '{}',
  proof_required text[] not null default '{}',
  offer_value_type text not null default 'variable'
    check (offer_value_type in (
      'percent_off', 'fixed_amount', 'fee_waiver', 'free_item', 'free_admission',
      'non_cash', 'variable'
    )),
  offer_value_percent numeric(7, 4) null
    check (offer_value_percent is null or (offer_value_percent >= 0 and offer_value_percent <= 100)),
  offer_value_amount numeric(14, 2) null
    check (offer_value_amount is null or offer_value_amount >= 0),
  currency_code text not null default 'USD',
  value_model jsonb not null default '{}'::jsonb,
  savings_summary text null,
  terms_summary text null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'paused', 'archived')),
  verification_status text not null default 'unverified'
    check (verification_status in (
      'unverified', 'in_review', 'verified', 'needs_review', 'disputed', 'rejected'
    )),
  evidence_level text not null default 'unverified'
    check (evidence_level in (
      'official', 'provider_confirmed', 'official_local', 'community_confirmed',
      'community_reported', 'unverified'
    )),
  record_origin text not null default 'manual'
    check (record_origin in ('manual', 'agent', 'member', 'import')),
  last_checked_at timestamptz null,
  last_verified_at timestamptz null,
  next_review_at timestamptz null,
  expires_at timestamptz null,
  human_reviewed_at timestamptz null,
  human_reviewed_by_profile_id uuid null references public.top_profiles (id) on delete set null,
  human_review_note text null,
  created_by_profile_id uuid null references public.top_profiles (id) on delete set null,
  updated_by_profile_id uuid null references public.top_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint top_benefits_benefit_number_positive check (benefit_number > 0),
  constraint top_benefits_public_id_unique unique (public_id),
  constraint top_benefits_benefit_number_unique unique (benefit_number),
  constraint top_benefits_slug_unique unique (slug),
  constraint top_benefits_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint top_benefits_eligibility_rules_object
    check (jsonb_typeof(eligibility_rules) = 'object'),
  constraint top_benefits_value_model_object
    check (jsonb_typeof(value_model) = 'object'),
  constraint top_benefits_date_order
    check (starts_at is null or ends_at is null or ends_at >= starts_at),
  constraint top_benefits_publish_requires_human_review
    check (
      publication_status <> 'published'
      or (verification_status = 'verified' and human_reviewed_at is not null)
    )
);

alter sequence public.top_benefit_number_seq owned by public.top_benefits.benefit_number;

create index if not exists top_benefits_public_catalog_idx
  on public.top_benefits (publication_status, verification_status, benefit_type, updated_at desc);
create index if not exists top_benefits_review_due_idx
  on public.top_benefits (next_review_at)
  where publication_status in ('published', 'paused');
create index if not exists top_benefits_category_tags_idx
  on public.top_benefits using gin (category_tags);
create index if not exists top_benefits_audience_tags_idx
  on public.top_benefits using gin (audience_tags);
create index if not exists top_benefits_state_codes_idx
  on public.top_benefits using gin (state_codes);

create table if not exists public.top_benefit_sources (
  id uuid primary key default gen_random_uuid(),
  benefit_id uuid not null references public.top_benefits (id) on delete cascade,
  source_type text not null
    check (source_type in (
      'government', 'provider_policy', 'provider_location', 'community_report',
      'forum', 'news', 'social', 'other'
    )),
  source_url text not null,
  source_title text not null,
  source_owner text null,
  claim_supported text null,
  evidence_status text not null default 'unverified'
    check (evidence_status in ('supports', 'contradicts', 'context', 'unverified')),
  is_primary boolean not null default false,
  published_at timestamptz null,
  last_checked_at timestamptz null,
  content_fingerprint text null,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint top_benefit_sources_metadata_object
    check (jsonb_typeof(source_metadata) = 'object'),
  constraint top_benefit_sources_url_unique unique (benefit_id, source_url)
);

create index if not exists top_benefit_sources_benefit_idx
  on public.top_benefit_sources (benefit_id, is_primary desc, last_checked_at desc);

create table if not exists public.top_benefit_locations (
  id uuid primary key default gen_random_uuid(),
  benefit_id uuid not null references public.top_benefits (id) on delete cascade,
  source_id uuid null references public.top_benefit_sources (id) on delete set null,
  provider_location_id text null,
  location_name text not null,
  address_line_1 text null,
  address_line_2 text null,
  city text null,
  state_code text null,
  postal_code text null,
  country_code text not null default 'US',
  latitude numeric(10, 7) null check (latitude is null or latitude between -90 and 90),
  longitude numeric(10, 7) null check (longitude is null or longitude between -180 and 180),
  service_radius_miles numeric(8, 2) null
    check (service_radius_miles is null or service_radius_miles >= 0),
  location_status text not null default 'reported'
    check (location_status in ('reported', 'verified', 'unavailable', 'unknown')),
  offer_override jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz null,
  last_verified_at timestamptz null,
  next_review_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint top_benefit_locations_offer_override_object
    check (jsonb_typeof(offer_override) = 'object')
);

create unique index if not exists top_benefit_locations_provider_id_unique
  on public.top_benefit_locations (benefit_id, provider_location_id)
  where provider_location_id is not null;
create index if not exists top_benefit_locations_postal_idx
  on public.top_benefit_locations (postal_code, location_status, benefit_id);
create index if not exists top_benefit_locations_state_city_idx
  on public.top_benefit_locations (state_code, city, location_status);

create table if not exists public.top_benefit_review_items (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text null unique,
  benefit_id uuid null references public.top_benefits (id) on delete set null,
  candidate_kind text not null
    check (candidate_kind in (
      'new_benefit', 'field_update', 'source_change', 'location_add',
      'location_remove', 'availability_change', 'expiration', 'user_report'
    )),
  origin text not null
    check (origin in ('agent', 'member', 'admin', 'system')),
  status text not null default 'pending'
    check (status in ('pending', 'needs_more_info', 'approved', 'rejected', 'applied')),
  risk_level text not null default 'normal'
    check (risk_level in ('low', 'normal', 'high')),
  confidence_score numeric(5, 4) null
    check (confidence_score is null or confidence_score between 0 and 1),
  proposed_record jsonb not null default '{}'::jsonb,
  proposed_patch jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  explanation text not null,
  agent_name text null,
  agent_run_id text null,
  submitted_by_profile_id uuid null references public.top_profiles (id) on delete set null,
  reviewed_by_profile_id uuid null references public.top_profiles (id) on delete set null,
  reviewed_at timestamptz null,
  review_notes text null,
  applied_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint top_benefit_review_record_object
    check (jsonb_typeof(proposed_record) = 'object'),
  constraint top_benefit_review_patch_object
    check (jsonb_typeof(proposed_patch) = 'object'),
  constraint top_benefit_review_evidence_array
    check (jsonb_typeof(evidence) = 'array'),
  constraint top_benefit_review_applied_requires_human
    check (
      status <> 'applied'
      or (reviewed_at is not null and reviewed_by_profile_id is not null and applied_at is not null)
    )
);

create index if not exists top_benefit_review_queue_idx
  on public.top_benefit_review_items (status, risk_level, created_at asc);
create index if not exists top_benefit_review_benefit_idx
  on public.top_benefit_review_items (benefit_id, created_at desc);
create index if not exists top_benefit_review_agent_run_idx
  on public.top_benefit_review_items (agent_run_id)
  where agent_run_id is not null;

create table if not exists public.top_benefit_lists (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.top_profiles (id) on delete cascade,
  title text not null default 'Saved Benefits',
  description text null,
  is_default boolean not null default false,
  visibility text not null default 'private'
    check (visibility in ('private', 'members', 'unlisted')),
  share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint top_benefit_lists_share_token_unique unique (share_token)
);

create unique index if not exists top_benefit_lists_one_default_per_owner
  on public.top_benefit_lists (owner_profile_id)
  where is_default = true;
create index if not exists top_benefit_lists_owner_idx
  on public.top_benefit_lists (owner_profile_id, updated_at desc);

create table if not exists public.top_benefit_list_items (
  list_id uuid not null references public.top_benefit_lists (id) on delete cascade,
  benefit_id uuid not null references public.top_benefits (id) on delete cascade,
  member_note text null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (list_id, benefit_id)
);

create index if not exists top_benefit_list_items_benefit_idx
  on public.top_benefit_list_items (benefit_id, created_at desc);

create table if not exists public.top_benefit_savings_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.top_profiles (id) on delete cascade,
  benefit_id uuid not null references public.top_benefits (id) on delete restrict,
  amount_saved numeric(14, 2) not null check (amount_saved > 0),
  currency_code text not null default 'USD',
  amount_source text not null default 'member_reported'
    check (amount_source in ('member_reported', 'receipt_supported', 'system_calculated')),
  reporting_status text not null default 'reported'
    check (reporting_status in ('reported', 'confirmed', 'excluded')),
  used_at timestamptz not null default now(),
  member_note text null,
  evidence_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint top_benefit_savings_evidence_object
    check (jsonb_typeof(evidence_metadata) = 'object')
);

create index if not exists top_benefit_savings_rollup_idx
  on public.top_benefit_savings_events (reporting_status, used_at desc, benefit_id);
create index if not exists top_benefit_savings_profile_idx
  on public.top_benefit_savings_events (profile_id, used_at desc);

create or replace function public._top_benefits_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $top_benefits_touch_triggers$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'top_benefits',
    'top_benefit_sources',
    'top_benefit_locations',
    'top_benefit_review_items',
    'top_benefit_lists',
    'top_benefit_savings_events'
  ]
  loop
    trigger_name := table_name || '_touch_updated_at';
    if not exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and t.tgname = trigger_name
        and not t.tgisinternal
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public._top_benefits_touch_updated_at()',
        trigger_name,
        table_name
      );
    end if;
  end loop;
end
$top_benefits_touch_triggers$;

-- Deny direct PostgREST access. Public/member/admin reads and writes go through
-- authenticated Next.js route handlers using service_role and application checks.
do $top_benefits_rls$
declare
  table_name text;
  anon_policy text;
  authenticated_policy text;
begin
  foreach table_name in array array[
    'top_benefits',
    'top_benefit_sources',
    'top_benefit_locations',
    'top_benefit_review_items',
    'top_benefit_lists',
    'top_benefit_list_items',
    'top_benefit_savings_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated, public', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);
    execute format('grant all on table public.%I to postgres', table_name);

    anon_policy := table_name || '_block_anon';
    authenticated_policy := table_name || '_block_authenticated';

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = table_name and policyname = anon_policy
    ) then
      execute format(
        'create policy %I on public.%I as restrictive for all to anon using (false) with check (false)',
        anon_policy,
        table_name
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = table_name and policyname = authenticated_policy
    ) then
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated using (false) with check (false)',
        authenticated_policy,
        table_name
      );
    end if;
  end loop;
end
$top_benefits_rls$;

revoke all on sequence public.top_benefit_number_seq from anon, authenticated, public;
grant usage, select on sequence public.top_benefit_number_seq to service_role;
grant all on sequence public.top_benefit_number_seq to postgres;

comment on table public.top_benefits is
  'Canonical TOP Benefits catalog. public_id is a stable six-digit ID and is never reused.';
comment on table public.top_benefit_sources is
  'Evidence for benefit claims; community/forum sources never become official without review.';
comment on table public.top_benefit_locations is
  'Verified/reported local availability used for ZIP and location-aware benefit search.';
comment on table public.top_benefit_review_items is
  'Human review queue for agent, member, admin, and system proposals. No proposal auto-applies.';
comment on table public.top_benefit_lists is
  'Benefits-only saved/shareable lists, separate from nonprofit saved organizations.';
comment on table public.top_benefit_savings_events is
  'Member usage reports supporting clearly labeled aggregate savings; never theoretical reach.';
