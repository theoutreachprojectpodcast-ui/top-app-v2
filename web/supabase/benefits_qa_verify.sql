-- Read-only, single-row verification for The Outreach Project QA Benefits foundation.
-- Expected project: xqtslzmtjcylfzmmzzmv. This query makes no changes.

with required_tables(table_name) as (
  values
    ('top_profiles'),
    ('top_qa_profiles'),
    ('top_benefits'),
    ('top_benefit_sources'),
    ('top_benefit_locations'),
    ('top_benefit_review_items'),
    ('top_benefit_lists'),
    ('top_benefit_list_items'),
    ('top_benefit_savings_events'),
    ('top_benefit_agent_runtime_guard')
),
table_security as (
  select
    r.table_name,
    c.oid is not null as table_exists,
    coalesce(c.relrowsecurity, false) as rls_enabled,
    coalesce(c.relforcerowsecurity, false) as rls_forced
  from required_tables r
  left join pg_namespace n
    on n.nspname = 'public'
  left join pg_class c
    on c.relnamespace = n.oid
   and c.relname = r.table_name
   and c.relkind in ('r', 'p')
),
benefit_totals as (
  select
    count(*) filter (where publication_status = 'draft') as draft_count,
    count(*) filter (where publication_status = 'published') as published_count,
    array_agg(public_id order by benefit_number)
      filter (where publication_status = 'draft') as draft_public_ids
  from public.top_benefits
),
review_totals as (
  select
    count(*) as review_item_count,
    count(*) filter (where status = 'pending') as pending_review_count
  from public.top_benefit_review_items
),
runtime_guard as (
  select environment, project_ref, writes_enabled
  from public.top_benefit_agent_runtime_guard
  where environment = 'qa'
  limit 1
)
select
  (select count(*) from table_security where table_exists) = 10
    as all_required_tables_exist,
  (select count(*) from table_security where table_exists and rls_enabled) = 10
    as all_required_tables_have_rls,
  (select count(*) from table_security where table_exists and rls_forced) = 8
    as all_benefits_tables_force_rls,
  (select draft_count from benefit_totals) = 2
    as two_controlled_drafts_exist,
  (select published_count from benefit_totals) = 0
    as zero_benefits_published,
  (select draft_public_ids from benefit_totals)
    as draft_public_ids,
  (select review_item_count from review_totals)
    as review_item_count,
  (select pending_review_count from review_totals)
    as pending_review_count,
  to_regprocedure(
    'public.top_submit_benefit_agent_candidate(text,jsonb,jsonb,text,text,text,numeric,text,text)'
  ) is not null as agent_intake_rpc_exists,
  to_regprocedure('public.top_accept_benefit_agent_candidate(uuid,uuid,text)')
    is not null as human_accept_rpc_exists,
  coalesce((select environment = 'qa' from runtime_guard), false)
    as qa_environment_confirmed,
  coalesce(
    (select project_ref = 'xqtslzmtjcylfzmmzzmv' from runtime_guard),
    false
  ) as qa_project_ref_confirmed,
  coalesce((select writes_enabled = false from runtime_guard), false)
    as agent_writes_disabled;
