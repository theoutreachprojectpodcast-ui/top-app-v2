/** Demo members, follows, and approved feed seed — mission-aligned, positive tone. */

/** Stock portrait crops (real photography) — replace with consent-based uploads when media pipeline is live. */
function portraitPhoto(path) {
  return `https://images.unsplash.com/${path}?auto=format&w=256&h=256&fit=crop&crop=faces&q=80`;
}

export const COMMUNITY_MEMBERS_SEED = [
  {
    id: "member-maya",
    name: "Maya Chen",
    role: "Army veteran",
    initials: "MC",
    tagline: "Found housing support through a local partner",
    avatar_url: portraitPhoto("photo-1573496359142-b8d87734a5a2"),
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
    avatar_url: portraitPhoto("photo-1500648767791-00dcc994a43e"),
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
    avatar_url: portraitPhoto("photo-1580489944761-15a19d654956"),
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
    avatar_url: portraitPhoto("photo-1506794778202-cad84cf45f1d"),
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
    avatar_url: portraitPhoto("photo-1438761681033-6461ffad8d80"),
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
    avatar_url: portraitPhoto("photo-1472099645785-5658abf4ff4e"),
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
    photo_url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&w=900&h=500&fit=crop&q=78",
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
    photo_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&w=900&h=500&fit=crop&q=78",
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
    photo_url: "https://images.unsplash.com/photo-1529154166925-ef57fc42dd55?auto=format&w=900&h=500&fit=crop&q=78",
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

