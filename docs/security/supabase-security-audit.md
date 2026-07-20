# Supabase security audit — The Outreach Project Directory

**Project:** The Outreach Project Directory  
**Project ref:** `xbtfoundwmhrqrbcuqcw`  
**Audit date:** 2026-07-16  
**Codebase:** `top-app-v2` (production `main`)

## Executive finding

Supabase Security Advisor rule **`rls_disabled_in_public`** is active because multiple **public-schema heap tables** still have Row-Level Security disabled (or lack restrictive client deny policies). The production Next.js app mostly uses **`SUPABASE_SERVICE_ROLE_KEY`** on API routes (bypasses RLS), but the **publishable/anon Data API key can still reach those tables directly**.

### Highest-impact leak confirmed live

| Object | Anon SELECT | Anon write class | Sensitivity |
|--------|-------------|------------------|-------------|
| `top_app_saved_org_eins` | **83 rows** | REACHED (no effective RLS) | Private user favorites (user_id + EIN) |

This alone is enough to trigger the advisor and constitutes unauthorized read of member data.

## Live inventory method

1. Pulled production env names via `vercel env pull` (values not logged).
2. OpenAPI discovery with **service role** (`/rest/v1/` → 78 paths).
3. For each path: service-role HEAD count, anon HEAD count, anon INSERT `{}` classification:
   - `RLS_BLOCK` — RLS denied (good)
   - `REACHED` — request hit table constraints (RLS missing/permissive)
   - `INSERT_OK` — anon insert succeeded (critical)
4. Probed known app tables including Support→Pro migration tables.

Artifact: `web/scripts/tmp-rls-matrix2-out.json` (local probe output; do not commit secrets).

## Tables without effective client RLS (anon write REACHED or INSERT_OK)

These are the primary drivers of **`rls_disabled_in_public`** / exposure:

| Table | Anon SELECT | Write class | Intended access |
|-------|-------------|-------------|-----------------|
| `curated_orgs` | 40 | INSERT_OK | Server-only / lock down |
| `favorites` | 0 | INSERT_OK | Unused legacy — deny |
| `messages` | 0 | INSERT_OK | Unused legacy — deny |
| `threads` | 0 | INSERT_OK | Unused legacy — deny |
| `stg_us_vet_connect` | 0 | INSERT_OK | Staging — deny |
| `nonprofit_websites_stage` | 13702 | INSERT_OK | Staging — deny |
| `irs_veterans_orgs` | 0 | REACHED | ETL — deny |
| `nonprofit_audience_flags` | 0 | REACHED | ETL — deny |
| `nonprofit_audience_tags` | 16857 | REACHED | ETL — deny |
| `nonprofit_overrides` | 1 | REACHED | Ops — deny |
| `nonprofit_profiles` | 8 | REACHED | Ops — deny |
| `nonprofit_websites` | 8164 | REACHED | Enrichment — deny |
| `ntee_categories` | 26 | REACHED | Reference — deny (API) |
| `profiles` | 0 | REACHED | Legacy — deny |
| `veteran_org_seed` | 28 | REACHED | Seed — deny |
| **`top_app_saved_org_eins`** | **83** | **REACHED** | **API `/api/me/saved-orgs` + service role only** |

## Tables with RLS enabled (anon write blocked) but public SELECT policies

| Table | Anon SELECT | Notes |
|-------|-------------|-------|
| `nonprofits` | ~1.9M | Directory catalog; served via `/api/directory/*` with service role. Restrictive deny closes direct anon. |
| `sponsors_catalog` | 9 | Via `/api/sponsors/*` |
| `trusted_resources` | 1 | Via `/api/trusted/*` |
| `community_posts` | 13 of 26 | Via `/api/community/*` (published subset) |

## Views / materialized views

Anon could read large result sets through views (`vw_aud_*`, `vw_*_geo`, `nonprofits_with_*`, `trusted_resources_v`, `trusted_resources_mv`, search RPCs/views).  

Remediation:

- Set **`security_invoker = true`** on all public views so underlying table RLS applies.
- **REVOKE** `SELECT` from `anon` / `authenticated` / `public` on materialized views (RLS not supported on MVs).

## Objects already correctly locked (sample)

`top_profiles`, `top_oauth_mobile_handoffs`, `admin_*`, `billing_*`, `sponsor_applications`, `support_to_pro_migration_*`, community reaction/comment tables — anon SELECT 0 + RLS_BLOCK.

## Application authorization model (as implemented)

| Actor | Data path | DB role |
|-------|-----------|---------|
| Anonymous visitor | Next.js API routes | Service role on server |
| Authenticated member (WorkOS) | `/api/me/*`, membership, saved orgs | Service role after session auth |
| Admin / moderator | `/api/admin/*` + allowlists | Service role + server role checks |
| Stripe / WorkOS webhooks | Dedicated routes | Service role |
| Browser `getSupabaseClient()` | Fallback / demo paths | Publishable key — must be denied by RLS |

**Do not trust client-supplied role, membership, Stripe IDs, or admin flags.** Those columns live on `top_profiles` and are updated only by trusted server code / webhooks.

## Required migration

`web/supabase/supabase_security_advisor_rls_2026_07.sql`

- ENABLE + FORCE RLS on every public heap table  
- Restrictive deny policies for `anon` + `authenticated`  
- `security_invoker` on views  
- Revoke client grants on MVs  
- Install `public._top_rls_security_audit()`

## Verification commands

```bash
# Apply (needs SUPABASE_ACCESS_TOKEN or DATABASE_URL)
pnpm --dir web run apply:production:rls:apply

# Or paste SQL in dashboard:
# https://supabase.com/dashboard/project/xbtfoundwmhrqrbcuqcw/sql/new

# Probe
pnpm --dir web run security:rls:live
pnpm --dir web run verify:production-rls
pnpm --dir web run security:check
```

## Storage / keys / webhooks (summary)

| Area | Status |
|------|--------|
| Service role in `NEXT_PUBLIC_*` | Not present in production env names |
| Browser publishable key | Present (expected); must not unlock private tables |
| Stripe webhook | Signature verification in `api/billing/webhook` |
| WorkOS | Server cookie session; not Supabase Auth UID for app identity |
| Storage | Admin media via service role; continue monitoring `storage.objects` policies in dashboard |

## Residual risk until migration is applied

Until `supabase_security_advisor_rls_2026_07.sql` is executed on production, anon clients can still read/write the tables listed above. **Apply the migration before considering the advisor alert resolved.**
