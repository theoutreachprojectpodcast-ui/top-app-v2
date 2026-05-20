/**
 * Founder moderator onboarding feed — single source for API merge, local fallback, and DB seeds.
 */

import {
  OUTREACH_MODERATOR_AUTHOR_ID,
  OUTREACH_MODERATOR_AVATAR_URL,
} from "../domain/communityModerator.js";

/** @param {string} path Unsplash photo id (no domain) */
function coverPhoto(path) {
  return `https://images.unsplash.com/${path}?auto=format&w=1200&h=675&fit=crop&q=80`;
}

function guideBody({ intro, steps, why }) {
  const lines = [intro, ""];
  steps.forEach((text, i) => {
    lines.push(`Step ${i + 1} — ${text}`);
  });
  lines.push("", `Why this matters: ${why}`);
  return lines.join("\n").trim();
}

function cta(href, label) {
  return `cta:${href}|${label}`;
}

/** Stable UUIDs shared with SQL + local dev seed (d200… in QA, b200… in local script). */
export const FOUNDER_ONBOARDING_POST_IDS = {
  createAccount: "d2000000-0000-4000-8000-000000000002",
  completeProfile: "d2000000-0000-4000-8000-000000000003",
  trustedResources: "d2000000-0000-4000-8000-000000000004",
  nonprofitDirectory: "d2000000-0000-4000-8000-000000000005",
  podcastPage: "d2000000-0000-4000-8000-000000000006",
  sponsorsMembership: "d2000000-0000-4000-8000-000000000007",
  communityGuide: "d2000000-0000-4000-8000-000000000008",
  ecosystemValue: "d2000000-0000-4000-8000-000000000009",
  ecosystemBenefits: "d2000000-0000-4000-8000-00000000000c",
  nonprofitPartners: "d2000000-0000-4000-8000-00000000000a",
  guidelinesMission: "d2000000-0000-4000-8000-00000000000b",
};

/** Index 0 = newest (top of feed). Eleven pinned guides (welcome + 10 topics). */
const HOURS_AGO = [8, 14, 20, 26, 32, 38, 44, 50, 56, 60, 64];

/**
 * @param {number} hoursAgo
 * @returns {string}
 */
