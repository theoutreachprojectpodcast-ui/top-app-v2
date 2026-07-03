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
  'New here? Follow these four steps to set up your account, find credible help, and start participating in the community.

Step 1 — Create your account: choose Create account, sign in with WorkOS using the email you want on your profile, then confirm you land back on the site signed in.
Step 2 — Finish your profile: open Profile, add your name, location, and causes you care about so recommendations and community features match your situation.
Step 3 — Explore Trusted Resources and the nonprofit directory: use Trusted Resources for vetted programs, then use directory search when you know a location or service type.
Step 4 — Engage: read Community stories, listen on the Podcast page, and at the Member tier submit your own story after moderator review.

Why this matters: You get one trusted front door—curated resources, searchable nonprofits, peer stories, and podcast context—instead of scattered tabs and outdated lists.',
  'platform_guide',
  'platform_guide_image',
  true,
  'cta:/api/auth/workos/signup?returnTo=/community|Create your account',
  '/home/home-community-group.png',
  'approved',
  'community',
  48,
  0,
  'founder-onboarding-v09',
  '2026-07-03T13:05:44.679Z'::timestamptz,
  '2026-07-03T13:05:44.679Z'::timestamptz,
  false,
  false,
  now(),
  '2026-07-03T12:05:44.679Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000002',
  null,
  'company-top-app',
  'Josh',
  '/community/outreach-project-moderator.png',
  'Step 1 — Create or sign in to your account',
  'Your account ties together saved organizations, community participation, likes, and membership tools.

Step 1 — From Community or Home, select Create account (or Sign in if you already have one).
Step 2 — Complete WorkOS hosted sign-in with the email you want on your TOP profile.
Step 3 — After redirect, open Profile once to confirm your name loaded.
Step 4 — On a trusted device, choose remember device so you stay signed in during normal use.

Why this matters: A verified account keeps your activity and support pathways consistent when you return—especially across directory saves and story submissions.',
  'platform_guide',
  'platform_guide_image',
  true,
  'cta:/api/auth/workos/signup?returnTo=/community|Create your account',
  '/home/home-header-flag-horizontal.png',
  'approved',
  'community',
  31,
  0,
  'founder-onboarding-v09',
  '2026-07-03T07:05:44.679Z'::timestamptz,
  '2026-07-03T07:05:44.679Z'::timestamptz,
  false,
  false,
  now(),
  '2026-07-03T06:05:44.679Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000003',
  null,
  'company-top-app',
  'Hodge',
  '/community/outreach-project-moderator.png',
  'Step 2 — Finish your profile',
  'Profiles are how the platform personalizes resources and how the community recognizes you when you share publicly.

Step 1 — Open Profile from the main navigation.
Step 2 — Add display name, location, and mission focus areas.
Step 3 — Optional: causes, skills, or volunteer interests so connections are relevant.
Step 4 — Upload a photo if you want your story posts to show your name with a face.

Why this matters: This is not vanity data—it powers saved-org follow-up, community trust, and membership features you will use later.',
  'platform_guide',
  'platform_guide_image',
  true,
  'cta:/profile?edit=1|Open profile editor',
  '/home/home-atmosphere-mountain-service.png',
  'approved',
  'community',
  27,
  0,
  'founder-onboarding-v09',
  '2026-07-03T01:05:44.679Z'::timestamptz,
  '2026-07-03T01:05:44.679Z'::timestamptz,
  false,
  false,
  now(),
  '2026-07-03T00:05:44.679Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000004',
  null,
  'company-top-app',
  'Josh',
  '/community/outreach-project-moderator.png',
  'Step 3 — Use Trusted Resources',
  'Trusted Resources is the curated lane for veteran- and first-responder-relevant programs we have reviewed for clarity and fit.

Step 1 — Open Trusted Resources from Home or the main menu.
Step 2 — Scan summaries, service areas, and verification cues on each card.
Step 3 — Open a profile for programs, outbound links, and how to engage.
Step 4 — Save organizations you want your family or team to revisit from Profile.

