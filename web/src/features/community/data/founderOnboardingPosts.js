/**
 * Founder moderator onboarding feed — single source for API merge, local fallback, and DB seeds.
 */

import {
  OUTREACH_MODERATOR_AUTHOR_ID,
  OUTREACH_MODERATOR_AVATAR_URL,
} from "../domain/communityModerator.js";

/** Same-origin cover art (reliable in QA without external CDNs). */
function coverImage(path) {
  return String(path || "/home/home-trusted-mountain.png").trim();
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

const HOURS_AGO = [8, 14, 20, 26, 32, 38, 44, 50, 56, 60, 64];

function createdAtHoursAgo(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

const GUIDE_DEFS = [
  {
    id: FOUNDER_ONBOARDING_POST_IDS.ecosystemValue,
    author_name: "Josh & Hodge",
    hoursAgo: HOURS_AGO[0],
    like_count: 48,
    layout: "step",
    post_type: "platform_guide",
    title: "Getting started with The Outreach Project",
    photo_url: coverImage("/home/home-community-group.png"),
    link_url: cta("/api/auth/workos/signup?returnTo=/community", "Create your account"),
    intro:
      "New here? Follow these four steps to set up your account, find credible help, and start participating in the community.",
    steps: [
      "Create your account: choose Create account, sign in with WorkOS using the email you want on your profile, then confirm you land back on the site signed in.",
      "Finish your profile: open Profile, add your name, location, and causes you care about so recommendations and community features match your situation.",
      "Explore Trusted Resources and the nonprofit directory: use Trusted Resources for vetted programs, then use directory search when you know a location or service type.",
      "Engage: read Community stories, listen on the Podcast page, and at the Member tier submit your own story after moderator review.",
    ],
    why:
      "You get one trusted front door—curated resources, searchable nonprofits, peer stories, and podcast context—instead of scattered tabs and outdated lists.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.createAccount,
    author_name: "Josh",
    hoursAgo: HOURS_AGO[1],
    like_count: 31,
    layout: "step",
    post_type: "platform_guide",
    title: "Step 1 — Create or sign in to your account",
    photo_url: coverImage("/home/home-header-flag-horizontal.png"),
    link_url: cta("/api/auth/workos/signup?returnTo=/community", "Create your account"),
    intro:
      "Your account ties together saved organizations, community participation, likes, and membership tools.",
    steps: [
      "From Community or Home, select Create account (or Sign in if you already have one).",
      "Complete WorkOS hosted sign-in with the email you want on your TOP profile.",
      "After redirect, open Profile once to confirm your name loaded.",
      "On a trusted device, choose remember device so you stay signed in during normal use.",
    ],
    why:
      "A verified account keeps your activity and support pathways consistent when you return—especially across directory saves and story submissions.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.completeProfile,
    author_name: "Hodge",
    hoursAgo: HOURS_AGO[2],
    like_count: 27,
    layout: "image",
    post_type: "platform_guide_image",
    title: "Step 2 — Finish your profile",
    photo_url: coverImage("/home/home-atmosphere-mountain-service.png"),
    imageAlt: "Member completing a profile in the outreach community",
    mediaCaption: "A complete profile helps peers and moderators understand how you serve—and unlocks clearer recommendations.",
    link_url: cta("/profile?edit=1", "Open profile editor"),
    intro: "Profiles are how the platform personalizes resources and how the community recognizes you when you share publicly.",
    steps: [
      "Open Profile from the main navigation.",
      "Add display name, location, and mission focus areas.",
      "Optional: causes, skills, or volunteer interests so connections are relevant.",
      "Upload a photo if you want your story posts to show your name with a face.",
    ],
    why:
      "This is not vanity data—it powers saved-org follow-up, community trust, and membership features you will use later.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.trustedResources,
    author_name: "Josh",
    hoursAgo: HOURS_AGO[3],
    like_count: 35,
    layout: "resource",
    post_type: "platform_guide_resource",
    title: "Step 3 — Use Trusted Resources",
    photo_url: coverImage("/trusted/back-country-heroes-hero.png"),
    link_url: cta("/trusted", "Browse Trusted Resources"),
    resource: {
      name: "Trusted Resources",
      category: "Curated programs",
      description:
        "Mission-reviewed organizations with clear service areas—start here when credibility matters most.",
      image: "/trusted/back-country-heroes-hero.png",
      logo: "/trusted/back-country-heroes-org-logo.png",
      href: "/trusted",
    },
    intro:
      "Trusted Resources is the curated lane for veteran- and first-responder-relevant programs we have reviewed for clarity and fit.",
    steps: [
      "Open Trusted Resources from Home or the main menu.",
      "Scan summaries, service areas, and verification cues on each card.",
      "Open a profile for programs, outbound links, and how to engage.",
      "Save organizations you want your family or team to revisit from Profile.",
    ],
    why:
      "When someone is in crisis or transition, guesswork costs time. Trusted Resources reduces that risk.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.nonprofitDirectory,
    author_name: "Hodge",
    hoursAgo: HOURS_AGO[4],
    like_count: 22,
    layout: "carousel",
    post_type: "platform_guide_carousel",
    title: "Step 4 — Search the nonprofit directory",
    photo_url: coverImage("/directory/category-headers/v.png"),
    link_url: cta("/#home-directory", "Open directory search"),
    carouselSlides: [
      {
        image: "/directory/category-headers/v.png",
        caption: "Filter by veterans & military service categories when you know the type of help you need.",
        alt: "Veterans nonprofit category",
      },
      {
        image: "/directory/category-headers/h.png",
        caption: "Health and wellness listings for clinical, peer, and family support programs.",
        alt: "Health nonprofit category",
      },
      {
        image: "/home/home-header-patriotic-panorama.png",
        caption: "Open any listing for mission copy, location, and official outbound links.",
        alt: "Nonprofit directory overview",
      },
    ],
    intro:
      "The directory is broader than Trusted Resources—use it when you are comparing options by state, cause, or NTEE category.",
    steps: [
      "From Home, scroll to directory search or jump via the directory anchor link.",
      "Filter by state and service category; use Quick category focus for NTEE letters.",
      "Open listings to compare missions side by side before you call or apply.",
      "Save promising organizations to your profile for follow-up.",
    ],
    why:
      "Discovery should feel practical. Filters and consistent cards help you act—not scroll endlessly.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.podcastPage,
    author_name: "Josh",
    hoursAgo: HOURS_AGO[5],
    like_count: 19,
    layout: "podcast",
    post_type: "platform_guide_podcast",
    title: "Hear the mission on the podcast",
    photo_url: coverImage("/home/home-podcast-mic.png"),
    link_url: cta("/podcasts", "Listen & explore episodes"),
    intro:
      "The Outreach Project podcast adds human context—stories, partners, and practical conversations—before you reach out to an organization.",
    steps: [
      "Open the Podcast page from Home or the menu.",
      "Start with the latest episode or browse the library.",
      "Follow outbound listen links to your preferred platform.",
      "Explore podcast sponsors when you want to support mission-aligned partners.",
    ],
    why:
      "Audio builds trust at human speed, especially for peers who want context before they call a program or apply.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.sponsorsMembership,
    author_name: "Hodge",
    hoursAgo: HOURS_AGO[6],
    like_count: 24,
    layout: "step",
    post_type: "platform_guide",
    title: "Become a member or explore sponsorship",
    photo_url: coverImage("/home/home-sponsors-city.png"),
    link_url: cta("/sponsors", "View sponsors & membership"),
    intro:
      "Members and sponsors keep directory and community tools sustainable while keeping curated trust lanes separate from paid placement.",
    steps: [
      "Review Sponsors to see foundational partners and how they support the mission.",
      "Open Profile → Membership & billing when you are ready for the Member tier (story submission and deeper participation).",
      "Use sponsor application flows for companies—our team routes partnership inquiries cleanly.",
      "Read sponsor disclosures on listings so you always know what is editorial vs. partnership.",
    ],
    why:
      "Transparent support protects the community from pay-to-play listings and keeps Trusted Resources credible.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.communityGuide,
    author_name: "Josh & Hodge",
    hoursAgo: HOURS_AGO[7],
    like_count: 41,
    layout: "carousel",
    post_type: "platform_guide_carousel",
    title: "How to engage with Community",
    photo_url: coverImage("/home/home-community-group.png"),
    link_url: cta("/community", "Browse Community"),
    carouselSlides: [
      {
        image: "/home/home-community-group.png",
        caption: "Read moderator guides and peer stories in Latest.",
        alt: "Community members connecting",
      },
      {
        image: "/home/home-trusted-mountain.png",
        caption: "Like posts when signed in to show encouragement.",
        alt: "Trusted resources landscape",
      },
      {
        image: "/home/home-hero-flag-mission.png",
        caption: "At Member tier, submit your story: what helped, which resource, and one next step for others.",
        alt: "Mission-focused community",
      },
    ],
    intro:
      "Community is where members share what actually worked—after moderator review keeps the feed respectful and specific.",
    steps: [
      "Read Latest for guides (like this one) and approved member stories.",
      "Sign in to like posts and save encouragement to your session.",
      "At Member tier, submit a story with what happened, which resource helped, and a concrete next step.",
      "Skip vague marketing—specific, respectful posts help the next person act today.",
    ],
    why:
      "Peer transparency only works when posts stay safe and actionable. Moderation is what makes that possible.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.ecosystemBenefits,
    author_name: "Josh",
    hoursAgo: HOURS_AGO[8],
    like_count: 29,
    layout: "image",
    post_type: "platform_guide_image",
    title: "What you get from The Outreach Project",
    photo_url: coverImage("/home/home-page-background-outreach-hero-2560.png"),
    imageAlt: "The Outreach Project platform ecosystem",
    mediaCaption: "One place for trusted discovery, peer stories, audio context, and transparent sponsorship.",
    link_url: cta("/", "Explore the platform"),
    intro: "Joining connects curated resources, searchable nonprofits, community stories, and podcast context.",
    steps: [
      "Trusted Resources plus directory search cut time spent guessing which organizations are credible.",
      "Community and podcast content add human context to listings.",
      "Sponsor transparency shows who sustains the platform without blurring editorial trust.",
      "Membership unlocks deeper participation when you are ready to share your own story.",
    ],
    why:
      "Veterans, first responders, and families deserve a single trustworthy front door—not a dozen disconnected tabs.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.nonprofitPartners,
    author_name: "Hodge",
    hoursAgo: HOURS_AGO[9],
    like_count: 17,
    layout: "step",
    post_type: "platform_guide",
    title: "For nonprofits and partner organizations",
    photo_url: coverImage("/trusted/hero-to-the-line-hero.png"),
    link_url: cta("/contact", "Contact our team"),
    intro:
      "If you serve veterans, first responders, or aligned families, we want your work discoverable and accurately represented.",
    steps: [
      "Confirm your public listing shows correct EIN, mission, and service area.",
      "Request trusted review if you meet curation standards for the Trusted Resources lane.",
      "Use official podcast or sponsor application paths for media and partnership inquiries.",
      "Encourage clients to share community stories only with consent and program rules respected.",
    ],
    why:
      "Participation is partnership, not pay-to-rank. Clarity and mission fit keep the community’s trust high.",
  },
  {
    id: FOUNDER_ONBOARDING_POST_IDS.guidelinesMission,
    author_name: "Josh & Hodge",
    hoursAgo: HOURS_AGO[10],
    like_count: 52,
    layout: "step",
    post_type: "platform_guide",
    title: "Community guidelines",
    photo_url: coverImage("/home/home-header-mountain-patriotic.png"),
    link_url: cta("/community", "Read the Community feed"),
    intro:
      "The Outreach Project exists to make trusted support easier to find—and to celebrate organizations doing the work.",
    steps: [
      "Be respectful and specific. No harassment, hate, or fundraising spam.",
      "Share lived experience and verified resources—avoid medical or legal claims we cannot substantiate.",
      "Protect privacy: do not post someone else’s personal details without consent.",
      "Moderators may request edits or decline posts that risk harm or misinformation.",
    ],
    why:
      "A mission-driven community only works when members feel safe showing up. These rules protect the people who need this space most.",
  },
];

function feedMediaJson(def) {
  return JSON.stringify({
    caption: def.mediaCaption || "",
    imageAlt: def.imageAlt || def.title || "",
    slides: def.carouselSlides || [],
    resource: def.resource || null,
  });
}

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
    category: "platform_guide",
    post_type: def.post_type,
    feed_layout: def.layout,
    feed_media_json: feedMediaJson(def),
    show_author_name: true,
    link_url: def.link_url,
    photo_url: def.photo_url,
    status: "approved",
    visibility: "community",
    like_count: def.like_count,
    share_count: 0,
    reviewed_by: "founder-onboarding-v09",
    reviewed_at: createdAtHoursAgo(def.hoursAgo - 1),
    published_at: createdAtHoursAgo(def.hoursAgo - 1),
    is_edited: false,
    is_demo_seed: false,
  }));
}

export const FOUNDER_ONBOARDING_POSTS = buildFounderOnboardingPostRows();
