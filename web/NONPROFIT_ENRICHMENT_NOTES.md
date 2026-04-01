# Nonprofit Logo + Verification Enrichment Notes

## Tables Audited

- `nonprofits_search_app_v1` (directory card source)
- `nonprofit_profiles` (curated/trusted profile records)
- `nonprofits` (organization enrichment used by trusted feed)

## Fields Used Today

Directory mapping now reads these optional fields when available:

- `logo_url`
- `verification_tier`
- `verification_source`

Trusted mapping now reads optional fields from profile/org:

- `logo_url`
- `verification_tier`
- `verification_source`

## Recommended Schema Additions (if not present)

For `nonprofits_search_app_v1` and/or `nonprofits`:

- `logo_url` text
- `verification_tier` text (`standard` | `verified` | `featured`)
- `verification_source` text

## Verification Tier Derivation Used In UI

1. Explicit tier field when present (`verification_tier`)
2. Trusted/curated feed (`nonprofit_profiles.is_trusted = true`) => `featured`
3. Trusted boolean present on directory rows => `verified`
4. Else => `standard`

## Enrichment Script

- Script: `scripts/enrich-nonprofit-logos.js`
- Strategy:
  1. derive domain from `website`
  2. test safe domain-logo sources (Clearbit, Google favicon, DuckDuckGo icon, site favicon)
  3. validate image response before persisting
  4. update `logo_url` only after validation
  5. supports reruns via `--force`

