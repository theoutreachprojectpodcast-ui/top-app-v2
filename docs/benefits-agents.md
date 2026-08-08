# TOP Benefits research agents and QA runbook

## Current state

- Working branch: `feature/top-benefits-v1`, based on the current GitHub `QA` branch.
- QA Supabase project: **The Outreach Project QA**, West US (Oregon).
- QA project ref: `xqtslzmtjcylfzmmzzmv`.
- Production project ref: `xbtfoundwmhrqrbcuqcw` — blocked by the application guard and never used for agent testing.
- The initial two Benefits are drafts. No migration or agent run can publish them.
- Agent/database writes are disabled until both the server environment and the database guard are explicitly enabled.

## Workflow

1. **Scout** searches for unusual, high-value leads.
2. **Verifier** independently checks current primary evidence, eligibility, geography, redemption, and limitations.
3. **Curator** converts supported evidence into TOP's structured record contract.
4. **Deterministic gate** enforces geography, source, value-claim, category-art, cadence, and duplicate rules.
5. **QA candidate inbox** receives only proposals that pass the gate.
6. **Jonathan reviews** each candidate: reject, request more research, or accept as an unpublished draft.
7. Accepting a draft creates a second pending publication review. It does not publish.

The model has web search and structured output. It has no database or publication tool. The server owns the only candidate-intake RPC. This follows OpenAI's code-first Agents SDK, structured-output, guardrail, and human-review guidance:

- https://developers.openai.com/api/docs/guides/agents
- https://developers.openai.com/api/docs/guides/agents/guardrails-approvals
- https://developers.openai.com/api/docs/guides/agent-builder-safety

## QA database installation order

Run these only in **The Outreach Project QA** SQL Editor, in order:

1. `web/supabase/top_v03_profiles.sql`
2. `web/supabase/top_qa_profiles.sql`
3. `web/supabase/top_qa_profiles_v07_onboarding_parity.sql`
4. `web/supabase/supabase_schema_repair_2026_06.sql`
5. `web/supabase/benefits_v01_schema.sql`
6. `web/supabase/benefits_v01_seed.sql`
7. `web/supabase/benefits_v02_agent_review.sql`
8. `web/supabase/benefits_qa_runtime_guard.sql`
9. `web/supabase/benefits_qa_verify.sql`

Expected verification:

- `top_profiles`, `top_qa_profiles`, Benefits tables, and agent guard all exist.
- Two Benefits exist, both `draft` + `in_review`.
- Two system review items are pending.
- Every Benefits table has RLS enabled and forced.
- Both guarded RPCs exist.
- Agent runtime guard shows project `xqtslzmtjcylfzmmzzmv` with `writes_enabled = false`.
- Published Benefit count is `0`.

## QA environment variables

Add these to the Vercel Preview/QA environment later. Never paste keys into chat.

```text
OPENAI_API_KEY=<private OpenAI platform key>
BENEFITS_AGENT_MODEL=gpt-5.6
BENEFITS_AGENT_ENV=qa
BENEFITS_AGENT_QA_PROJECT_REF=xqtslzmtjcylfzmmzzmv
BENEFITS_AGENT_PRODUCTION_PROJECT_REF=xbtfoundwmhrqrbcuqcw
BENEFITS_AGENT_WRITES_ENABLED=false
```

The QA deployment also needs the QA Supabase URL, anon key, and service-role key under the app's existing environment names. Do not reuse production Supabase keys.

## Activation sequence

1. Install and verify the schema with database writes disabled.
2. Connect the QA Vercel deployment to the QA Supabase project.
3. Add the OpenAI API key privately.
4. Run one narrow admin research request with **Save to QA inbox** off.
5. Review citations, wording, geography, value claims, and gate decisions.
6. If the dry run is clean, set `BENEFITS_AGENT_WRITES_ENABLED=true` in QA and redeploy.
7. In the QA database, set the runtime guard to enabled using an explicit admin-reviewed SQL update.
8. Run the same search with **Save to QA inbox** on.
9. Confirm proposals appear only in `/admin/benefits` and published count remains zero.

## Emergency stop

Either control fails closed by itself:

- Set `BENEFITS_AGENT_WRITES_ENABLED=false` and redeploy QA.
- Or run this in the QA SQL Editor:

```sql
update public.top_benefit_agent_runtime_guard
set writes_enabled = false, enabled_at = null, enabled_by_profile_id = null, updated_at = now()
where environment = 'qa' and project_ref = 'xqtslzmtjcylfzmmzzmv';
```

Research dry runs can still work after the stop; database candidate intake cannot.