function createdAtHoursAgo(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

const GUIDE_DEFS = [
  {
    id: FOUNDER_ONBOARDING_POST_IDS.ecosystemValue,
    author_name: "Josh & Hodge",
    hoursAgo: HOURS_AGO[0],
    like_count: 48,
    title: "Getting started with The Outreach Project",
    category: "platform_guide",
    post_type: "platform_guide",
    photo_url: coverPhoto("photo-1529156069898-49953e39b3ac"),
    link_url: cta("/api/auth/workos/signup?returnTo=/community", "Complete your profile"),
    intro:
      "Welcome to a mission-built platform for veterans, first responders, families, supporters, and nonprofit partners.",
    steps: [
      "Create your account and sign in securely.",
      "Complete your profile so resources and community features personalize to you.",
      "Explore Trusted Resources and the nonprofit directory.",
      "Join Community conversations and follow podcast and sponsor updates.",
    ],
    why:
      "The Outreach Project helps you discover trusted organizations, build community, and access meaningful resources—without wading through random search results.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.createAccount,
    author_name: "Josh",
    hoursAgo: HOURS_AGO[1],
    like_count: 31,
    title: "How to create your account",
    category: "platform_guide",
    post_type: "platform_guide",
    photo_url: coverPhoto("photo-1516321318523-f6f85c09ae39"),
    link_url: cta("/api/auth/workos/signup?returnTo=/community", "Create your account"),
    intro: "Your account unlocks the directory, saved organizations, community participation, and member-only tools.",
    steps: [
      "From the Community page or home screen, choose Create account.",
      "Sign in with WorkOS using the email you want tied to your profile.",
      "Confirm you land back on The Outreach Project—your session should stay signed in on trusted devices when you choose remember device.",
      "Visit Profile to confirm your name and basics loaded correctly.",
    ],
    why:
      "A verified account keeps your saves, likes, and story submissions tied to you—so support pathways stay consistent when you return.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.completeProfile,
    author_name: "Hodge",
    hoursAgo: HOURS_AGO[2],
    like_count: 27,
    title: "How to complete your profile",
    category: "platform_guide",
    post_type: "platform_guide",
    photo_url: coverPhoto("photo-1573497019940-1c28c88b38df"),
    link_url: cta("/profile", "Complete your profile"),
    intro: "A complete profile helps the platform surface relevant resources and helps moderators route support when you reach out.",
    steps: [
      "Open Profile from the bottom navigation or menu.",
      "Add your display name, location, and mission focus areas.",
      "Share causes, skills, or volunteer interests if you want peers to understand how you serve.",
      "Upload a profile photo if you would like—member stories show your name when you choose to share publicly.",
    ],
    why:
      "Profiles are not vanity—they help trusted referrals, community connections, and membership features work the way you expect.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.trustedResources,
    author_name: "Josh",
    hoursAgo: HOURS_AGO[3],
    like_count: 35,
    title: "How to use the Trusted Resources page",
    category: "platform_guide",
    post_type: "platform_guide",
    photo_url: coverPhoto("photo-1559027615-cd0da4c7e7e3"),
    link_url: cta("/trusted", "Explore Trusted Resources"),
    intro:
      "Trusted Resources is our curated lane for organizations and programs we have reviewed for mission alignment, clarity, and veteran and first-responder relevance.",
    steps: [
      "Open Trusted Resources from home or the navigation menu.",
      "Read each card’s summary, service area, and verification cues.",
      "Open a resource profile for mission details, programs, and official outbound links.",
      "Save or share organizations you want your family or team to revisit.",
    ],
    why:
      "When someone is in crisis or transition, credibility matters. Trusted Resources reduces guesswork so you can act with confidence.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.nonprofitDirectory,
    author_name: "Hodge",
    hoursAgo: HOURS_AGO[4],
    like_count: 22,
    title: "How to navigate the nonprofit directory",
    category: "platform_guide",
    post_type: "platform_guide",
    photo_url: coverPhoto("photo-1454165804606-c3d57bc86b40"),
    link_url: cta("/#home-directory", "Browse the directory"),
    intro:
      "The directory is a broader search surface across nonprofit records—ideal when you know a cause, location, or NTEE service area.",
    steps: [
      "From home, scroll to the directory or use search filters for state and service category.",
      "Open a listing to review mission copy, location, and external links.",
      "Use Quick category focus to narrow by NTEE letter when you know the type of help you need.",
      "Save promising organizations to your profile for later follow-up.",
    ],
    why:
      "Discovery should feel practical—not overwhelming. Filters and clear cards help you compare options before you reach out.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.podcastPage,
    author_name: "Josh",
    hoursAgo: HOURS_AGO[5],
    like_count: 19,
    title: "How to use the podcast page",
    category: "platform_guide",
    post_type: "platform_guide",
    photo_url: coverPhoto("photo-1478737277774-8aa3ee54c771"),
    link_url: cta("/podcasts", "Listen & explore episodes"),
    intro:
      "The Outreach Project podcast amplifies stories, partners, and practical conversations for our community.",
    steps: [
      "Visit the Podcast page from home or the menu.",
      "Browse recent episodes and featured conversations.",
      "Follow links to listen on your preferred platform.",
      "Explore podcast sponsors when you want to support mission-aligned partners.",
    ],
    why:
      "Audio builds trust at human speed—especially for peers who want context before they call an organization or apply for a program.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.sponsorsMembership,
    author_name: "Hodge",
    hoursAgo: HOURS_AGO[6],
    like_count: 24,
    title: "How to support through sponsorship & membership",
    category: "platform_guide",
    post_type: "platform_guide",
    photo_url: coverPhoto("photo-1522071820081-009f0129c71c"),
    link_url: cta("/sponsors", "View sponsors & partners"),
    intro:
      "Sponsors and members keep the platform sustainable so we can keep directory and community tools accessible.",
    steps: [
      "Review Sponsors to see foundational partners and mission-aligned companies.",
      "Use sponsor cards for direct links and follow-up where offered.",
      "Visit Profile → membership when you are ready to support at the member tier.",
      "Companies interested in partnership should use the sponsor application flow so our team can respond cleanly.",
    ],
    why:
      "Transparent support models protect the community from pay-to-play listings—sponsors are disclosed, and curated trust lanes stay separate.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.communityGuide,
    author_name: "Josh & Hodge",
    hoursAgo: HOURS_AGO[7],
    like_count: 41,
    title: "How the Community page works",
    category: "platform_guide",
    post_type: "platform_guide",
    photo_url: coverPhoto("photo-1523240795612-9a054b0db644"),
    link_url: cta("/community", "Visit Community"),
    intro:
      "Community is where members share what actually helped—stories, gratitude, and practical referrals—after moderator review.",
    steps: [
      "Read approved posts in Latest to learn from peers and moderator guides.",
      "Sign in to like posts and save encouragement to your profile.",
      "At the Member tier, submit your own story for review.",
      "Include what happened, which resource helped, and one next step someone else could take today.",
    ],
    why:
      "Peer transparency helps others act—but only when posts stay specific, respectful, and safe. Moderation keeps the feed credible.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.ecosystemBenefits,
    author_name: "Josh",
    hoursAgo: HOURS_AGO[8],
    like_count: 29,
    title: "What you gain from The Outreach Project ecosystem",
    category: "platform_guide",
    post_type: "platform_guide",
    photo_url: coverPhoto("photo-1507003211169-0a1dd7228f2d"),
    link_url: cta("/", "Explore the platform"),
    intro:
      "Joining connects you to curated resources, peer stories, nonprofit discovery, and mission-aligned partners in one place.",
    steps: [
      "Trusted Resources and directory search reduce time spent guessing which organizations are credible.",
      "Community and podcast content add human context to listings and programs.",
      "Sponsor transparency shows who helps sustain the platform without blurring editorial trust.",
      "Membership unlocks deeper participation when you are ready to share your own story.",
    ],
    why:
      "Veterans, first responders, and families deserve a single, trustworthy front door—not a dozen disconnected tabs and outdated lists.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.nonprofitPartners,
    author_name: "Hodge",
    hoursAgo: HOURS_AGO[8],
    like_count: 17,
    title: "How nonprofits & organizations can participate",
    category: "platform_guide",
    post_type: "platform_guide",
    photo_url: coverPhoto("photo-1469574853967-2e58ec69b93e"),
    link_url: cta("/contact", "Contact our team"),
    intro:
      "If your organization serves veterans, first responders, or aligned families, we want your work discoverable and accurately represented.",
    steps: [
      "Ensure your public listing reflects your EIN, mission, and service area.",
      "Request trusted review if you meet our curation standards for the Trusted Resources lane.",
      "Share podcast or sponsor inquiries through the official application paths.",
      "Encourage satisfied clients to submit community stories—with respect for privacy and program rules.",
    ],
    why:
      "Participation is partnership, not pay-to-rank. We prioritize clarity, consent, and mission fit so the community can trust what they see.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.guidelinesMission,
    author_name: "Josh & Hodge",
    hoursAgo: HOURS_AGO[10],
    like_count: 52,
    title: "Community guidelines & platform mission",
    category: "platform_guide",
    post_type: "platform_guide",
    photo_url: coverPhoto("photo-1522202176988-66273c2fd55f"),
    link_url: cta("/community", "Read the Community feed"),
    intro:
      "The Outreach Project exists to make trusted support easier to find—and to celebrate organizations doing the work.",
    steps: [
      "Be respectful and specific. No harassment, hate, or fundraising spam.",
      "Share lived experience and verified resources—avoid medical or legal claims we cannot substantiate.",
      "Protect privacy: do not post someone else’s personal details without consent.",
      "Moderators may edit visibility, request revisions, or decline posts that risk harm or misinformation.",
    ],
    why:
      "A mission-driven community only works when members feel safe showing up. These guidelines protect the people who need this space most.",
  },
];

/**
 * @returns {import("@/features/community/mappers/mapCommunityPost").CommunityPostRow[]}
 */
export function buildFounderOnboardingPostRows() {
  return GUIDE_DEFS.map((def) => ({
    id: def.id,
    created_at: createdAtHoursAgo(def.hoursAgo),
    author_profile_id: null,
    author_id: OUTREACH_MODERATOR_AUTHOR_ID,
    author_name: def.author_name,
    author_avatar_url: OUTREACH_MODERATOR_AVATAR_URL,
    title: def.title,
    body: guideBody({ intro: def.intro, steps: def.steps, why: def.why }),
    nonprofit_ein: null,
    nonprofit_name: "",
    category: def.category,
    post_type: def.post_type,
    show_author_name: true,
    link_url: def.link_url,
    photo_url: def.photo_url,
    status: "approved",
    visibility: "community",
    like_count: def.like_count,
    share_count: 0,
    reviewed_by: "founder-onboarding-v08",
    reviewed_at: createdAtHoursAgo(def.hoursAgo - 1),
    published_at: createdAtHoursAgo(def.hoursAgo - 1),
    is_edited: false,
    is_demo_seed: false,
  }));
}

/** Pre-mapped feed rows for client merge + localStorage fallback. */
export const FOUNDER_ONBOARDING_POSTS = buildFounderOnboardingPostRows();
