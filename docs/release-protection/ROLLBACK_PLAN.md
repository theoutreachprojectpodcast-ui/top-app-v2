# Phase 6 — Rollback plan

**Date:** 2026-06-15  
**Production URL:** `https://theoutreachproject.app`

## Rollback triggers

Rollback immediately when any of these occur **after a production deploy**:

- Homepage fails (`/` not 200)
- Sign-in or sign-up pages fail
- Auth callback fails (`/callback`, `/api/health/auth` not ok)
- `/api/health` aggregate not ok
- `/api/health/db` not ok
- Mobile app cannot connect (Capacitor health fails)
- 500/502 error rate increases (Vercel logs / smoke)

## Identify last known good deployment

1. **Vercel Dashboard** → Project `the-outreach-project-app` → **Deployments**
2. Find last deployment with:
   - Status **Ready**
   - Git commit that passed `smoke:production:http`
   - Timestamp before the bad deploy
3. Note deployment ID and commit SHA (e.g. `63a0088` from launch checklist)

## Rollback command (Vercel)

### Dashboard (recommended)

1. Deployments → select last good deployment → **⋯** → **Promote to Production**
2. Confirm — instant traffic switch; env vars unchanged

### CLI

```bash
cd /path/to/top-app-v2
vercel rollback
# or promote specific deployment:
vercel promote <deployment-url> --scope the-outreach-project
```

Requires Vercel CLI auth and team scope `the-outreach-project`.

## Preserve environment variables

- Rollback **does not** revert env var changes made after the bad deploy.
- If the incident was caused by env changes:
  1. Vercel → Settings → Environment Variables → Production
  2. Restore from backup notes in `docs/vercel-production-env.template`
  3. Redeploy after fixing vars

## Database rollback

- App rollback does **not** reverse Supabase migrations.
- If a migration caused the incident:
  1. Stop further deploys
  2. Apply documented rollback SQL from migration notes
  3. Or restore Supabase point-in-time backup (Production project)
- See [MIGRATION_SAFETY.md](./MIGRATION_SAFETY.md)

## Content rollback

- Admin audit log: `admin_audit_logs` table
- Revert bad `page_content_blocks` row via admin PATCH to `draft` or restore from QA-tested copy
- Sponsor/catalog changes: use admin UI or SQL backup

## Post-rollback verification

```bash
pnpm --dir web run smoke:production:http
curl -s https://theoutreachproject.app/api/health | jq .ok
```

## Communication

1. Log incident in `docs/PRODUCTION_STABILITY_INCIDENT.md`
2. Notify team / users if outage > 5 minutes
3. Root-cause before re-deploying failed commit

## Prevention

- Never skip `gate:production` before merge to `main`
- Never apply production migrations without QA apply + backup
- Keep `VERCEL_AUTOMATION_BYPASS_SECRET` in CI so post-deploy smoke always runs
