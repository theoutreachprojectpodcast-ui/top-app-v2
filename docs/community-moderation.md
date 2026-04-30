# Community Moderation

Community moderation lives in `/admin/community`.

## Workflow

- Admins and moderators review pending posts.
- Admin actions include approve, reject, hide, bookmark, edit.
- Statuses are persisted in `public.community_posts`.

## Public rules

- Public community feed only returns approved/public content.
- QA demo content is still environment-gated via `is_demo_seed`.
