/**
 * Admin platform navigation — single source of truth for routes, IA, and readiness.
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
 * @property {AdminNavItem[]} [children]
 * @property {string[]} [keywords]
 * @property {boolean} [futureModule]
 * @property {boolean} [exact]
 * @property {string} [group]
 */

/** Primary horizontal admin nav — always visible beneath site header. */
/** @type {AdminNavItem[]} */
export const ADMIN_HORIZONTAL_NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin",
    readiness: "production",
    matchPrefix: "/admin",
    exact: true,
    keywords: ["home", "overview", "command center", "stats"],
    description: "Platform overview, quick links, and activity.",
  },
  {
    id: "homepage",
    label: "Homepage Content",
    href: "/admin/content",
    readiness: "production",
    matchPrefix: "/admin/content",
    keywords: ["carousel", "featured sponsors", "hero", "home"],
    description: "Homepage sponsors, featured cards, and hub settings.",
  },
  {
    id: "community",
    label: "Community Page",
    href: "/admin/community",
    readiness: "production",
    matchPrefix: "/admin/community",
    keywords: ["posts", "moderation", "stories", "feed"],
    description: "Community posts, moderation queue, and staff publishing.",
  },
  {
    id: "nonprofits",
    label: "Nonprofit Directory",
    href: "/admin/nonprofits",
    readiness: "partial",
    matchPrefix: "/admin/nonprofits",
    keywords: ["ein", "directory", "orgs", "header image"],
    description: "Nonprofit directory enrichment and header images.",
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
    id: "podcast",
    label: "Podcast / Media",
    href: "/admin/podcasts",
    readiness: "production",
    matchPrefix: "/admin/podcasts",
    keywords: ["episodes", "guests", "youtube", "media", "video"],
    description: "Podcast episodes, guests, and media overrides.",
  },
  {
    id: "membership",
    label: "Membership Content",
    href: "/admin/membership",
    readiness: "production",
    matchPrefix: "/admin/membership",
    keywords: ["tiers", "pricing", "pro", "support", "plans"],
    description: "Membership tiers, copy, and subscription settings.",
  },
  {
    id: "sponsors",
    label: "Sponsor Content",
    href: "/admin/sponsors",
    readiness: "production",
    matchPrefix: "/admin/sponsors",
    keywords: ["catalog", "logos", "packages", "sponsorship"],
    description: "Sponsor catalog, logos, categories, and packages.",
  },
  {
    id: "users",
    label: "Users & Profiles",
    href: "/admin/users",
    readiness: "production",
    matchPrefix: "/admin/users",
    keywords: ["accounts", "roles", "members", "profiles"],
    description: "Search users, roles, and account administration.",
  },
  {
    id: "billing",
    label: "Billing & Revenue",
    href: "/admin/billing",
    readiness: "production",
    matchPrefix: "/admin/billing",
    keywords: ["stripe", "invoices", "revenue", "forecast", "payments"],
    description: "Billing operations, invoices, and revenue tools.",
  },
  {
    id: "media-library",
    label: "Media Library",
    href: "/admin/media-library",
    readiness: "production",
    matchPrefix: "/admin/media-library",
    keywords: ["images", "uploads", "assets", "files"],
    description: "Upload images and copy URLs for site content.",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
    readiness: "partial",
    matchPrefix: "/admin/settings",
    keywords: ["config", "platform", "admin access"],
    description: "Platform settings and admin configuration.",
  },
];

