# Release protection — master index

Production protection and QA→production release workflow for The Outreach Project web and mobile apps.

**Generated:** 2026-06-15  
**Production:** `https://theoutreachproject.app`  
**QA:** `https://qa-the-outreach-project.vercel.app`

## Deliverables

| Report | File |
|--------|------|
| Environment audit (Phase 1) | [ENVIRONMENT_AUDIT.md](./ENVIRONMENT_AUDIT.md) |
| QA parity (Phase 2) | [QA_PARITY_REPORT.md](./QA_PARITY_REPORT.md) |
| Production protection (Phases 4–6) | [PRODUCTION_PROTECTION_REPORT.md](./PRODUCTION_PROTECTION_REPORT.md) |
| Environment config (Phase 3) | [ENVIRONMENT_CONFIG_REPORT.md](./ENVIRONMENT_CONFIG_REPORT.md) |
| Validation results (Phase 10) | [VALIDATION_REPORT.md](./VALIDATION_REPORT.md) |
| Release workflow (Phase 7) | [RELEASE_WORKFLOW.md](./RELEASE_WORKFLOW.md) |
| Rollback plan (Phase 6) | [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md) |
| Migration safety (Phase 9) | [MIGRATION_SAFETY.md](./MIGRATION_SAFETY.md) |

## Quick commands

```bash
# Local / CI build gates
pnpm --dir web run smoke:routes
pnpm --dir web run security:guards
pnpm --dir web run verify:auth-freeze
pnpm build

# Environment validation
pnpm --dir web run validate:env:prod    # production structure
pnpm --dir web run validate:env:qa      # QA structure
pnpm --dir web run validate:env:mobile  # TestFlight/Capacitor

# HTTP smoke (requires VERCEL_AUTOMATION_BYPASS_SECRET if Deployment Protection on)
pnpm --dir web run smoke:qa:http
pnpm --dir web run smoke:production:http

# Full pre-production gate (blocks deploy on failure)
pnpm --dir web run gate:production

# Mobile store prep
pnpm --dir web run mobile:prep:prod
pnpm --dir web run mobile:verify:prod
```

## Canonical code locations

| Concern | Location |
|---------|----------|
| URL / env SSOT | `web/src/lib/runtime/environmentConfig.js`, `web/src/lib/runtime/appUrls.js` |
| Env validation | `web/scripts/validate-environment.mjs` |
| Health routes | `web/src/app/api/health/*` |
| Admin publish guards | `web/src/lib/admin/contentPublishValidation.js` |
| CI / monitoring | `.github/workflows/ci.yml`, `.github/workflows/release-gates.yml`, `.github/workflows/production-monitor.yml` |