Why this matters: When someone is in crisis or transition, guesswork costs time. Trusted Resources reduces that risk.',
  'platform_guide',
  'platform_guide_resource',
  true,
  'cta:/trusted|Browse Trusted Resources',
  '/trusted/back-country-heroes-hero.png',
  'approved',
  'community',
  35,
  0,
  'founder-onboarding-v09',
  '2026-07-02T19:05:44.679Z'::timestamptz,
  '2026-07-02T19:05:44.679Z'::timestamptz,
  false,
  false,
  now(),
  '2026-07-02T18:05:44.679Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000005',
  null,
  'company-top-app',
  'Hodge',
  '/community/outreach-project-moderator.png',
  'Step 4 — Search the nonprofit directory',
  'The directory is broader than Trusted Resources—use it when you are comparing options by state, cause, or NTEE category.

Step 1 — From Home, scroll to directory search or jump via the directory anchor link.
Step 2 — Filter by state and service category; use Quick category focus for NTEE letters.
Step 3 — Open listings to compare missions side by side before you call or apply.
Step 4 — Save promising organizations to your profile for follow-up.

Why this matters: Discovery should feel practical. Filters and consistent cards help you act—not scroll endlessly.',
  'platform_guide',
  'platform_guide_carousel',
  true,
  'cta:/#home-directory|Open directory search',
  '/directory/category-headers/v.png',
  'approved',
  'community',
  22,
  0,
  'founder-onboarding-v09',
  '2026-07-02T13:05:44.679Z'::timestamptz,
  '2026-07-02T13:05:44.679Z'::timestamptz,
  false,
  false,
  now(),
  '2026-07-02T12:05:44.679Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000006',
  null,
  'company-top-app',
  'Josh',
  '/community/outreach-project-moderator.png',
  'Hear the mission on the podcast',
  'The Outreach Project podcast adds human context—stories, partners, and practical conversations—before you reach out to an organization.

Step 1 — Open the Podcast page from Home or the menu.
Step 2 — Start with the latest episode or browse the library.
Step 3 — Follow outbound listen links to your preferred platform.
Step 4 — Explore podcast sponsors when you want to support mission-aligned partners.

Why this matters: Audio builds trust at human speed, especially for peers who want context before they call a program or apply.',
  'platform_guide',
  'platform_guide_podcast',
  true,
  'cta:/podcasts|Listen & explore episodes',
  '/home/home-podcast-mic.png',
  'approved',
  'community',
  19,
  0,
  'founder-onboarding-v09',
  '2026-07-02T07:05:44.679Z'::timestamptz,
  '2026-07-02T07:05:44.679Z'::timestamptz,
  false,
  false,
  now(),
  '2026-07-02T06:05:44.679Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000007',
  null,
  'company-top-app',
  'Hodge',
  '/community/outreach-project-moderator.png',
  'Become a member or explore sponsorship',
  'Members and sponsors keep directory and community tools sustainable while keeping curated trust lanes separate from paid placement.

Step 1 — Review Sponsors to see foundational partners and how they support the mission.
Step 2 — Open Profile → Membership & billing when you are ready for the Member tier (story submission and deeper participation).
Step 3 — Use sponsor application flows for companies—our team routes partnership inquiries cleanly.
Step 4 — Read sponsor disclosures on listings so you always know what is editorial vs. partnership.

Why this matters: Transparent support protects the community from pay-to-play listings and keeps Trusted Resources credible.',
  'platform_guide',
  'platform_guide_image',
  true,
  'cta:/sponsors|View sponsors & membership',
  '/home/home-sponsors-city.png',
  'approved',
  'community',
  24,
  0,
  'founder-onboarding-v09',
  '2026-07-02T01:05:44.679Z'::timestamptz,
  '2026-07-02T01:05:44.679Z'::timestamptz,
  false,
  false,
  now(),
  '2026-07-02T00:05:44.679Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-000000000008',
  null,
  'company-top-app',
  'Josh & Hodge',
  '/community/outreach-project-moderator.png',
  'How to engage with Community',
  'Community is where members share what actually worked—after moderator review keeps the feed respectful and specific.

Step 1 — Read Latest for guides (like this one) and approved member stories.
Step 2 — Sign in to like posts and save encouragement to your session.
Step 3 — At Member tier, submit a story with what happened, which resource helped, and a concrete next step.
Step 4 — Skip vague marketing—specific, respectful posts help the next person act today.

