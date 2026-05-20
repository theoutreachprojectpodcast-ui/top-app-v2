-- tOP v0.7 QA content seed: Outreach Project moderator onboarding guides (Josh & Hodge).
-- Safe to re-run. Uses fixed ids + upsert; visible in public/community feed.
-- Avatar: /community/outreach-project-moderator.png (logo — profile only, not post media).

begin;

alter table if exists public.community_posts
  add column if not exists is_demo_seed boolean not null default false;

insert into public.community_posts (
  id,
  author_profile_id,
  author_id,
  author_name,
  author_avatar_url,
  title,
  body,
  category,
  post_type,
  show_author_name,
  link_url,
  photo_url,
  status,
  visibility,
  like_count,
  share_count,
  reviewed_by,
  reviewed_at,
  published_at,
  is_edited,
  is_demo_seed,
  updated_at,
  created_at
)
values
(
  'd2000000-0000-4000-8000-000000000009',
  null,
  'company-top-app',
  'Josh & Hodge',
  '/community/outreach-project-moderator.png',
  'Getting started with The Outreach Project',
  'Welcome to a mission-built platform for veterans, first responders, families, supporters, and nonprofit partners.

Step 1 — Create your account and sign in securely.
Step 2 — Complete your profile so resources and community features personalize to you.
Step 3 — Explore Trusted Resources and the nonprofit directory.
Step 4 — Join Community conversations and follow podcast and sponsor updates.

Why this matters: The Outreach Project helps you discover trusted organizations, build community, and access meaningful resources—without wading through random search results.',
  'platform_guide',
  'platform_guide',
  true,
  'cta:/api/auth/workos/signup?returnTo=/community|Complete your profile',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&w=1200&h=675&fit=crop&q=80',
  'approved',
  'community',
  48,
  0,
  'founder-onboarding-v08',
  now(),
  now(),
  false,
  false,
  now(),
  '2026-05-19T16:52:25.420Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000002',
  null,
  'company-top-app',
  'Josh',
  '/community/outreach-project-moderator.png',
  'How to create your account',
  'Your account unlocks the directory, saved organizations, community participation, and member-only tools.

Step 1 — From the Community page or home screen, choose Create account.
Step 2 — Sign in with WorkOS using the email you want tied to your profile.
Step 3 — Confirm you land back on The Outreach Project—your session should stay signed in on trusted devices when you choose remember device.
Step 4 — Visit Profile to confirm your name and basics loaded correctly.

Why this matters: A verified account keeps your saves, likes, and story submissions tied to you—so support pathways stay consistent when you return.',
  'platform_guide',
  'platform_guide',
  true,
  'cta:/api/auth/workos/signup?returnTo=/community|Create your account',
  'https://images.unsplash.com/photo-1516321318523-f6f85c09ae39?auto=format&w=1200&h=675&fit=crop&q=80',
  'approved',
  'community',
  31,
  0,
  'founder-onboarding-v08',
  now(),
  now(),
  false,
  false,
  now(),
  '2026-05-19T10:52:25.420Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000003',
  null,
  'company-top-app',
  'Hodge',
  '/community/outreach-project-moderator.png',
  'How to complete your profile',
  'A complete profile helps the platform surface relevant resources and helps moderators route support when you reach out.

Step 1 — Open Profile from the bottom navigation or menu.
Step 2 — Add your display name, location, and mission focus areas.
Step 3 — Share causes, skills, or volunteer interests if you want peers to understand how you serve.
Step 4 — Upload a profile photo if you would like—member stories show your name when you choose to share publicly.

Why this matters: Profiles are not vanity—they help trusted referrals, community connections, and membership features work the way you expect.',
  'platform_guide',
  'platform_guide',
  true,
  'cta:/profile|Complete your profile',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b38df?auto=format&w=1200&h=675&fit=crop&q=80',
  'approved',
  'community',
  27,
  0,
  'founder-onboarding-v08',
  now(),
  now(),
  false,
  false,
  now(),
  '2026-05-19T04:52:25.420Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000004',
  null,
  'company-top-app',
  'Josh',
  '/community/outreach-project-moderator.png',
  'How to use the Trusted Resources page',
  'Trusted Resources is our curated lane for organizations and programs we have reviewed for mission alignment, clarity, and veteran and first-responder relevance.

Step 1 — Open Trusted Resources from home or the navigation menu.
Step 2 — Read each card’s summary, service area, and verification cues.
Step 3 — Open a resource profile for mission details, programs, and official outbound links.
Step 4 — Save or share organizations you want your family or team to revisit.

Why this matters: When someone is in crisis or transition, credibility matters. Trusted Resources reduces guesswork so you can act with confidence.',
  'platform_guide',
  'platform_guide',
  true,
  'cta:/trusted|Explore Trusted Resources',
  'https://images.unsplash.com/photo-1559027615-cd0da4c7e7e3?auto=format&w=1200&h=675&fit=crop&q=80',
  'approved',
  'community',
  35,
  0,
  'founder-onboarding-v08',
  now(),
  now(),
  false,
  false,
  now(),
  '2026-05-18T22:52:25.420Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000005',
  null,
  'company-top-app',
  'Hodge',
  '/community/outreach-project-moderator.png',
  'How to navigate the nonprofit directory',
  'The directory is a broader search surface across nonprofit records—ideal when you know a cause, location, or NTEE service area.

Step 1 — From home, scroll to the directory or use search filters for state and service category.
Step 2 — Open a listing to review mission copy, location, and external links.
Step 3 — Use Quick category focus to narrow by NTEE letter when you know the type of help you need.
Step 4 — Save promising organizations to your profile for later follow-up.

Why this matters: Discovery should feel practical—not overwhelming. Filters and clear cards help you compare options before you reach out.',
  'platform_guide',
  'platform_guide',
  true,
  'cta:/#home-directory|Browse the directory',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&w=1200&h=675&fit=crop&q=80',
  'approved',
  'community',
  22,
  0,
  'founder-onboarding-v08',
  now(),
  now(),
  false,
  false,
  now(),
  '2026-05-18T16:52:25.420Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000006',
  null,
  'company-top-app',
  'Josh',
  '/community/outreach-project-moderator.png',
  'How to use the podcast page',
  'The Outreach Project podcast amplifies stories, partners, and practical conversations for our community.

Step 1 — Visit the Podcast page from home or the menu.
Step 2 — Browse recent episodes and featured conversations.
Step 3 — Follow links to listen on your preferred platform.
Step 4 — Explore podcast sponsors when you want to support mission-aligned partners.

Why this matters: Audio builds trust at human speed—especially for peers who want context before they call an organization or apply for a program.',
  'platform_guide',
  'platform_guide',
  true,
  'cta:/podcasts|Listen & explore episodes',
  'https://images.unsplash.com/photo-1478737277774-8aa3ee54c771?auto=format&w=1200&h=675&fit=crop&q=80',
  'approved',
  'community',
  19,
  0,
  'founder-onboarding-v08',
  now(),
  now(),
  false,
  false,
  now(),
  '2026-05-18T10:52:25.420Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000007',
  null,
  'company-top-app',
  'Hodge',
  '/community/outreach-project-moderator.png',
  'How to support through sponsorship & membership',
  'Sponsors and members keep the platform sustainable so we can keep directory and community tools accessible.

Step 1 — Review Sponsors to see foundational partners and mission-aligned companies.
Step 2 — Use sponsor cards for direct links and follow-up where offered.
Step 3 — Visit Profile → membership when you are ready to support at the member tier.
Step 4 — Companies interested in partnership should use the sponsor application flow so our team can respond cleanly.

Why this matters: Transparent support models protect the community from pay-to-play listings—sponsors are disclosed, and curated trust lanes stay separate.',
  'platform_guide',
  'platform_guide',
  true,
  'cta:/sponsors|View sponsors & partners',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&w=1200&h=675&fit=crop&q=80',
  'approved',
  'community',
  24,
  0,
  'founder-onboarding-v08',
  now(),
  now(),
  false,
  false,
  now(),
  '2026-05-18T04:52:25.420Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000008',
  null,
  'company-top-app',
  'Josh & Hodge',
  '/community/outreach-project-moderator.png',
  'How the Community page works',
  'Community is where members share what actually helped—stories, gratitude, and practical referrals—after moderator review.

Step 1 — Read approved posts in Latest to learn from peers and moderator guides.
Step 2 — Sign in to like posts and save encouragement to your profile.
Step 3 — At the Member tier, submit your own story for review.
Step 4 — Include what happened, which resource helped, and one next step someone else could take today.

Why this matters: Peer transparency helps others act—but only when posts stay specific, respectful, and safe. Moderation keeps the feed credible.',
  'platform_guide',
  'platform_guide',
  true,
  'cta:/community|Visit Community',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&w=1200&h=675&fit=crop&q=80',
  'approved',
  'community',
  41,
  0,
  'founder-onboarding-v08',
  now(),
  now(),
  false,
  false,
  now(),
  '2026-05-17T22:52:25.420Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-00000000000c',
  null,
  'company-top-app',
  'Josh',
  '/community/outreach-project-moderator.png',
  'What you gain from The Outreach Project ecosystem',
  'Joining connects you to curated resources, peer stories, nonprofit discovery, and mission-aligned partners in one place.

Step 1 — Trusted Resources and directory search reduce time spent guessing which organizations are credible.
Step 2 — Community and podcast content add human context to listings and programs.
Step 3 — Sponsor transparency shows who helps sustain the platform without blurring editorial trust.
Step 4 — Membership unlocks deeper participation when you are ready to share your own story.

Why this matters: Veterans, first responders, and families deserve a single, trustworthy front door—not a dozen disconnected tabs and outdated lists.',
  'platform_guide',
  'platform_guide',
  true,
  'cta:/|Explore the platform',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&w=1200&h=675&fit=crop&q=80',
  'approved',
  'community',
  29,
  0,
  'founder-onboarding-v08',
  now(),
  now(),
  false,
  false,
  now(),
  '2026-05-17T16:52:25.420Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-00000000000a',
  null,
  'company-top-app',
  'Hodge',
  '/community/outreach-project-moderator.png',
  'How nonprofits & organizations can participate',
  'If your organization serves veterans, first responders, or aligned families, we want your work discoverable and accurately represented.

Step 1 — Ensure your public listing reflects your EIN, mission, and service area.
Step 2 — Request trusted review if you meet our curation standards for the Trusted Resources lane.
Step 3 — Share podcast or sponsor inquiries through the official application paths.
Step 4 — Encourage satisfied clients to submit community stories—with respect for privacy and program rules.

Why this matters: Participation is partnership, not pay-to-rank. We prioritize clarity, consent, and mission fit so the community can trust what they see.',
  'platform_guide',
  'platform_guide',
  true,
  'cta:/contact|Contact our team',
  'https://images.unsplash.com/photo-1469574853967-2e58ec69b93e?auto=format&w=1200&h=675&fit=crop&q=80',
  'approved',
  'community',
  17,
  0,
  'founder-onboarding-v08',
  now(),
  now(),
  false,
  false,
  now(),
  '2026-05-17T16:52:25.420Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-00000000000b',
  null,
  'company-top-app',
  'Josh & Hodge',
  '/community/outreach-project-moderator.png',
  'Community guidelines & platform mission',
  'The Outreach Project exists to make trusted support easier to find—and to celebrate organizations doing the work.

Step 1 — Be respectful and specific. No harassment, hate, or fundraising spam.
Step 2 — Share lived experience and verified resources—avoid medical or legal claims we cannot substantiate.
Step 3 — Protect privacy: do not post someone else’s personal details without consent.
Step 4 — Moderators may edit visibility, request revisions, or decline posts that risk harm or misinformation.

Why this matters: A mission-driven community only works when members feel safe showing up. These guidelines protect the people who need this space most.',
  'platform_guide',
  'platform_guide',
  true,
  'cta:/community|Read the Community feed',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&w=1200&h=675&fit=crop&q=80',
  'approved',
  'community',
  52,
  0,
  'founder-onboarding-v08',
  now(),
  now(),
  false,
  false,
  now(),
  '2026-05-17T08:52:25.420Z'::timestamptz
)
on conflict (id) do update set
  author_id = excluded.author_id,
  author_name = excluded.author_name,
  author_avatar_url = excluded.author_avatar_url,
  title = excluded.title,
  body = excluded.body,
  category = excluded.category,
  post_type = excluded.post_type,
  link_url = excluded.link_url,
  photo_url = excluded.photo_url,
  status = excluded.status,
  visibility = excluded.visibility,
  like_count = excluded.like_count,
  reviewed_by = excluded.reviewed_by,
  reviewed_at = excluded.reviewed_at,
  published_at = excluded.published_at,
  is_demo_seed = excluded.is_demo_seed,
  updated_at = now();

-- Retire legacy company posts that used brand logos in photo_url.
update public.community_posts
set deleted_at = now(), updated_at = now()
where author_id = 'company-top-app'
  and id not in (
    'd2000000-0000-4000-8000-000000000009',
    'd2000000-0000-4000-8000-000000000002',
    'd2000000-0000-4000-8000-000000000003',
    'd2000000-0000-4000-8000-000000000004',
    'd2000000-0000-4000-8000-000000000005',
    'd2000000-0000-4000-8000-000000000006',
    'd2000000-0000-4000-8000-000000000007',
    'd2000000-0000-4000-8000-000000000008',
    'd2000000-0000-4000-8000-00000000000c',
    'd2000000-0000-4000-8000-00000000000a',
    'd2000000-0000-4000-8000-00000000000b'
  )
  and deleted_at is null;

commit;
