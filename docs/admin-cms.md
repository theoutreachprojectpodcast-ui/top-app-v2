# Admin CMS (v0.5)

The admin portal is available at `/admin` and is protected by WorkOS session + platform admin checks.

## Access control

- Server page guard: `web/src/app/admin/layout.js`
- API guard: `web/src/lib/admin/adminRouteContext.js`
- Admin role logic: `web/src/lib/admin/platformAdminServer.js`

Only platform admins can access `/admin` and `/api/admin/*`.

## Sections

- Overview: `/admin`
- QA Status: `/admin/status`
- Sponsors: `/admin/sponsors`
- Sponsorship applications: `/admin/applications`
- Trusted resources: `/admin/trusted`
- Community moderation: `/admin/community`
- Podcast content/apps: `/admin/podcasts`
- Contact settings/submissions: `/admin/contact`
- Page image manager: `/admin/images`
- Billing + invoice send: `/admin/billing`
- Users: `/admin/users`

## Schema patch

Run `web/supabase/admin_cms_v05_all_in_one.sql` after existing v0.5 SQL patches.

It adds:

- `admin_settings`
- `page_images`
- `form_submissions`
- `billing_records`
- additive columns for sponsor/trusted/community/podcast workflows
