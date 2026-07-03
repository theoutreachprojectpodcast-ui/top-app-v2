# Admin production readiness

Production-ready admin experience for The Outreach Project (TOP). Auth is **WorkOS** (session cookies) + **Supabase** (profiles, CMS tables, service-role admin APIs). There is no Clerk/Firebase auth in this stack.

## Quick access

| Environment | Public app | Admin console |
|-------------|------------|---------------|
| Local | `http://localhost:3000` | Same origin: `/admin` or set `NEXT_PUBLIC_ADMIN_HOST` |
| QA / Preview | `qa.theoutreachproject.app` (or preview URL) | `admin` subdomain when configured |
| Production | `theoutreachproject.app` | `https://admin.theoutreachproject.app` (recommended) |

Platform admins see an **Admin** button in the public app topbar (`AdminConsoleLink`). It links to `adminConsoleHref()` (admin host or `/admin` on localhost).

## How admin roles are assigned

Access is **platform admin**, not a generic “logged-in user” flag.

1. **Bootstrap emails** — addresses in `adminPolicy.js` defaults plus comma-separated `PLATFORM_ADMIN_EMAILS` (and `QA_PLATFORM_ADMIN_EMAILS` on QA). No DB change required.
2. **Manual grant** — after migration `admin_backend_v06_access_control.sql`:
   - Set `top_profiles.platform_role = 'admin'`
   - Set `admin_access_enabled = true`
   - Set `admin_access_granted_by` to the granting admin’s WorkOS user id (non-empty)

Server check: `isPlatformAdminServer()` in `web/src/lib/admin/platformAdminServer.js`.  
Client hint: `/api/me` → `entitlements.isPlatformAdmin` (must not be trusted for mutations).

**Not admin:** normal members, sponsors, or users with only `platform_role = 'admin'` but missing `admin_access_granted_by` / disabled flag.

### Grant SQL (production)

Run after `admin_backend_v06_access_control.sql`:

```sql
update public.top_profiles
set
  platform_role = 'admin',
  admin_access_enabled = true,
  admin_access_granted_by = '<granting-admin-workos-user-id>',
  updated_at = now()
where workos_user_id = '<new-admin-workos-user-id>';
```

Replace IDs with real WorkOS user ids from `/admin/users` or Supabase.

## Admin routes (UI)

All under `web/src/app/admin/` — protected by `admin/layout.js` → `resolveAdminGateSession()` (redirects non-admins).

| Route | Purpose |
|-------|---------|
| `/admin` | Overview + link to content hub |
| `/admin/content` | Content hub: homepage carousel settings, links to sponsors/community/trusted/images |
| `/admin/sponsors` | Sponsors catalog CRUD (create, edit, reorder, featured/homepage flags) |
| `/admin/community` | Moderation queue + **staff posts** (create/publish/unpublish) |
| `/admin/trusted` | Trusted resources |
| `/admin/images` | Page/section images (`page_images`) |
| `/admin/membership` | Membership stats |
| `/admin/users` | User search and role tooling |
| … | Podcasts, billing, applications, settings, etc. (existing) |

## Admin API routes (mutations)

All require `requirePlatformAdminRouteContext` (GET) or `requirePlatformAdminMutation` (POST/PATCH/DELETE). Normal users receive **401/403**.

| API | Methods | Purpose |
|-----|---------|---------|
| `/api/admin/sponsors` | GET, **POST** | List / create `sponsors_catalog` rows |
| `/api/admin/sponsors/[slug]` | PATCH | Update sponsor fields, status, order, featured |
| `/api/admin/settings/homepage` | GET, PATCH | Carousel limit/interval + preview |
| `/api/admin/community/posts` | GET, **POST** | List (scopes) / create staff posts |
| `/api/admin/community/posts/[id]` | PATCH | Publish, unpublish, hide, delete |
| `/api/sponsors/homepage-featured` | GET | **Public** — homepage carousel data |
| `/api/sponsors/catalog` | GET | **Public** — sponsors page (existing) |

Audit: major writes call `writeAdminAuditLog` where implemented (sponsors create, community create, etc.).

## Content flow: sponsors → homepage & sponsors page

**Single source of truth:** `public.sponsors_catalog` (see `admin_cms_v05_all_in_one.sql`, `sponsor_v08_display_groups.sql`, and follow-on sponsor migrations).

### Homepage Featured Sponsors carousel

Public home loads `/api/sponsors/homepage-featured`, which:

