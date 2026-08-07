# Saved organizations architecture (canonical)

## Model (Option B — typed saved-entity relationship)

| Field | Source of truth |
|---|---|
| User id | WorkOS user id (`top_app_saved_org_eins.user_id` = `top_profiles.workos_user_id`) |
| Organization id (directory / EIN-backed trusted) | 9-digit IRS EIN |
| Organization id (slug-only trusted) | `trusted:{slug}` in `top_profiles.metadata.favoriteEntityKeys` |
| Display name | Resolved live from directory / enrichment / profiles / trusted catalog / registry — never stored as the relationship key |

## Dual stores

1. **`top_app_saved_org_eins`** — primary list for Profile → Saved Organizations
2. **`favoriteEntityKeys`** — only when no EIN can be resolved; server promotes slug→EIN when registry has an EIN

## Shared service

`web/src/lib/savedOrganizations/savedOrganizationsService.js` is the only write path for:

- save / unsave by EIN (idempotent)
- replace EIN list
- replace trusted entity keys (with EIN promotion)
- existence checks aligned with Directory + Trusted UI sources (incl. curated registry)

API routes:

- `POST/PUT/GET /api/me/saved-orgs`
- `GET /api/me/saved-orgs/cards`
- `PUT/GET /api/me/favorites`

## Entitlement

`canSaveOrganizations` = active Pro/sponsor/staff **or** active legacy Support (`requireSupportOrPro`).

Other product surfaces (directory browse gate, community, etc.) remain Pro-only.

## Ops

- Audit (read-only): `pnpm --dir web run audit:saved-orgs`
- Promote slug keys → EIN: `node --import ./scripts/register-at-alias.mjs scripts/repair-trusted-favorite-keys.mjs [--apply]`
- SQL repair: `web/supabase/saved_orgs_incident_repair_2026_07.sql`
- CI: `test-saved-organizations-service.mjs` runs in `prebuild`
