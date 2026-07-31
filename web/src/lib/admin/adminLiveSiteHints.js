/** Live-site mapping for admin panels — where saved content appears on production. */

/** @typedef {{ title: string, description: string, liveHint: string, readiness?: string }} AdminLiveSiteMeta */

/** @type {Record<string, AdminLiveSiteMeta>} */
export const ADMIN_LIVE_SITE_HINTS = {
  dashboard: {
    title: "Overview",
    description: "See what needs attention, jump into common edits, and scan recent activity.",
    liveHint: "Internal only — section admins publish to theoutreachproject.app.",
  },
  homepage: {
    title: "Home",
    description: "Controls the public homepage carousel, featured sponsors, and hub settings.",
    liveHint: "Home page at https://theoutreachproject.app/",
  },
  sponsors: {
    title: "Sponsors",
    description: "Edit sponsor branding, links, offers, and publish visibility.",
    liveHint: "https://theoutreachproject.app/sponsors and /sponsors/[slug]",
  },
  community: {
    title: "Community",
    description: "Create posts, moderate the feed, and pin important updates.",
    liveHint: "https://theoutreachproject.app/community",
  },
  trusted: {
    title: "Trusted Resources",
    description: "Partner listings members use for real-world help.",
    liveHint: "https://theoutreachproject.app/trusted",
  },
  nonprofits: {
    title: "Nonprofit Directory",
    description: "Enrich organization details, review IRS EO BMF imports (501(c)(19)), and manage directory visibility.",
    liveHint: "Directory and profiles at /nonprofit/[ein]",
    readiness: "partial",
  },
  podcast: {
    title: "Podcasts",
    description: "Episodes, guests, applications, and show media.",
    liveHint: "https://theoutreachproject.app/podcasts",
  },
  membership: {
    title: "Memberships",
    description: "Plan availability, Support→Pro migration, and membership counts.",
    liveHint: "Checkout and membership on profile and onboarding flows.",
  },
  users: {
    title: "Members",
    description: "Search accounts, roles, and membership fields.",
    liveHint: "Member profiles at /profile",
  },
  billing: {
    title: "Billing",
    description: "Revenue operations, forecasts, and invoice tools.",
    liveHint: "Live billing via Stripe Customer Portal and webhooks.",
  },
  "content-blocks": {
    title: "Page blocks",
    description: "Reusable copy for about, footer, membership, and related pages.",
    liveHint: "Approved blocks render on matching public pages.",
  },
  "page-images": {
    title: "Images & banners",
    description: "Section backgrounds and hero assets.",
    liveHint: "Active images appear on podcast, trusted, and other routed pages.",
  },
  "media-library": {
    title: "Media library",
    description: "Upload images and copy URLs into content editors.",
    liveHint: "Public media URLs render wherever referenced.",
  },
  contact: {
    title: "Contact inbox",
    description: "Messages submitted from the public contact form.",
    liveHint: "https://theoutreachproject.app/contact",
  },
  applications: {
    title: "Partner activity",
    description: "Review sponsorship applications from the public apply flow.",
    liveHint: "https://theoutreachproject.app/sponsors/apply",
  },
  forms: {
    title: "Form submissions",
    description: "Cross-form inbox for structured submissions.",
    liveHint: "Public apply and contact flows across the site.",
  },
  analytics: {
    title: "Reports",
    description: "Platform counts and growth snapshots.",
    liveHint: "Read-only metrics — does not change public pages.",
  },
  settings: {
    title: "Site settings",
    description: "Platform configuration. Homepage carousel settings also live under Content → Home.",
    liveHint: "Some settings affect live homepage behavior.",
    readiness: "partial",
  },
  status: {
    title: "System status",
    description: "Table counts and storage health checks.",
    liveHint: "Diagnostics only — no public surface.",
  },
  "content-create": {
    title: "Create content",
    description: "Guided wizard that drafts content, then routes you to the right editor.",
    liveHint: "Drafts become live after you publish in the destination section.",
  },
  operations: {
    title: "Operations hub",
    description: "Quick links into contact, forms, applications, and diagnostics.",
    liveHint: "Internal navigation only.",
  },
  advanced: {
    title: "Integrations & tools",
    description: "Diagnostics and secondary tools for operators.",
    liveHint: "Diagnostics only — not day-to-day content editing.",
  },
};

export function getAdminLiveSiteMeta(panelId) {
  return ADMIN_LIVE_SITE_HINTS[panelId] || null;
}
