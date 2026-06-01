# Trusted Resources

## Source of truth

Trusted Resources are canonicalized in:

- `web/src/features/trusted-resources/trustedResourcesRegistry.js`

Production and local trusted cards are ordered and constrained to registry records via:

- `web/src/features/trusted-resources/api.js`
- `buildCanonicalOrderedTrustedRows(...)`

## Allowed trusted organizations

The registry and trusted API output are aligned to these organizations:

- Say When and Remember Him
- Backcountry Heroes
- Hero To The Line
- Heroes Journey Healing Foundation
- Freedom Alliance
- Southern Outdoor Dreams
- Frontline Healing Foundation
- Hometown Hero Outdoors

Other nonprofits can remain in the directory but do not appear on trusted routes unless added to the canonical registry.

## Aggregation pipeline

Trusted resources load in this order:

1. `GET /api/trusted/catalog` (service-role read path)
2. Supabase direct fallback (browser client) if needed
3. Canonical registry completion fallback if DB/API are partial

Directory/enrichment data joins are merged by EIN/host in:

- `web/src/features/trusted-resources/trustedDirectoryJoin.js`

## Card media behavior

Trusted cards prefer official/enriched header media. If missing, category-based fallback header images are applied in:

- `web/src/features/nonprofits/mappers/nonprofitCardMapper.js`

This prevents broken header placeholders and keeps cards visually consistent.
