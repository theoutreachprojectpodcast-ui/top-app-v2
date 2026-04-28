# Community — tORP v0.3 (data + moderation)

This note describes the first production-oriented community pass: Supabase-backed posts, moderation-first statuses, RLS, and trusted API routes. It stacks on WorkOS auth, `torp_profiles`, and member billing checks.

## Schema

Apply SQL in order after base community + profiles exist:

- `supabase/community.sql` — base `community_posts` (legacy `community_post_likes` table may still exist from older scripts; **likes in v0.3 use `community_post_reactions` via API**, not the legacy likes table).
- `supabase/community_v03_data_model.sql` — extends posts with `author_profile_id`, `visibility`, `moderation_notes`, `is_edited`, `deleted_at`, `published_at`, `post_type`, `photo_url`; normalizes statuses; adds `community_post_reactions` (like scaffold).

### `community_posts` (relevant fields)

| Area | Fields |
|------|--------|
| Identity | `author_profile_id` → `torp_profiles.id`, denormalized `author_id` (WorkOS), `author_name`, `author_avatar_url` |
| Content | `title`, `body`, optional `photo_url`, `link_url`, nonprofit fields, `category`, `post_type` |
| Moderation | `status`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `moderation_notes` |
| Lifecycle | `created_at`, `updated_at`, `published_at`, `deleted_at` (soft delete), `is_edited`, `visibility` |

### Status model (moderation-first)

- `draft` — not used heavily in v0.3 UI; reserved for future drafts.
- `pending_review` — default for new member submissions; hidden from public feed.
- `approved` — visible in public feed when `visibility` is `community` or `public` and `deleted_at` is null.
- `rejected` — author-visible in “My posts”; not in public feed.
- `hidden` — moderator action; not in public feed.

### Visibility

- `community` — normal member stories (default).
- `public` / `private` — allowed by constraint for future product use; public feed queries include `community` and `public`.

### Reactions

- Table: `community_post_reactions` (`post_id`, `profile_id`, `reaction_type` default `like`).
- **Client browsers do not get insert/update policies** on reactions or posts; likes and post writes go through **server routes** with the Supabase service role.

## RLS (`community_posts`)

Policies are defined in `community_v03_data_model.sql` (migrations, not ad-hoc console edits):

- **Anonymous + authenticated** may **SELECT** only rows that are **`approved`**, **`deleted_at` is null**, and **`visibility` in (`community`, `public`)**.
- **No** broad insert/update/delete policies for `anon` / `authenticated` on posts — prevents bypassing moderation from the client.

Trusted API handlers use `createSupabaseAdminClient()` after WorkOS session checks.

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/community/posts?scope=public` | Approved public feed; optional `viewer_has_liked` when signed in |
| GET | `/api/community/posts?scope=mine` | Current user’s posts (all statuses they own), requires profile |
| GET | `/api/community/posts?scope=pending` | `pending_review` queue; **moderators only** (server-side allow list) |
| POST | `/api/community/posts` | Create story; requires WorkOS user, `torp_profiles` row, **`membership_tier === 'member'`**; status `pending_review` |
| PATCH | `/api/community/posts/[id]` | `approve` \| `reject` \| `hide`; **moderators only** |
| POST | `/api/community/posts/[id]/like` | Toggle like; syncs `like_count` |

## Moderator configuration (server)

Set **server** env (not exposed to the browser):

- `COMMUNITY_MODERATOR_EMAILS` — comma-separated emails (matches WorkOS user email).
- `COMMUNITY_MODERATOR_WORKOS_USER_IDS` — comma-separated WorkOS user IDs.

Optional **client** mirrors exist for UI gating only (`NEXT_PUBLIC_COMMUNITY_MODERATOR_*`); **authorization for PATCH is enforced on the server**.

## What is live in the UI

- **Latest** tab: real approved feed from the API (falls back to local demo approvals only if the API returns nothing).
- **My posts** (signed-in WorkOS): all of the current user’s posts with moderation badges where appropriate.
- **Composer**: WorkOS path submits via POST; confirmation copy reflects review workflow.
- **Moderation panel** (moderators): cloud queue loaded via `fetchPendingFeedFromApi` (`scope=pending`); Approve/Reject call PATCH (with optional Supabase client fallback in `reviewSubmission` for local dev).
- **Member profile modal**: click an author name on a post to open a profile sheet. **Seed/demo members** resolve from `COMMUNITY_MEMBERS_SEED` by id; **real authors** use `torp_profiles.id` (`author_profile_id` on the post). Approved posts for that author load via the Supabase client using RLS-safe public read (`fetchApprovedPostsByMember` chooses `author_profile_id` vs `author_id` using `isAuthorProfileLookupKey`).

## Not in this pass (future)

- Full admin moderation dashboard (bulk actions, filters, audit log).
- Rich media pipeline / `community_post_media` table (schema can be added later).
- Comments thread model.
- Author editing of `pending_review` / `approved` posts (policy + UI TBD).

## How to test

1. Run migrations on your Supabase project (`community.sql` then `community_v03_data_model.sql`).
2. Ensure `web/.env.local` has Supabase URL/anon + **service role** key for admin client (see existing app patterns for `SUPABASE_SERVICE_ROLE_KEY` or project equivalent).
3. `pnpm dev` from repo root; open `http://localhost:3001/community`.
4. **Logged out**: see value prop + sign-in CTA; public feed shows approved posts only.
5. **Member user**: complete onboarding; ensure profile has `membership_tier` = `member`; submit a story (≥ 20 characters); expect “submitted for review” and row in DB with `pending_review`.
6. **Moderator**: set env emails/IDs; open moderation section; pending posts appear; Approve → post appears on Latest; Reject → visible in My posts with rejected state, not in public feed.
7. **Author profile**: on an approved post, click the underlined author name; for cloud posts you should see that member’s approved stories (and seed-demo members still show seeded favorites when applicable).
