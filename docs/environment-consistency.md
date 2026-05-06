# Environment Consistency (Localhost, QA, Production)

## Runtime routes audited

- `/api/sponsors/catalog`
- `/api/trusted/catalog`
- `/api/admin/sponsors`
- `/api/admin/sponsors/[slug]`
- `/sponsors`
- `/trusted`
- `/podcasts`

## Key consistency rules

1. Sponsor pages are data-driven from `sponsors_catalog` classification fields.
2. Trusted resources use canonical registry ordering and fallback completion.
3. Podcast sponsors are strictly scoped by `sponsor_scope` / `podcast_sponsor`.
4. Broken trusted header placeholders are avoided with category media fallbacks.

## Environment requirements

Set and verify:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or service-role path where applicable)
- server-side key for admin/catalog service reads

## SQL/data scripts for rollout

- Rope card finalization:
  - `web/supabase/qa_update_rope_sponsor_card_v06.sql`
- Iron Soldiers scope correction:
  - `web/supabase/qa_sponsor_iron_soldiers_podcast_scope.sql`

## Validation checklist

### Sponsors

- Main `/sponsors` shows active app foundational sponsors only.
- Iron Soldiers does not render on `/sponsors`.
- Rope card has website + socials + proper CTA.

### Trusted

- `/trusted` renders canonical trusted list.
- Trusted cards do not appear empty due to missing DB joins.
- Card logo/header media either official or valid fallback.

### Podcast

- `/podcasts` shows dedicated podcast sponsor section.
- Podcast sponsor card grid is responsive (2-col / 1-col).

## Build commands

From repo root:

- `pnpm install`
- `pnpm lint`
- `pnpm build`
