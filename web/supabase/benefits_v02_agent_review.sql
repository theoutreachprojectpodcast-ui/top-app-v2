-- TOP Benefits v0.2 — guarded agent candidate intake + human draft acceptance.
-- Apply after benefits_v01_schema.sql. Safe to re-run.
--
-- Security boundary:
--   * Agents can propose one pending review item through one narrow RPC.
--   * The intake RPC rejects publication requests and forces draft/in-review state.
--   * Only a separate admin action can accept a candidate as an unpublished draft.
--   * Acceptance creates another pending publication review; it never publishes.
--
-- MANUAL ROLLBACK (QA only, after exporting any review data): revoke/drop the two
-- functions, drop constraint top_benefit_review_agent_never_publishes_chk, then drop
-- column category_art_key only if no app code depends on it. Do not delete accepted drafts.

alter table public.top_benefits
  add column if not exists category_art_key text not null default 'general';

create table if not exists public.top_benefit_agent_runtime_guard (
  environment text primary key check (environment = 'qa'),
  project_ref text not null,
  writes_enabled boolean not null default false,
  enabled_by_profile_id uuid null references public.top_profiles (id) on delete set null,
  enabled_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint top_benefit_agent_runtime_project_ref_chk check (project_ref ~ '^[a-z0-9]{20}$')
);

alter table public.top_benefit_agent_runtime_guard enable row level security;
alter table public.top_benefit_agent_runtime_guard force row level security;
revoke all on table public.top_benefit_agent_runtime_guard from public, anon, authenticated;
grant select on table public.top_benefit_agent_runtime_guard to service_role;
grant all on table public.top_benefit_agent_runtime_guard to postgres;

do $benefits_category_art_constraint$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'top_benefits_category_art_key_chk'
      and conrelid = 'public.top_benefits'::regclass
  ) then
    alter table public.top_benefits
      add constraint top_benefits_category_art_key_chk check (
        category_art_key in (
          'food', 'travel', 'experiences', 'housing', 'technology', 'recreation',
          'career', 'financial', 'shopping', 'connectivity', 'apparel', 'general'
        )
      );
  end if;
end
$benefits_category_art_constraint$;

do $benefits_agent_draft_constraint$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'top_benefit_review_agent_never_publishes_chk'
      and conrelid = 'public.top_benefit_review_items'::regclass
  ) then
    alter table public.top_benefit_review_items
      add constraint top_benefit_review_agent_never_publishes_chk check (
        origin <> 'agent'
        or coalesce(proposed_record ->> 'publication_status', 'draft') = 'draft'
      );
  end if;
end
$benefits_agent_draft_constraint$;

