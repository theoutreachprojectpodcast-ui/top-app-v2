# Admin CMS (v0.6)

## Scope

- Admin modules cover sponsors (scoped), trusted resources, community moderation, users, podcast episodes and featured guests, applications, invoices, page images, and related settings.
- Routes live under **`/admin`** with **role-gated** API handlers in `web/src/app/api/admin/**`.

## Persistence

- All create/update/delete actions target Supabase through service-role or RLS-safe patterns documented in the v0.5 admin pass.

## References

- [admin-cms.md](./admin-cms.md) — module overview and conventions.
- [sponsor-management.md](./sponsor-management.md)
- [trusted-resources-management.md](./trusted-resources-management.md)
- [community-moderation.md](./community-moderation.md)
- [podcast-admin.md](./podcast-admin.md)
