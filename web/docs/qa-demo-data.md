# QA / demo data (v0.5)

## Flags

| Concern | Mechanism |
|--------|-----------|
| QA-like deployment | `isQaLikeDeployment()` in `web/src/lib/runtime/qaEnv.js` — `NEXT_PUBLIC_TOP_QA=1`, `NEXT_PUBLIC_VERCEL_ENV=preview`, `VERCEL_ENV=preview`, or `TOP_QA_SEED=1`. |
| Hide directory quick category row | Home `TopApp`: `DirectoryCategoryQuickPick` is **not** rendered when `isQaLikeDeployment()` is true (QA/preview only). |
| Hide seeded community posts | `shouldHideDemoCommunitySeeds()` — true on **production** builds when not QA-like. `GET /api/community/posts?scope=public` filters out `is_demo_seed` rows. |

## Database

Run `web/supabase/qa_repair_v05_podcast_sponsors_upcoming_community.sql` to add:

- `sponsors_catalog.sponsor_scope` (`app` \| `podcast`) + seven podcast sponsor rows.
- `podcast_upcoming_guests` for admin-managed upcoming guests.
- `community_posts.is_demo_seed` (boolean, default false).

## Seeding demo community posts

Script: `web/scripts/seed-qa-community-demo.mjs`  
Command: `pnpm run seed:qa-community-demo`

**Required env**

- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `TOP_QA_COMMUNITY_AUTHOR_PROFILE_IDS` — comma-separated `torp_profiles.id` UUIDs (demo or test accounts)
- One of: `TOP_QA_SEED=1`, `NEXT_PUBLIC_TOP_QA=1`, `VERCEL_ENV=preview`, or local `ALLOW_QA_COMMUNITY_SEED=1`

The script inserts a few **approved** stories with `is_demo_seed: true`. Production traffic with `shouldHideDemoCommunitySeeds()` true will not return them in the public feed.

## How to verify

1. On preview / QA env: run seed → community feed shows demo posts.
2. On production: same rows remain in DB but **do not** appear in `scope=public` responses.
3. Home directory: quick category focus hidden only when QA-like.
