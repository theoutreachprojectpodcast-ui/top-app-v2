# Sponsor Management

Admin sponsors are managed in `/admin/sponsors` and `/admin/applications`.

## Source of truth

- Table: `public.sponsors_catalog`
- Scope field: `sponsor_scope` (`app` or `podcast`)
- Application intake: `public.sponsor_applications`

## Public wiring

- Main sponsors page reads app sponsors (`sponsor_scope=app`).
- Podcast sponsor section reads podcast sponsors (`sponsor_scope=podcast`).
- Sponsor records are not duplicated across pages.

## Application conversion

`PATCH /api/admin/sponsor-applications` supports `action=convert_to_sponsor` to upsert into `sponsors_catalog`.
