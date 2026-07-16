# Backend security completion report

**Project:** The Outreach Project Directory (`xbtfoundwmhrqrbcuqcw`)  
**Date:** 2026-07-16  
**Status:** Remediation packaged in repo; **production SQL apply pending credentials**

---

## 1. Exact tables causing `rls_disabled_in_public`

Live PostgREST probes (publishable/anon key) showed **no effective RLS** (anon INSERT reached constraints or succeeded) on:

`curated_orgs`, `favorites`, `messages`, `threads`, `stg_us_vet_connect`, `nonprofit_websites_stage`, `irs_veterans_orgs`, `nonprofit_audience_flags`, `nonprofit_audience_tags`, `nonprofit_overrides`, `nonprofit_profiles`, `nonprofit_websites`, `ntee_categories`, `profiles`, `veteran_org_seed`, **`top_app_saved_org_eins`**

Any one of these heap tables with `relrowsecurity = false` (or missing restrictive deny) trips Advisor rule **0013 / rls_disabled_in_public**.

## 2. Root cause

1. Legacy ETL/staging/directory tables were created in `public` without RLS (or with RLS never forced).
2. Prior hardening SQL (`supabase_public_rls_hardening_nondestructive_2026_06.sql`) exists in the repo but **was never applied** to production (audit RPC `_top_rls_security_audit` missing; anon still reads private favorites).
3. App correctly uses **service role** on server routes, which masked the issue in product UX while the Data API remained open.

## 3. Affected database objects (summary)

- **78** OpenAPI-exposed public paths (tables/views/MVs/functions).
- **16+** heap tables with ineffective client RLS (section 1).
- **Views** `vw_*`, `nonprofits_with_*`, `trusted_resources_v`, search views — readable via security-definer-style defaults.
- **MV** `trusted_resources_mv` — client SELECT granted (MVs cannot use RLS).

Full matrix: see `docs/security/supabase-security-audit.md`.

## 4. RLS policies added / changed

Migration: `web/supabase/supabase_security_advisor_rls_2026_07.sql`

For **every** `public` heap table:

- `ALTER TABLE … ENABLE ROW LEVEL SECURITY`
- `ALTER TABLE … FORCE ROW LEVEL SECURITY`
- Restrictive policy `{table}_block_anon` — `FOR ALL TO anon USING (false) WITH CHECK (false)` (if missing)
- Restrictive policy `{table}_block_authenticated` — same for `authenticated`

No broad `USING (true)` policies added.

## 5. Grants changed

- Materialized views: `REVOKE ALL … FROM anon, authenticated, public`; `GRANT SELECT … TO service_role`
- Audit helpers: `REVOKE ALL` from `public/anon/authenticated`; `GRANT EXECUTE` to `service_role` only

## 6. Views / functions / RPCs / triggers / storage

| Area | Action |
|------|--------|
| Views | `ALTER VIEW … SET (security_invoker = true)` for all public views |
| RPC `_top_rls_security_audit` | Created/replaced for CI verification |
| RPC `_top_ensure_client_deny_rls` | Created/replaced (security definer, fixed `search_path`) |
| Triggers | No privilege-escalation changes required for this advisor fix |
| Storage | Not the source of this advisor alert; service-role uploads remain the app path. Dashboard `storage.objects` policies should be re-checked after RLS apply. |

## 7. Version-controlled SQL

- `web/supabase/supabase_security_advisor_rls_2026_07.sql` ← **apply this**
- Prior: `supabase_public_rls_hardening_nondestructive_2026_06.sql`, `supabase_linter_security_fix_2026_06.sql`

## 8. Authorization matrix (post-apply)

| Role | SELECT private | SELECT catalogs via Data API | INSERT/UPDATE/DELETE |
|------|----------------|------------------------------|---------------------|
| `anon` | Deny | Deny (use Next.js APIs) | Deny |
| `authenticated` (Supabase JWT) | Deny | Deny | Deny |
| `service_role` | Allow (server only) | Allow | Allow |
| App member (WorkOS) | Via `/api/me/*` after session | Via `/api/*` | Via authenticated API routes |
| Admin/moderator | Via `/api/admin/*` + allowlists | Same | Same |

## 9. Automated tests / probes

