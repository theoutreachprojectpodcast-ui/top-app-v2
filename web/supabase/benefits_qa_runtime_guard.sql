-- QA ONLY — register the dedicated TOP Benefits QA Supabase project with writes disabled.
-- Do not run in Production. Safe to re-run.
-- Project: The Outreach Project QA (West US / Oregon)
-- Manual rollback: update this row to writes_enabled = false, or delete the single
-- qa row after stopping all Benefits agent runs. Deleting it fails closed.

insert into public.top_benefit_agent_runtime_guard (
  environment,
  project_ref,
  writes_enabled,
  enabled_by_profile_id,
  enabled_at,
  updated_at
) values (
  'qa',
  'xqtslzmtjcylfzmmzzmv',
  false,
  null,
  null,
  now()
)
on conflict (environment) do update
set
  project_ref = excluded.project_ref,
  writes_enabled = false,
  enabled_by_profile_id = null,
  enabled_at = null,
  updated_at = now();

select environment, project_ref, writes_enabled
from public.top_benefit_agent_runtime_guard;