1. Reads optional `admin_settings` key `homepage.sponsors` (carousel item count, interval ms).
2. Queries `sponsors_catalog` where:
   - `mission_partner = true`
   - `featured = true`
   - `is_active = true`
   - `sponsor_scope` ≠ `podcast`
   - `sponsor_status` not in `draft`, `hidden`, `archived`, `inactive`
3. Orders by `display_order`, then `name`.
4. **Fallback:** seeded `FEATURED_SPONSORS` ids only when DB empty or Supabase unavailable (local/demo safety).

Admins set homepage visibility in **Sponsors** panel:

- Category/group: Mission Partner (`mission_partner` / `sponsor_display_group`)
- **Featured on homepage** (`featured`)
- **Active** / **status** (`is_active`, `sponsor_status`)
- **Display order** (Order − / Order + or numeric field)

Preview: **Content hub** → Homepage featured sponsors panel (`AdminHomepagePanel`) calls `/api/admin/settings/homepage` preview.

### Sponsors page

Continues to use `/api/sponsors/catalog` (and existing client filters). Same table; do not maintain a separate homepage list in code.

Categories (display groups) include Mission Partner, Impact Sponsor, Community Sponsor, Supporting Sponsor — align `sponsor_display_group` / `sponsor_type` when editing.

## Community posts & moderation

**Table:** `community_posts` (existing community schema).

**Member flow:** Pro members submit stories via POST `/api/community/posts` → `status = pending_review`. They do not appear on the public feed until approved.

**Admin UI:** `/admin/community` → **Community posts & moderation** (`AdminCommunityPostsSection`).

| Action | API | UI |
|--------|-----|-----|
| List pending / published / drafts / rejected / bookmarked | GET `/api/admin/community/posts?scope=` | Scope tabs (default: **Pending review**) |
| **Approve** (publish to feed) | PATCH `[id]` `{ action: "approve" }` | Approve button |
| **Reject** | PATCH `[id]` `{ action: "reject", rejectionReason }` | Reject button (prompt for reason) |
| Edit before/after approval | PATCH `[id]` `{ action: "edit", title, body }` | Edit |
| Hide / delete / bookmark | PATCH `[id]` | Hide, Delete, Bookmark |
| Staff create draft or publish | POST `/api/admin/community/posts` | New staff post (optional publish immediately) |

Moderators (non–platform-admin) can also approve/reject via PATCH `/api/community/posts/[id]` when listed in `COMMUNITY_MODERATOR_EMAILS` or `platform_role` moderator/admin. **Platform admins** are always treated as moderators (`isCommunityModeratorServer` includes `isPlatformAdminServer`).

On approve, authors receive an in-app notification (`community_post_approved`). Audit log entries are written for admin API actions.

Published public feed uses `status = 'approved'` only. Drafts, `pending_review`, `rejected`, and `hidden` posts are not shown to normal users.

**Post types supported in admin UI (basic):** `admin_update`, `share_story`, `step_by_step`, `carousel`, `video_link`. Rich carousel JSON and scheduled publish are **future enhancements** — use `photo_url` / `link_url` text fields for now.

## Data model summary

| Entity | Table / key | Notes |
|--------|-------------|-------|
| Sponsors | `sponsors_catalog` | slug PK; featured, mission_partner, display_order, sponsor_status, logos URLs |
| Homepage carousel settings | `admin_settings.setting_key = 'homepage.sponsors'` | JSON: `carouselLimit`, `carouselIntervalMs` |
| Community posts | `community_posts` | status, post_type, body, media URL fields, published_at |
| Admin settings (other) | `admin_settings` | contact, etc. |
| Platform admin grant | `top_profiles` | platform_role, admin_access_* columns |
| Audit | `admin_audit_logs` | optional actions logged |

No new tables were required for this pass; uses existing CMS migrations.

## Media / storage

| Asset | Current approach | Production setup |
|-------|------------------|------------------|
| Sponsor logos / backgrounds | **URL fields** on `sponsors_catalog` (`logo_url`, `background_image_url`) | Paste CDN/Supabase public URLs, or use **Admin → Images** / logo enrichment tools |
| Community images | `photo_url` on post (URL string, size-capped) | Same — wire upload UI to storage in a follow-up |
| Profile avatars | `/api/me/avatar` (existing pattern) | Reuse for future sponsor upload helper |
| Page images | `/api/admin/page-images` | `page_images` table |

