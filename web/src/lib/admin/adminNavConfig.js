/**
 * Admin platform navigation — hybrid IA: top section tabs + left subnav.
 * readiness: production | partial | placeholder | redirect
 */

/** @typedef {'production' | 'partial' | 'placeholder' | 'redirect'} AdminReadiness */

/**
 * @typedef {Object} AdminNavItem
 * @property {string} id
 * @property {string} label
 * @property {string} href
 * @property {AdminReadiness} readiness
 * @property {string} [description]
 * @property {string} [matchPrefix]
 * @property {boolean} [exact]
 * @property {string[]} [keywords]
 */

/**
 * @typedef {Object} AdminNavSection
 * @property {string} id
 * @property {string} label
 * @property {string} href
 * @property {AdminNavItem[]} items
 */

/** @type {AdminNavSection[]} */
export const ADMIN_SECTIONS = [
  {
    id: "overview",
    label: "Overview",
    href: "/admin",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/admin",
        readiness: "production",
        exact: true,
        matchPrefix: "/admin",
        keywords: ["home", "overview", "command center", "stats", "dashboard"],
        description: "What needs attention, recent activity, and quick actions.",
      },
    ],
  },
  {
    id: "content",
    label: "Content",
    href: "/admin/content",
    items: [
      {
        id: "home",
        label: "Home",
        href: "/admin/content",
        readiness: "production",
        exact: true,
        matchPrefix: "/admin/content",
        keywords: ["carousel", "featured sponsors", "hero", "home", "homepage"],
        description: "Homepage sponsors, featured cards, and hub settings.",
      },
      {
        id: "community",
        label: "Community",
        href: "/admin/community",
        readiness: "production",
        matchPrefix: "/admin/community",
        keywords: ["posts", "moderation", "stories", "feed", "connections"],
        description: "Community posts, moderation, posting mode, and member activity.",
      },
      {
        id: "podcasts",
        label: "Podcasts",
        href: "/admin/podcasts",
        readiness: "production",
        matchPrefix: "/admin/podcasts",
        keywords: ["episodes", "guests", "youtube", "media", "video"],
        description: "Podcast episodes, guests, and media overrides.",
      },
      {
        id: "trusted",
        label: "Trusted Resources",
        href: "/admin/trusted",
        readiness: "production",
        matchPrefix: "/admin/trusted",
        keywords: ["partners", "resources", "links", "trusted"],
        description: "Trusted partner listings and resource details.",
      },
      {
        id: "sponsors",
        label: "Sponsors",
        href: "/admin/sponsors",
        readiness: "production",
        matchPrefix: "/admin/sponsors",
        keywords: ["catalog", "logos", "packages", "sponsorship"],
        description: "Sponsor catalog, branding, and packages.",
      },
      {
        id: "directory",
        label: "Nonprofit Directory",
        href: "/admin/nonprofits",
        readiness: "partial",
        matchPrefix: "/admin/nonprofits",
        keywords: ["ein", "directory", "orgs", "header image", "irs", "501c19", "import"],
        description: "Directory enrichment, IRS EO BMF import review, and import logs.",
      },
      {
        id: "benefits",
        label: "Benefits",
        href: "/admin/benefits",
        readiness: "partial",
        matchPrefix: "/admin/benefits",
        keywords: ["benefits", "discounts", "agents", "research", "review", "savings"],
        description: "Benefits research agents, evidence review, and unpublished catalog drafts.",
      },
      {
        id: "content-blocks",
        label: "Page blocks",
        href: "/admin/content/blocks",
        readiness: "production",
        matchPrefix: "/admin/content/blocks",
        keywords: ["copy", "about", "footer", "text blocks"],
        description: "Reusable page copy blocks across the site.",
      },
      {
        id: "page-images",
        label: "Images & banners",
        href: "/admin/images",
        readiness: "production",
        matchPrefix: "/admin/images",
        keywords: ["banners", "backgrounds", "header images"],
        description: "Page and section banners and backgrounds.",
      },
      {
        id: "media-library",
        label: "Media library",
        href: "/admin/media-library",
        readiness: "production",
        matchPrefix: "/admin/media-library",
        keywords: ["images", "uploads", "assets", "files"],
        description: "Upload images and copy URLs for site content.",
      },
      {
        id: "content-create",
        label: "Create content",
        href: "/admin/content/create",
        readiness: "production",
        matchPrefix: "/admin/content/create",
        keywords: ["wizard", "new content"],
        description: "Guided draft wizard for new content.",
      },
    ],
  },
  {
    id: "users",
    label: "Users",
    href: "/admin/users",
    items: [
      {
        id: "members",
        label: "Members",
        href: "/admin/users",
        readiness: "production",
        matchPrefix: "/admin/users",
        keywords: ["accounts", "roles", "members", "profiles"],
        description: "Search members, roles, and account administration.",
      },
      {
        id: "memberships",
        label: "Memberships",
        href: "/admin/membership",
        readiness: "production",
        matchPrefix: "/admin/membership",
        keywords: ["tiers", "pricing", "pro", "support", "plans", "availability", "feature flag", "migration"],
        description: "Plan availability, Support→Pro migration, and membership stats.",
      },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    href: "/admin/billing",
    items: [
      {
        id: "billing",
        label: "Billing",
        href: "/admin/billing",
        readiness: "production",
        matchPrefix: "/admin/billing",
        keywords: ["stripe", "invoices", "revenue", "forecast", "payments"],
        description: "Billing operations, invoices, and revenue tools.",
      },
      {
        id: "bulk-licensing",
        label: "Bulk licensing",
        href: "/admin/bulk-licensing",
        readiness: "partial",
        matchPrefix: "/admin/bulk-licensing",
        keywords: ["bulk", "seats", "organization", "business code", "licenses"],
        description: "Organization packages, seat utilization, and support tools.",
      },
      {
        id: "applications",
        label: "Partner activity",
        href: "/admin/applications",
        readiness: "production",
        matchPrefix: "/admin/applications",
        keywords: ["apply", "sponsorship forms", "applications"],
        description: "Sponsor applications and partner inbox.",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    href: "/admin/analytics",
    items: [
      {
        id: "analytics",
        label: "Reports",
        href: "/admin/analytics",
        readiness: "production",
        matchPrefix: "/admin/analytics",
        keywords: ["metrics", "growth", "reports"],
        description: "Platform metrics and reporting snapshots.",
      },
      {
        id: "contact",
        label: "Contact inbox",
        href: "/admin/contact",
        readiness: "production",
        matchPrefix: "/admin/contact",
        keywords: ["messages", "support"],
        description: "Contact routing and message submissions.",
      },
      {
        id: "forms",
        label: "Form submissions",
        href: "/admin/forms",
        readiness: "production",
        matchPrefix: "/admin/forms",
        keywords: ["submissions", "inquiries"],
        description: "Generic form submission inbox.",
      },
      {
        id: "settings",
        label: "Site settings",
        href: "/admin/settings",
        readiness: "partial",
        matchPrefix: "/admin/settings",
        keywords: ["config", "platform", "admin access"],
        description: "Platform settings and admin configuration.",
      },
      {
        id: "advanced",
        label: "Integrations & tools",
        href: "/admin/advanced",
        readiness: "production",
        matchPrefix: "/admin/advanced",
        keywords: ["diagnostics", "status", "integrations"],
        description: "Diagnostics, system status, and secondary tools.",
      },
      {
        id: "operations-hub",
        label: "Operations hub",
        href: "/admin/operations",
        readiness: "production",
        matchPrefix: "/admin/operations",
        keywords: ["ops", "inbox"],
        description: "Quick links into contact, forms, and advanced tools.",
      },
    ],
  },
];

/** Flat list of all leaf nav items (search, matching). */
export function flattenAdminNav(sections = ADMIN_SECTIONS) {
  /** @type {Array<AdminNavItem & { sectionId: string, sectionLabel: string, searchLabel: string }>} */
  const out = [];
  for (const section of sections) {
    for (const item of section.items) {
      out.push({
        ...item,
        sectionId: section.id,
        sectionLabel: section.label,
        searchLabel: `${section.label} › ${item.label}`,
      });
    }
  }
  return out;
}

/** @deprecated Prefer flattenAdminNav() / ADMIN_SECTIONS — kept for older imports. */
export const ADMIN_HORIZONTAL_NAV = flattenAdminNav().map(({ sectionId, sectionLabel, searchLabel, ...item }) => item);

/** @deprecated Prefer ADMIN_SECTIONS — empty; More menu replaced by section subnav. */
export const ADMIN_MORE_NAV = [];

/** @deprecated Prefer ADMIN_SECTIONS */
export const ADMIN_NAV_SECTIONS = ADMIN_SECTIONS;

export function isAdminNavItemActive(pathname, item) {
  const path = String(pathname || "").split("?")[0] || "";
  const href = String(item.href || "").split("#")[0];
  if (item.exact || href === "/admin") {
    return path === href || (href === "/admin" && path === "/admin");
  }
  if (path === href) return true;
  const prefix = item.matchPrefix || href;
  return path.startsWith(`${prefix}/`);
}

export function findAdminSectionForPath(pathname) {
  const path = String(pathname || "").split("?")[0] || "";
  const match = matchAdminNavPath(path);
  if (match?.sectionId) {
    return ADMIN_SECTIONS.find((s) => s.id === match.sectionId) || ADMIN_SECTIONS[0];
  }
  // Fallback: longest matching item prefix across sections
  for (const section of ADMIN_SECTIONS) {
    for (const item of section.items) {
      if (isAdminNavItemActive(path, item)) return section;
    }
  }
  return ADMIN_SECTIONS[0];
}

export function matchAdminNavPath(pathname) {
  const path = String(pathname || "").split("?")[0] || "";
  const flat = flattenAdminNav();
  let best = flat.find((i) => {
    const href = i.href.split("#")[0];
    return path === href;
  });
  if (best) return best;
  best = flat
    .filter((i) => isAdminNavItemActive(path, i))
    .sort((a, b) => {
      const aLen = (a.matchPrefix || a.href).length + (a.exact ? 1000 : 0);
      const bLen = (b.matchPrefix || b.href).length + (b.exact ? 1000 : 0);
      return bLen - aLen;
    })[0];
  return best || flat[0];
}

export function isAdminSectionActive(pathname, section) {
  const match = matchAdminNavPath(pathname);
  return match?.sectionId === section.id;
}

export function adminBreadcrumbs(pathname) {
  const crumbs = [{ label: "Admin", href: "/admin" }];
  const section = findAdminSectionForPath(pathname);
  const match = matchAdminNavPath(pathname);
  if (section && section.id !== "overview") {
    crumbs.push({ label: section.label, href: section.href });
  }
  if (match && match.href !== "/admin" && match.label) {
    const last = crumbs[crumbs.length - 1];
    if (!last || last.href !== match.href.split("#")[0]) {
      crumbs.push({ label: match.label, href: match.href.split("#")[0] });
    }
  }
  return crumbs;
}

/** Future module slots (not built — nav metadata only). */
export const ADMIN_FUTURE_MODULES = [
  "Events",
  "Fundraising",
  "Donations",
  "Volunteer management",
  "Partner management",
  "Courses",
  "Learning center",
  "Job board",
  "Marketplace",
];
