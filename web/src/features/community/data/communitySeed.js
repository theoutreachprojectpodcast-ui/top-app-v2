/** Demo members, follows, and approved feed seed — mission-aligned, positive tone. */

function svgAvatarData(bg, fg, initials) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='${bg}'/><circle cx='80' cy='64' r='28' fill='${fg}' opacity='0.25'/><text x='50%' y='58%' dominant-baseline='middle' text-anchor='middle' font-family='Segoe UI, Arial, sans-serif' font-size='42' fill='${fg}' font-weight='700'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function svgPhotoData(a, b, label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${a}'/><stop offset='100%' stop-color='${b}'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><rect x='56' y='56' width='1088' height='588' rx='18' fill='rgba(7,10,14,0.34)' stroke='rgba(236,238,241,0.22)'/><text x='76' y='118' font-family='Segoe UI, Arial, sans-serif' font-size='38' fill='rgba(255,255,255,0.88)' font-weight='700'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const COMMUNITY_MEMBERS_SEED = [
  {
    id: "member-maya",
    name: "Maya Chen",
    role: "Army veteran",
    initials: "MC",
    tagline: "Found housing support through a local partner",
    avatar_url: svgAvatarData("#27464f", "#f3d89d", "MC"),
    bio: "Transitioned from active duty and now volunteers to help families navigate housing support resources.",
    location: "Pittsburgh, PA",
    favoriteEins: ["251096080", "231352616"],
  },
  {
    id: "member-james",
    name: "James Ortiz",
    role: "Firefighter",
    initials: "JO",
    tagline: "Peer counseling after a tough season",
    avatar_url: svgAvatarData("#4a3432", "#f4d08f", "JO"),
    bio: "Career firefighter focused on peer support, resilience routines, and practical referral pathways.",
    location: "Cleveland, OH",
    favoriteEins: ["541304306", "521244157"],
  },
  {
    id: "member-sarah",
    name: "Sarah Kim",
    role: "Military spouse",
    initials: "SK",
    tagline: "Connected to career resources",
    avatar_url: svgAvatarData("#2f3551", "#d7e5ff", "SK"),
    bio: "Military spouse advocating for family-centered employment and mentorship resources.",
    location: "San Diego, CA",
    favoriteEins: ["742231049"],
  },
  {
    id: "member-david",
    name: "David Brooks",
    role: "EMS",
    initials: "DB",
    tagline: "Wellness program graduate",
    avatar_url: svgAvatarData("#314336", "#d0efca", "DB"),
    bio: "EMS professional sharing wellness tools and recovery pathways for shift-based service teams.",
    location: "Nashville, TN",
    favoriteEins: [],
  },
  {
    id: "member-renee",
    name: "Renee Walters",
    role: "Navy veteran",
    initials: "RW",
    tagline: "Helping peers navigate family services",
    avatar_url: svgAvatarData("#4a3c2c", "#f7deb8", "RW"),
    bio: "Navy veteran connecting families to child care, counseling, and education programs.",
    location: "Norfolk, VA",
    favoriteEins: ["521244157"],
  },
  {
    id: "member-omar",
    name: "Omar Patel",
    role: "Paramedic",
    initials: "OP",
    tagline: "Sharing local wellness resources",
    avatar_url: svgAvatarData("#243a45", "#b9e5f2", "OP"),
    bio: "Paramedic and community advocate focused on preventative wellness and support continuity.",
    location: "Phoenix, AZ",
    favoriteEins: ["251096080"],
  },
];

/** follower_id follows following_id */
export const COMMUNITY_FOLLOWS_SEED = [
  { followerId: "member-james", followingId: "member-maya" },
  { followerId: "member-sarah", followingId: "member-maya" },
  { followerId: "member-maya", followingId: "member-david" },
  { followerId: "member-david", followingId: "member-james" },
];