**Do not** store production images as base64 in Postgres.  
**Recommended:** Supabase Storage bucket + signed upload route (not fully wired in sponsor/community forms yet).

Env for Supabase (all environments):

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; required for admin APIs)
- WorkOS: `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, cookie domain vars per deploy docs

## Environment variables (admin-specific)

| Variable | Purpose |
|----------|---------|
| `PLATFORM_ADMIN_EMAILS` | Extra bootstrap admin emails (comma-separated) |
| `COMMUNITY_MODERATOR_EMAILS` | Emails allowed to moderate via `/api/community/posts` (optional; platform admins always can) |
| `COMMUNITY_MODERATOR_WORKOS_USER_IDS` | WorkOS user ids for moderators (optional) |
| `QA_PLATFORM_ADMIN_EMAILS` | QA-only bootstrap emails |
| `ENABLE_ADMIN_EMAIL_LOGIN` | Dev/QA magic-link admin login (off in production) |
| `NEXT_PUBLIC_ENABLE_DEMO_FLOWS` | Must be `false` in production |
| `WORKOS_COOKIE_DOMAIN` | Cross-subdomain session (public + admin host) |
| `WORKOS_ORGANIZATION_ID` | Launch org; users are added via API after sign-in/sign-up (do not pin org on hosted sign-in) |
| `WORKOS_PIN_ORG_ON_SIGNIN` | Leave **unset** (or `0`). Set `1` only if every user is pre-invited in WorkOS |
| `NEXT_PUBLIC_ADMIN_HOST` | Optional override for admin console URL |

See also `docs/mvp-production-launch.md` and `docs/production-supabase-migration-order.md`.

## Security checklist

- [x] Admin UI layout gate (`resolveAdminGateSession`)
- [x] All `/api/admin/*` mutations check platform admin server-side
- [x] Public APIs only return published/active sponsor rows
- [x] Homepage featured filter enforces Mission Partner + featured
- [x] Input length limits on community create
- [ ] Dedicated file-upload validation (type/size) — **pending** upload routes for sponsors/community
- [ ] HTML sanitization for rich bodies — bodies are plain text today; sanitize before rich HTML editor

## Incomplete / manual production setup

1. **Assign admin** — grant email or SQL for each operator.
2. **WorkOS cookie domain** — verify admin subdomain shares session with public app.
3. **Migrate seed sponsors** — ensure `sponsors_catalog` populated in prod (run sponsor SQL seeds or admin UI); homepage fallback hides empty DB.
4. **Storage bucket** — create Supabase Storage bucket + policies if moving off external logo URLs.
5. **Scheduled posts** — not implemented.
6. **Full carousel post editor** — post_type `carousel` is label-only; multi-image JSON deferred.
7. **Rich text** — community body is plain text; add sanitizer if enabling HTML.

## Local / QA / production behavior

| | Local | QA | Production |
|---|-------|-----|------------|
| Data | Supabase local or remote; seed fallback on empty | Persistent QA Supabase | Production Supabase |
| Admin login | `ENABLE_ADMIN_EMAIL_LOGIN` optional | Same + `QA_PLATFORM_ADMIN_EMAILS` | WorkOS only (no email magic link) |
| Demo flows | `NEXT_PUBLIC_ENABLE_DEMO_FLOWS=true` ok | Usually false | **Must be false** |
| Homepage sponsors | DB if configured else seed fallback | DB | DB only (fallback only if empty/error) |

## Verification

```bash
cd web
pnpm run lint
pnpm run build
pnpm run smoke:routes   # if configured
```

Manual smoke:

1. Sign in as platform admin → **Admin** visible in topbar.
2. Open `/admin/content` → adjust carousel limit → save → preview list updates.
3. `/admin/sponsors` → create Mission Partner, set **featured**, publish/active → home carousel shows it.
4. `/admin/community` → create post → publish → visible on public community feed.
5. Sign in as normal user → no Admin link; `/admin` redirects/forbidden.

## Related files (implementation)

- `web/src/lib/sponsors/homepageFeaturedSponsors.js`
- `web/src/lib/admin/homepageSettings.js`
- `web/src/components/app/HomeSponsorBannerPlacements.jsx`
- `web/src/components/admin/AdminConsoleLink.jsx`
- `web/src/features/admin/AdminSponsorsPanel.jsx`
- `web/src/features/admin/AdminHomepagePanel.jsx`
- `web/src/features/admin/AdminCommunityPostsSection.jsx`