Why this matters: Peer transparency only works when posts stay safe and actionable. Moderation is what makes that possible.',
  'platform_guide',
  'platform_guide_carousel',
  true,
  'cta:/community|Browse Community',
  '/home/home-community-group.png',
  'approved',
  'community',
  41,
  0,
  'founder-onboarding-v09',
  '2026-07-01T19:05:44.679Z'::timestamptz,
  '2026-07-01T19:05:44.679Z'::timestamptz,
  false,
  false,
  now(),
  '2026-07-01T18:05:44.679Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-00000000000c',
  null,
  'company-top-app',
  'Josh',
  '/community/outreach-project-moderator.png',
  'What you get from The Outreach Project',
  'Joining connects curated resources, searchable nonprofits, community stories, and podcast context.

Step 1 — Trusted Resources plus directory search cut time spent guessing which organizations are credible.
Step 2 — Community and podcast content add human context to listings.
Step 3 — Sponsor transparency shows who sustains the platform without blurring editorial trust.
Step 4 — Membership unlocks deeper participation when you are ready to share your own story.

Why this matters: Veterans, first responders, and families deserve a single trustworthy front door—not a dozen disconnected tabs.',
  'platform_guide',
  'platform_guide_image',
  true,
  'cta:/|Explore the platform',
  '/home/home-page-background-outreach-hero-2560.png',
  'approved',
  'community',
  29,
  0,
  'founder-onboarding-v09',
  '2026-07-01T13:05:44.679Z'::timestamptz,
  '2026-07-01T13:05:44.679Z'::timestamptz,
  false,
  false,
  now(),
  '2026-07-01T12:05:44.679Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-00000000000a',
  null,
  'company-top-app',
  'Hodge',
  '/community/outreach-project-moderator.png',
  'For nonprofits and partner organizations',
  'If you serve veterans, first responders, or aligned families, we want your work discoverable and accurately represented.

Step 1 — Confirm your public listing shows correct EIN, mission, and service area.
Step 2 — Request trusted review if you meet curation standards for the Trusted Resources lane.
Step 3 — Use official podcast or sponsor application paths for media and partnership inquiries.
Step 4 — Encourage clients to share community stories only with consent and program rules respected.

Why this matters: Participation is partnership, not pay-to-rank. Clarity and mission fit keep the community’s trust high.',
  'platform_guide',
  'platform_guide_image',
  true,
  'cta:/contact|Contact our team',
  '/trusted/hero-to-the-line-hero.png',
  'approved',
  'community',
  17,
  0,
  'founder-onboarding-v09',
  '2026-07-01T09:05:44.679Z'::timestamptz,
  '2026-07-01T09:05:44.679Z'::timestamptz,
  false,
  false,
  now(),
  '2026-07-01T08:05:44.679Z'::timestamptz
),
(
  'd2000000-0000-4000-8000-00000000000b',
  null,
  'company-top-app',
  'Josh & Hodge',
  '/community/outreach-project-moderator.png',
  'Community guidelines',
  'The Outreach Project exists to make trusted support easier to find—and to celebrate organizations doing the work.

Step 1 — Be respectful and specific. No harassment, hate, or fundraising spam.
Step 2 — Share lived experience and verified resources—avoid medical or legal claims we cannot substantiate.
Step 3 — Protect privacy: do not post someone else’s personal details without consent.
Step 4 — Moderators may request edits or decline posts that risk harm or misinformation.

Why this matters: A mission-driven community only works when members feel safe showing up. These rules protect the people who need this space most.',
  'platform_guide',
  'platform_guide_image',
  true,
  'cta:/community|Read the Community feed',
  '/home/home-header-mountain-patriotic.png',
  'approved',
  'community',
  52,
  0,
  'founder-onboarding-v09',
  '2026-07-01T05:05:44.679Z'::timestamptz,
  '2026-07-01T05:05:44.679Z'::timestamptz,
  false,
  false,
  now(),
  '2026-07-01T04:05:44.679Z'::timestamptz
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
