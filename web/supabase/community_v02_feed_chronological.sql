-- Community feed — chronological ordering for moderator onboarding posts.
-- Aligns published_at with seeded created_at so preloaded guides sort newest-first with member posts.

begin;

update public.community_posts
set
  published_at = created_at,
  reviewed_at = coalesce(reviewed_at, created_at),
  updated_at = now()
where author_id = 'company-top-app'
  and category = 'platform_guide'
  and deleted_at is null
  and (
    published_at is null
    or published_at = reviewed_at
    or published_at > created_at + interval '1 day'
  );

commit;