export const COMMUNITY_MEMBER_FAVORITE_ROWS_SEED = {
  "251096080": {
    ein: "251096080",
    org_name: "Veterans Wellness Collective",
    city: "Pittsburgh",
    state: "PA",
    ntee_code: "E",
    nonprofit_type: "Health & Wellness",
    is_trusted: true,
  },
  "231352616": {
    ein: "231352616",
    org_name: "Frontline Family Housing Network",
    city: "Pittsburgh",
    state: "PA",
    ntee_code: "L",
    nonprofit_type: "Human Services",
  },
  "541304306": {
    ein: "541304306",
    org_name: "Responder Resilience Center",
    city: "Cleveland",
    state: "OH",
    ntee_code: "F",
    nonprofit_type: "Crisis Support / Emergency Services",
    is_trusted: true,
  },
  "521244157": {
    ein: "521244157",
    org_name: "Service Pathways Alliance",
    city: "Baltimore",
    state: "MD",
    ntee_code: "P",
    nonprofit_type: "Human Services",
  },
  "742231049": {
    ein: "742231049",
    org_name: "Career Bridge for Military Families",
    city: "San Diego",
    state: "CA",
    ntee_code: "J",
    nonprofit_type: "Education",
  },
};

export const APPROVED_POSTS_SEED = [
  {
    id: "seed-post-1",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    author_id: "member-maya",
    author_name: "Maya Chen",
    author_avatar_url: "",
    title: "A door opened when I needed it",
    body:
      "I was hesitant to reach out, but a nonprofit on this directory helped me navigate housing assistance after transition. The process was respectful and practical—I finally felt like someone was in my corner.",
    nonprofit_ein: null,
    nonprofit_name: "Local veteran housing initiative",
    category: "success_story",
    post_type: "share_story",
    show_author_name: true,
    link_url: "",
    photo_url: svgPhotoData("#1f4853", "#2d6b7a", "Veteran Housing Support"),
    status: "approved",
    like_count: 24,
    share_count: 3,
  },
  {
    id: "seed-post-2",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    author_id: "member-james",
    author_name: "James Ortiz",
    author_avatar_url: "",
    title: "",
    body:
      "Sharing this in case it helps someone else: I used a peer support line listed here and followed up with a counseling nonprofit. Small steps, but I am in a better place today.",
    nonprofit_ein: null,
    nonprofit_name: "Peer support & counseling",
    category: "resource_help",
    post_type: "recommend_resource",
    show_author_name: true,
    link_url: "",
    photo_url: svgPhotoData("#4f3a31", "#8a5a47", "Peer Counseling Follow-Up"),
    status: "approved",
    like_count: 18,
    share_count: 1,
  },
  {
    id: "seed-post-3",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    author_id: "member-sarah",
    author_name: "Sarah Kim",
    author_avatar_url: "",
    title: "Grateful for clarity",
    body:
      "The Outreach Project helped our family find credible organizations instead of random search results. We connected with a career readiness program that understood military life.",
    nonprofit_ein: null,
    nonprofit_name: "Career readiness nonprofit",
    category: "thank_you",
    post_type: "success_story",
    show_author_name: true,
    link_url: "",
    photo_url: svgPhotoData("#2d3b63", "#4f6eae", "Career Readiness Milestone"),
    status: "approved",
    like_count: 31,
    share_count: 5,
  },
];

export const STORY_CATEGORIES = [
  ["success_story", "Success story"],
  ["resource_help", "Found support / resources"],
  ["thank_you", "Thank you / encouragement"],
  ["nonprofit_impact", "Nonprofit impact"],
  ["milestone", "Personal milestone"],
];

export const SUBMISSION_TYPES = [
  ["share_story", "Share Your Story"],
  ["review_nonprofit", "Review a Nonprofit"],
  ["submit_feedback", "Submit Feedback"],
  ["success_story", "Share a Success Story"],
  ["recommend_resource", "Recommend a Resource"],
  ["community_update", "Community Encouragement / Update"],
];