create or replace function public.top_submit_benefit_agent_candidate(
  p_dedupe_key text,
  p_proposed_record jsonb,
  p_evidence jsonb,
  p_explanation text,
  p_agent_name text,
  p_agent_run_id text,
  p_confidence_score numeric,
  p_risk_level text,
  p_project_ref text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $top_submit_benefit_agent_candidate$
declare
  v_id uuid;
  v_record jsonb;
  v_risk text;
  v_confidence numeric;
begin
  if nullif(trim(p_dedupe_key), '') is null then
    raise exception 'agent candidate requires a dedupe key';
  end if;
  if not exists (
    select 1
    from public.top_benefit_agent_runtime_guard
    where environment = 'qa'
      and project_ref = lower(trim(p_project_ref))
      and writes_enabled = true
  ) then
    raise exception 'database agent writes are not enabled for this QA project';
  end if;
  if jsonb_typeof(p_proposed_record) <> 'object' then
    raise exception 'agent proposed_record must be a JSON object';
  end if;
  if jsonb_typeof(p_evidence) <> 'array' or jsonb_array_length(p_evidence) = 0 then
    raise exception 'agent candidate requires at least one evidence item';
  end if;
  if nullif(trim(p_proposed_record ->> 'slug'), '') is null
     or nullif(trim(p_proposed_record ->> 'title'), '') is null
     or nullif(trim(p_proposed_record ->> 'provider_name'), '') is null then
    raise exception 'agent candidate requires slug, title, and provider_name';
  end if;
  if coalesce(p_proposed_record ->> 'publication_status', 'draft') <> 'draft' then
    raise exception 'agent candidates cannot request publication';
  end if;

  v_risk := case when p_risk_level in ('low', 'normal', 'high') then p_risk_level else 'high' end;
  v_confidence := greatest(0, least(1, coalesce(p_confidence_score, 0)));
  v_record := p_proposed_record || jsonb_build_object(
    'publication_status', 'draft',
    'verification_status', case
      when p_proposed_record ->> 'evidence_level' in ('official', 'provider_confirmed', 'official_local')
        then 'in_review'
      else 'unverified'
    end,
    'record_origin', 'agent'
  );

  insert into public.top_benefit_review_items (
    dedupe_key,
    candidate_kind,
    origin,
    status,
    risk_level,
    confidence_score,
    proposed_record,
    proposed_patch,
    evidence,
    explanation,
    agent_name,
    agent_run_id
  ) values (
    trim(p_dedupe_key),
    'new_benefit',
    'agent',
    'pending',
    v_risk,
    v_confidence,
    v_record,
    '{}'::jsonb,
    p_evidence,
    coalesce(nullif(trim(p_explanation), ''), 'Agent candidate for human review.'),
    nullif(trim(p_agent_name), ''),
    nullif(trim(p_agent_run_id), '')
  )
  on conflict (dedupe_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.top_benefit_review_items
    where dedupe_key = trim(p_dedupe_key);
  end if;

  return v_id;
end
$top_submit_benefit_agent_candidate$;

create or replace function public.top_accept_benefit_agent_candidate(
  p_review_item_id uuid,
  p_reviewer_profile_id uuid,
  p_review_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $top_accept_benefit_agent_candidate$
declare
  v_item public.top_benefit_review_items%rowtype;
  v_record jsonb;
  v_evidence jsonb;
  v_benefit_id uuid;
begin
  if p_reviewer_profile_id is null
     or not exists (select 1 from public.top_profiles where id = p_reviewer_profile_id) then
    raise exception 'a valid TOP reviewer profile is required';
  end if;

  select * into v_item
  from public.top_benefit_review_items
  where id = p_review_item_id
  for update;

  if not found then
    raise exception 'agent candidate not found';
  end if;
  if v_item.origin <> 'agent' or v_item.candidate_kind <> 'new_benefit' then
    raise exception 'review item is not an agent benefit candidate';
  end if;
  if v_item.status not in ('pending', 'needs_more_info') or v_item.benefit_id is not null then
    raise exception 'agent candidate is already closed or applied';
  end if;

  v_record := v_item.proposed_record;
  v_evidence := v_item.evidence;

  if coalesce(v_record ->> 'publication_status', 'draft') <> 'draft' then
    raise exception 'agent candidate cannot be accepted with a publication request';
  end if;
  if exists (
    select 1 from public.top_benefits where slug = nullif(trim(v_record ->> 'slug'), '')
  ) then
    raise exception 'a benefit with this slug already exists';
  end if;

  insert into public.top_benefits (
    slug,
    title,
    provider_name,
    provider_url,
    benefit_type,
    category_tags,
    category_art_key,
    audience_tags,
    summary,
    description,
    eligibility_summary,
    eligibility_rules,
    availability_scope,
    country_code,
    state_codes,
    location_notice,
    redemption_method,
    redemption_steps,
    proof_required,
    offer_value_type,
    offer_value_percent,
    offer_value_amount,
    currency_code,
    value_model,
    savings_summary,
    terms_summary,
    publication_status,
    verification_status,
    evidence_level,
    record_origin,
    last_checked_at,
    next_review_at,
    human_reviewed_at,
    human_reviewed_by_profile_id,
    human_review_note,
    created_by_profile_id,
    updated_by_profile_id
  ) values (
    trim(v_record ->> 'slug'),
    trim(v_record ->> 'title'),
    trim(v_record ->> 'provider_name'),
    nullif(trim(v_record ->> 'provider_url'), ''),
    coalesce(nullif(v_record ->> 'benefit_type', ''), 'other'),
    case
      when jsonb_typeof(v_record -> 'category_tags') = 'array'
        then array(select jsonb_array_elements_text(v_record -> 'category_tags'))
      else '{}'::text[]
    end,
    coalesce(nullif(v_record ->> 'category_art_key', ''), 'general'),
    case
      when jsonb_typeof(v_record -> 'audience_tags') = 'array'
        then array(select jsonb_array_elements_text(v_record -> 'audience_tags'))
      else '{}'::text[]
    end,
    trim(v_record ->> 'summary'),
    nullif(trim(v_record ->> 'description'), ''),
    trim(v_record ->> 'eligibility_summary'),
    '{}'::jsonb,
    trim(v_record ->> 'availability_scope'),
    'US',
    case
      when jsonb_typeof(v_record -> 'state_codes') = 'array'
        then array(
          select upper(state_code)
          from jsonb_array_elements_text(v_record -> 'state_codes') as states(state_code)
        )
      else '{}'::text[]
    end,
    nullif(trim(v_record ->> 'location_notice'), ''),
    coalesce(nullif(v_record ->> 'redemption_method', ''), 'varies'),
    case
      when jsonb_typeof(v_record -> 'redemption_steps') = 'array'
        then array(select jsonb_array_elements_text(v_record -> 'redemption_steps'))
      else '{}'::text[]
    end,
    case
      when jsonb_typeof(v_record -> 'proof_required') = 'array'
        then array(select jsonb_array_elements_text(v_record -> 'proof_required'))
      else '{}'::text[]
    end,
    coalesce(nullif(v_record ->> 'offer_value_type', ''), 'variable'),
    case when jsonb_typeof(v_record -> 'offer_value_percent') = 'number'
      then (v_record ->> 'offer_value_percent')::numeric else null end,
    case when jsonb_typeof(v_record -> 'offer_value_amount') = 'number'
      then (v_record ->> 'offer_value_amount')::numeric else null end,
    'USD',
    '{}'::jsonb,
    nullif(trim(v_record ->> 'savings_summary'), ''),
    nullif(trim(v_record ->> 'terms_summary'), ''),
    'draft',
    'in_review',
    coalesce(nullif(v_record ->> 'evidence_level', ''), 'unverified'),
    'agent',
    coalesce(nullif(v_record ->> 'last_checked_at', '')::timestamptz, now()),
    coalesce(nullif(v_record ->> 'next_review_at', '')::timestamptz, now() + interval '90 days'),
    now(),
    p_reviewer_profile_id,
    coalesce(nullif(trim(p_review_notes), ''), 'Accepted as an unpublished draft.'),
    p_reviewer_profile_id,
    p_reviewer_profile_id
  )
  returning id into v_benefit_id;

  insert into public.top_benefit_sources (
    benefit_id,
    source_type,
    source_url,
    source_title,
    source_owner,
    claim_supported,
    evidence_status,
    is_primary,
    last_checked_at,
    source_metadata
  )
  select
    v_benefit_id,
    case
      when e.value ->> 'source_type' in (
        'government', 'provider_policy', 'provider_location', 'community_report',
        'forum', 'news', 'social', 'other'
      ) then e.value ->> 'source_type'
      else 'other'
    end,
    e.value ->> 'source_url',
    coalesce(nullif(e.value ->> 'source_title', ''), e.value ->> 'source_url'),
    nullif(e.value ->> 'source_owner', ''),
    nullif(e.value ->> 'claim_supported', ''),
    case
      when e.value ->> 'evidence_status' in ('supports', 'contradicts', 'context', 'unverified')
        then e.value ->> 'evidence_status'
      else 'unverified'
    end,
    coalesce((e.value ->> 'is_primary')::boolean, false),
    now(),
    jsonb_build_object('agent_name', v_item.agent_name, 'agent_run_id', v_item.agent_run_id)
  from jsonb_array_elements(v_evidence) as e(value)
  where nullif(e.value ->> 'source_url', '') is not null
  on conflict (benefit_id, source_url) do nothing;

  update public.top_benefit_review_items
  set
    benefit_id = v_benefit_id,
    status = 'applied',
    reviewed_by_profile_id = p_reviewer_profile_id,
    reviewed_at = now(),
    review_notes = coalesce(nullif(trim(p_review_notes), ''), 'Accepted as an unpublished draft.'),
    applied_at = now(),
    updated_at = now()
  where id = p_review_item_id;

  insert into public.top_benefit_review_items (
    dedupe_key,
    benefit_id,
    candidate_kind,
    origin,
    status,
    risk_level,
    confidence_score,
    proposed_patch,
    evidence,
    explanation,
    submitted_by_profile_id
  ) values (
    'publication:benefit:' || v_benefit_id::text,
    v_benefit_id,
    'field_update',
    'admin',
    'pending',
    v_item.risk_level,
    v_item.confidence_score,
    jsonb_build_object('publication_status', 'published', 'verification_status', 'verified'),
    v_evidence,
    'Separate human publication review required. Accepting the agent candidate created only a draft.',
    p_reviewer_profile_id
  )
  on conflict (dedupe_key) do nothing;

  return v_benefit_id;
end
$top_accept_benefit_agent_candidate$;

revoke all on function public.top_submit_benefit_agent_candidate(
  text, jsonb, jsonb, text, text, text, numeric, text, text
) from public, anon, authenticated;
grant execute on function public.top_submit_benefit_agent_candidate(
  text, jsonb, jsonb, text, text, text, numeric, text, text
) to service_role, postgres;

revoke all on function public.top_accept_benefit_agent_candidate(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.top_accept_benefit_agent_candidate(uuid, uuid, text)
  to service_role, postgres;

comment on function public.top_submit_benefit_agent_candidate(text, jsonb, jsonb, text, text, text, numeric, text, text) is
  'QA agent intake: creates or returns one pending draft-only review item. Never publishes.';
comment on function public.top_accept_benefit_agent_candidate(uuid, uuid, text) is
  'Human admin action: converts an agent proposal into an unpublished draft and creates a separate publication review.';