/** Secondary items — grouped under “More” on narrow viewports. */
/** @type {AdminNavItem[]} */
export const ADMIN_MORE_NAV = [
  {
    id: "content-blocks",
    label: "Page content blocks",
    href: "/admin/content/blocks",
    readiness: "production",
    matchPrefix: "/admin/content/blocks",
    keywords: ["copy", "about", "footer", "text blocks"],
    group: "content",
  },
  {
    id: "content-create",
    label: "Create content",
    href: "/admin/content/create",
    readiness: "production",
    matchPrefix: "/admin/content/create",
    keywords: ["wizard", "new content"],
    group: "content",
  },
  {
    id: "page-images",
    label: "Page images & banners",
    href: "/admin/images",
    readiness: "production",
    matchPrefix: "/admin/images",
    keywords: ["banners", "backgrounds", "header images"],
    group: "content",
  },
  {
    id: "applications",
    label: "Sponsor applications",
    href: "/admin/applications",
    readiness: "production",
    matchPrefix: "/admin/applications",
    keywords: ["apply", "sponsorship forms"],
    group: "sponsors",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/admin/analytics",
    readiness: "production",
    matchPrefix: "/admin/analytics",
    keywords: ["metrics", "growth", "reports"],
    group: "operations",
  },
  {
    id: "operations",
    label: "Operations hub",
    href: "/admin/operations",
    readiness: "production",
    matchPrefix: "/admin/operations",
    keywords: ["ops", "inbox"],
    group: "operations",
  },
  {
    id: "contact",
    label: "Contact inbox",
    href: "/admin/contact",
    readiness: "production",
    matchPrefix: "/admin/contact",
    keywords: ["messages", "support"],
    group: "operations",
  },
  {
    id: "forms",
    label: "Form submissions",
    href: "/admin/forms",
    readiness: "production",
    matchPrefix: "/admin/forms",
    keywords: ["submissions", "inquiries"],
    group: "operations",
  },
  {
    id: "advanced",
    label: "Advanced tools",
    href: "/admin/advanced",
    readiness: "production",
    matchPrefix: "/admin/advanced",
    keywords: ["diagnostics", "status"],
    group: "operations",
  },
  {
    id: "status",
    label: "System status",
    href: "/admin/status",
    readiness: "production",
    matchPrefix: "/admin/status",
    keywords: ["health", "counts"],
    group: "operations",
  },
];

/** @type {AdminNavItem[]} */
export const ADMIN_NAV_SECTIONS = [
  ...ADMIN_HORIZONTAL_NAV.filter((item) => item.id !== "dashboard"),
  {
    id: "content",
    label: "Content tools",
    href: "/admin/content",
    readiness: "production",
    matchPrefix: "/admin/content",
    children: ADMIN_MORE_NAV.filter((i) => i.group === "content"),
  },
  {
    id: "operations",
    label: "Operations",
    href: "/admin/operations",
    readiness: "production",
    matchPrefix: "/admin/operations",
    children: ADMIN_MORE_NAV.filter((i) => i.group === "operations"),
  },
];

/** Flat list for search (all routes). */
export function flattenAdminNav(items = [...ADMIN_HORIZONTAL_NAV, ...ADMIN_MORE_NAV], sectionLabel = "") {
  /** @type {Array<AdminNavItem & { sectionLabel: string, searchLabel: string }>} */
  const out = [];
  for (const item of items) {
    const sec = sectionLabel || item.label;
    out.push({
      ...item,
      sectionLabel: sec,
      searchLabel: sectionLabel ? `${sectionLabel} › ${item.label}` : item.label,
    });
    if (item.children?.length) {
      out.push(...flattenAdminNav(item.children, sec));
    }
  }
  return out;
}

export function isAdminNavItemActive(pathname, item) {
  const href = item.href.split("#")[0];
  const prefix = item.matchPrefix || href;
  if (item.exact || href === "/admin") {
    return pathname === "/admin" || pathname === href;
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${prefix}/`) || (prefix !== "/admin" && pathname.startsWith(prefix));
}

export function matchAdminNavPath(pathname) {
  const flat = flattenAdminNav();
  let best = flat.find((i) => {
    const href = i.href.split("#")[0];
    return pathname === href || pathname === i.href;
  });
  if (best) return best;
  best = flat
    .filter((i) => isAdminNavItemActive(pathname, i))
    .sort((a, b) => (b.matchPrefix || b.href).length - (a.matchPrefix || a.href).length)[0];
  return best || flat[0];
}

export function adminBreadcrumbs(pathname) {
  const crumbs = [{ label: "Admin", href: "/admin" }];
  const match = matchAdminNavPath(pathname);
  if (match && match.href !== "/admin") {
    crumbs.push({ label: match.label, href: match.href.split("#")[0] });
  }
  if (pathname !== match?.href && pathname.startsWith("/admin/")) {
    const tail = pathname.replace(match?.matchPrefix || "/admin", "").split("/").filter(Boolean);
    if (tail.length > 1) {
      crumbs.push({ label: tail[tail.length - 1].replace(/-/g, " "), href: pathname });
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
