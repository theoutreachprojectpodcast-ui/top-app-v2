/** Live-site mapping for admin panels — where saved content appears on production. */

/** @typedef {{ title: string, description: string, liveHint: string }} AdminLiveSiteMeta */

/** @type {Record<string, AdminLiveSiteMeta>} */
export const ADMIN_LIVE_SITE_HINTS = {
  dashboard: {
    title: "Command center",
    description: "Overview of platform activity, quick actions, and operational metrics.",
    liveHint: "Internal only — links open public routes at theoutreachproject.app when you publish from section admins.",
  },
  homepage: {
    title: "Homepage content",
    description: "Mission Partners carousel settings and featured sponsor preview.",
    liveHint: "Home tab carousel and sponsor cards on https://theoutreachproject.app/ (featured + mission_partner rows in Sponsors admin).",
  },
  sponsors: {
    title: "Sponsor content",
    description: "Catalog, logos, descriptions, social links, and homepage featured flags.",
    liveHint: "https://theoutreachproject.app/sponsors and sponsor profile pages at /sponsors/[slug]; homepage carousel when featured.",
  },
  community: {
    title: "Community page content",
    description: "Moderate member posts, publish staff updates, and manage the public feed.",
    liveHint: "Approved posts appear on https://theoutreachproject.app/community (status approved, visibility community/public).",
  },
  trusted: {
    title: "Trusted resources",
    description: "Partner listings, logos, mission copy, and resource links.",
    liveHint: "https://theoutreachproject.app/trusted and detail pages at /trusted/[slug].",
  },
  nonprofits: {
    title: "Nonprofit directory",
    description: "EIN lookup enrichment and header image review for directory profiles.",
    liveHint: "Directory search and nonprofit profiles at https://theoutreachproject.app/nonprofit/[ein].",
  },
  podcast: {
    title: "Podcast & media",
    description: "Episodes, guest cards, upcoming guests, applications, and YouTube sync.",
    liveHint: "https://theoutreachproject.app/podcasts and guest pages under /podcasts/guests/[slug].",
  },
  membership: {
    title: "Membership content",
    description: "Membership tier analytics; per-user tier changes are on Users admin.",
    liveHint: "Membership checkout and tier copy on https://theoutreachproject.app/profile and onboarding flows (Stripe + torp_profiles).",
  },
  users: {
    title: "Users & profiles",
    description: "Search accounts, roles, suspension, invites, and membership fields.",
    liveHint: "Profile data on https://theoutreachproject.app/profile and auth-gated API routes (/api/me/profile).",
  },
  billing: {
    title: "Billing & revenue",
    description: "Stripe revenue operations, forecasts, and manual invoice tools.",
    liveHint: "Live billing state on member profiles and Stripe Customer Portal; webhook sync via /api/billing/webhook.",
  },
  "content-blocks": {
    title: "Page content blocks",
    description: "Universal copy store for footer, about, membership, and wizard drafts.",
    liveHint: "Blocks with status Approved render via /api/page-content on matching page_key + section_key (footer, contact, membership, etc.).",
  },
  "page-images": {
    title: "Page images & banners",
    description: "Section backgrounds and hero assets keyed by page and section.",
    liveHint: "Active rows served from /api/page-images and used on podcast, trusted, and other routed pages.",
  },
  "media-library": {
    title: "Media library",
    description: "Upload images to admin-media storage and copy public URLs into content fields.",
    liveHint: "Public URLs from admin-media bucket render wherever referenced in sponsors, trusted, community posts, and page images.",
  },
  contact: {
    title: "Contact inbox",
    description: "Messages submitted from the public contact form.",
    liveHint: "https://theoutreachproject.app/contact form submissions; success message from admin contact settings.",
  },
  applications: {
    title: "Sponsor applications",
    description: "Review sponsorship intake from the public apply flow.",
    liveHint: "Applications from https://theoutreachproject.app/sponsors/apply.",
  },
  forms: {
    title: "Form submissions",
    description: "Cross-form inbox for structured submissions.",
    liveHint: "Various public apply/contact flows across the site.",
  },
  analytics: {
    title: "Analytics",
    description: "Platform counts and growth snapshots.",
    liveHint: "Read-only metrics — does not change public pages.",
  },
  settings: {
    title: "Settings",
    description: "Platform configuration and admin access policies.",
    liveHint: "Homepage carousel timing and other settings APIs affect live homepage behavior.",
  },
  status: {
    title: "System status",
    description: "Table counts and storage health checks.",
    liveHint: "Diagnostics only — no public surface.",
  },
  "content-create": {
    title: "Create content",
    description: "Guided wizard that drafts into page_content_blocks then routes to section admins.",
    liveHint: "Draft blocks save to Supabase; set Approved on blocks or finish in the dedicated section admin for live pages.",
  },
};

export function getAdminLiveSiteMeta(panelId) {
  return ADMIN_LIVE_SITE_HINTS[panelId] || null;
}
