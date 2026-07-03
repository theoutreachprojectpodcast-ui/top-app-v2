# Admin upgrade readiness

Production admin console upgrade for The Outreach Project (`/admin`). Complements `docs/ADMIN_PRODUCTION_READINESS.md`.

## What changed

- **Layout / header:** Admin uses the same `topApp` shell as the public app (`topbarOcclusion`, immersive scroll gradient, `SubpageTopbarActions`). Content sits in `.shell.adminShellBody` with header-offset padding so nothing hides under the logo.
- **Admin / public toggle:** `AdminViewToggle` — **Public site** on admin routes; **Admin view** can be added on public routes via `AdminConsoleLink` (existing).
- **Information architecture:** Primary nav — Dashboard, Content, Sponsors, Community, Podcast, Members, Trusted, Media, Activity, Advanced. QA status moved to **Advanced** (`/admin/advanced`). `/admin/status` redirects to Advanced.
- **Dashboard:** `/admin` shows quick actions, queue counts, links to Content and Advanced. API: `GET /api/admin/dashboard`.
- **Content manager:** `/admin/content/create` — guided 4-step wizard (page → type → details → media). Publish routes to the correct admin panel.
- **Trusted resources:** `POST /api/admin/trusted` — manual create without EIN; UI on `/admin/trusted`.
- **Community moderation:** Pending scope includes `pending_review`, `submitted`, `under_review`, `in_review`. Submission metadata shown in admin list.
- **Podcast:** Applications tab remains default on `/admin/podcasts`.

## Admin routes

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard overview |
| `/admin/content` | Content hub + homepage settings |
| `/admin/content/create` | Guided create wizard |
| `/admin/sponsors` | Sponsor catalog |
| `/admin/community` | Moderation + staff posts |
| `/admin/podcasts` | Applications, episodes, sync |
| `/admin/users` | Members / accounts |
| `/admin/trusted` | Trusted resources (manual + edit) |
| `/admin/nonprofits` | EIN / directory enrichment |
| `/admin/media-library` | Reusable media |
| `/admin/images` | Page section images |
| `/admin/analytics` | Activity placeholder |
| `/admin/advanced` | QA status, diagnostics links |
| `/admin/status` | Redirect → `/admin/advanced` |

Secondary tools (linked from Advanced): settings, forms, applications, contact, billing, membership.

## Data models (existing tables)

- `sponsors_catalog`, `community_posts`, `trusted_resources`, `podcast_guest_applications`, `form_submissions`, `admin_settings`, page images, `top_profiles` (users).
- Community post `status` values used in app: `draft`, `submitted`, `pending_review`, `under_review`, `in_review`, `approved`, `rejected`, hidden/archived via admin actions.
- User submissions: `POST /api/community/posts` (member, WorkOS session) → moderation queue; public feed `GET` scope `public` only `approved`.

## Environment variables

Same as production admin (see `ADMIN_PRODUCTION_READINESS.md`):

- `PLATFORM_ADMIN_EMAILS`, WorkOS session cookies, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_ADMIN_URL` (optional admin host).

## How to create content

1. Sign in as platform admin → `/admin`.
2. **Create content** (dashboard or `/admin/content/create`).
3. Complete steps; **Publish** opens the target panel (sponsors, community, trusted, podcasts, images).
4. Or use section-specific panels directly (sponsors manual create, community staff post, trusted manual create).

## Moderation workflow

1. Members submit via Community page (`CommunitySubmissionForm` → API).
2. Posts land in **Moderation queue** on `/admin/community`.
3. Admin **Approve** → `approved` (public feed). **Reject** → `rejected` (not public).
4. Staff posts can publish immediately from admin create form.

## Podcast applications

- `/admin/podcasts` → **Applications** tab → `PodcastGuestApplicationsAdmin`.
- Status updates via podcast guest application APIs (Supabase + platform admin).

## Moved to Advanced

- QA status counters (`AdminStatusPanel`)
- Links to settings, forms, sponsorship applications, contact, billing, membership, page images, nonprofit EIN tools

## Incomplete / manual setup

- **Production SQL:** Run `page_content_blocks_admin_v10.sql` (migration #37) before using content blocks, media uploads, or wizard DB saves.
- **Site announcements module:** Still planned at `/admin/content/announcements`.
- **Public page wiring:** `page_content_blocks` are stored and editable in admin; public About/footer pages may still use static copy until wired to read blocks.
- **WorkOS Dashboard:** Redirect URIs and org invites (operator task).

## Verification

```bash
cd web && pnpm run lint && pnpm run build
```

Manual: desktop/tablet/mobile `/admin` — no overlap under header; scroll strengthens header gradient; moderation approve/deny; public community shows only approved posts.