- `web/scripts/security-rls-live-probe.mjs` — fails on anon leaks / missing RLS
- `web/scripts/verify-production-rls.mjs` — sensitive table anon probe + audit RPC
- `web/scripts/security-check.mjs` — aggregated gate
- Static: `security:guards`, `verify:auth-freeze`, `verify:security`, `security:audit:ci`

## 10. CI security gate

`.github/workflows/ci.yml` security job:

- Existing guards + audit + posture
- **Live RLS probe** when `SUPABASE_SERVICE_ROLE_KEY` + URL secrets are configured

Local: `pnpm --dir web run security:check`

## 11–13. Preview / production deploy status

| Step | Status |
|------|--------|
| Repo migration + tooling | Done |
| Apply SQL to production DB | **Blocked** — no `SUPABASE_ACCESS_TOKEN` / `DATABASE_URL` / DB password in Vercel or local env |
| Post-apply live probe | Pending apply |
| Vercel redeploy | Not required for SQL-only change (RLS is DB-side); optional after verify |
| Production regression | Pending apply + smoke |

### To finish production remediation (one credential required)

```bash
# Option A — Management API token (https://supabase.com/dashboard/account/tokens)
set SUPABASE_ACCESS_TOKEN=sbp_...
pnpm --dir web run apply:production:rls:apply
pnpm --dir web run security:rls:live

# Option B — Database URL from Supabase → Settings → Database
set DATABASE_URL=postgresql://postgres....
pnpm --dir web run apply:production:rls:apply

# Option C — Paste file contents into SQL editor
# https://supabase.com/dashboard/project/xbtfoundwmhrqrbcuqcw/sql/new
# File: web/supabase/supabase_security_advisor_rls_2026_07.sql
```

Then refresh **Database → Security Advisor** and confirm zero critical/error findings for `rls_disabled_in_public`.

## 14. Security Advisor before / after

| When | Result |
|------|--------|
| Before | Critical: Table publicly accessible / `rls_disabled_in_public` (confirmed via live anon leaks) |
| After apply | Expected: FAIL rows from `_top_rls_security_audit()` = 0; advisor clear for this rule |

## 15. Credentials to rotate (no values printed)

- Consider rotating the **publishable/anon** key after lockdown if it was widely exposed in clients (optional; RLS is the primary control).
- Ensure **service role** never appears in `NEXT_PUBLIC_*` (verified absent from Vercel production env names).
- Add `SUPABASE_ACCESS_TOKEN` only to local/CI secrets for apply — never to browser env.

## 16. Unresolved findings

1. **Production SQL not yet applied** — requires access token or DB URL (see §11).
2. GitHub Actions live probe needs repo secrets (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) to enforce in CI.
3. Full pgTAP suite / storage policy dump / Advisor API export not automated in this pass (live PostgREST probes cover the advisor table exposure class).

## 17. Rollback

```sql
-- Emergency only: remove restrictive denies for a single table (re-opens risk)
-- drop policy if exists <table>_block_anon on public.<table>;
-- drop policy if exists <table>_block_authenticated on public.<table>;
-- alter table public.<table> disable row level security;
```

Prefer restoring from a pre-change backup / PITR rather than selectively disabling RLS. App server routes continue to work with service role if policies remain deny-for-clients.

Redeploy previous Vercel deployment only if an app regression appears (SQL-only change should not require it).

## 18. Remaining technical debt

- Move ETL/staging tables (`*_stage`, `stg_*`) out of `public` into a non-exposed schema.
- Replace remaining browser `getSupabaseClient().from(...)` fallbacks with API-only paths.
- Add storage.objects policy snapshot to CI.
- Wire Advisor API check into `security:check` when management token available.

## 19. Reproduce validation

```bash
npx vercel env pull web/.env.vercel.production --environment production --yes
pnpm --dir web run security:rls:live
pnpm --dir web run verify:production-rls
pnpm --dir web run security:check
# After apply:
# select * from public._top_rls_security_audit() where status = 'FAIL';
```

## 20. Production-safe confirmation

**Not yet.** Backend is **not** fully safe until `supabase_security_advisor_rls_2026_07.sql` is applied and `security:rls:live` exits 0 against production.  

Repo-side controls, migration, CI hooks, and documentation are ready; **provide `SUPABASE_ACCESS_TOKEN` or `DATABASE_URL` (or paste the SQL in the dashboard) to complete.**
