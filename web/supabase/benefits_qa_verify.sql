-- Read-only verification for The Outreach Project QA Benefits foundation.

select
  to_regclass('public.top_profiles') is not null as top_profiles_exists,
  to_regclass('public.top_qa_profiles') is not null as top_qa_profiles_exists,
  to_regclass('public.top_benefits') is not null as benefits_exists,
  to_regclass('public.top_benefit_review_items') is not null as review_queue_exists,
  to_regclass('public.top_benefit_agent_runtime_guard') is not null as agent_guard_exists;

select public_id, title, publication_status, verification_status, evidence_level
from public.top_benefits
order by benefit_number;

select origin, status, count(*) as item_count
from public.top_benefit_review_items
group by origin, status
order by origin, status;

select environment, project_ref, writes_enabled
from public.top_benefit_agent_runtime_guard;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'top_benefits',
    'top_benefit_sources',
    'top_benefit_locations',
    'top_benefit_review_items',
    'top_benefit_lists',
    'top_benefit_list_items',
    'top_benefit_savings_events',
    'top_benefit_agent_runtime_guard'
  )
order by c.relname;

select
  to_regprocedure('public.top_submit_benefit_agent_candidate(text,jsonb,jsonb,text,text,text,numeric,text,text)')
    is not null as agent_intake_rpc_exists,
  to_regprocedure('public.top_accept_benefit_agent_candidate(uuid,uuid,text)')
    is not null as human_accept_rpc_exists,
  (select count(*) from public.top_benefits where publication_status = 'published')
    as published_benefit_count;

