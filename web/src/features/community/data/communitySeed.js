/** Demo members, follows, and approved feed seed — mission-aligned, positive tone. */

export const COMMUNITY_MEMBERS_SEED = [
  {
    id: "member-maya",
    name: "Maya Chen",
    role: "Army veteran",
    initials: "MC",
    tagline: "Found housing support through a local partner",
  },
  {
    id: "member-james",
    name: "James Ortiz",
    role: "Firefighter",
    initials: "JO",
    tagline: "Peer counseling after a tough season",
  },
  {
    id: "member-sarah",
    name: "Sarah Kim",
    role: "Military spouse",
    initials: "SK",
    tagline: "Connected to career resources",
  },
  {
    id: "member-david",
    name: "David Brooks",
    role: "EMS",
    initials: "DB",
    tagline: "Wellness program graduate",
  },
];

/** follower_id follows following_id */
export const COMMUNITY_FOLLOWS_SEED = [
  { followerId: "member-james", followingId: "member-maya" },
  { followerId: "member-sarah", followingId: "member-maya" },
  { followerId: "member-maya", followingId: "member-david" },
  { followerId: "member-david", followingId: "member-james" },
];

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
    show_author_name: true,
    link_url: "",
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
    show_author_name: true,
    link_url: "",
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
    show_author_name: true,
    link_url: "",
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

