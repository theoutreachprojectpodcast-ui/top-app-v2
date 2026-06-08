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
 */

/** @type {AdminNavItem[]} */
export const ADMIN_NAV_SECTIONS = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin",
    readiness: "production",
    matchPrefix: "/admin",
    keywords: ["home", "overview", "command"],
  },
  {
    id: "content",
    label: "Content",
    href: "/admin/content",
    readiness: "production",
    matchPrefix: "/admin/content",
    keywords: ["cms", "pages", "create"],
    children: [
      { id: "content-manager", label: "Content Manager", href: "/admin/content", readiness: "production", keywords: ["hub"] },
      { id: "content-create", label: "Create content", href: "/admin/content/create", readiness: "production", keywords: ["wizard", "new"] },
      { id: "content-blocks", label: "Page content blocks", href: "/admin/content/blocks", readiness: "production", keywords: ["copy", "about", "footer"] },
      { id: "content-homepage", label: "Homepage settings", href: "/admin/content", readiness: "production", keywords: ["carousel", "featured"] },
      { id: "content-sponsors", label: "Sponsors page", href: "/admin/sponsors", readiness: "production" },
      { id: "content-community", label: "Community", href: "/admin/community", readiness: "production" },
      { id: "content-podcast", label: "Podcast", href: "/admin/podcasts", readiness: "production" },
      { id: "content-trusted", label: "Trusted resources", href: "/admin/trusted", readiness: "production" },
      { id: "content-nonprofit", label: "Nonprofit directory", href: "/admin/nonprofits", readiness: "partial" },
      { id: "content-images", label: "Page images & banners", href: "/admin/images", readiness: "production" },
      { id: "content-announcements", label: "Site announcements", href: "/admin/content/announcements", readiness: "placeholder", futureModule: true },
    ],
  },
  {
    id: "users",
    label: "Users",
    href: "/admin/users",
    readiness: "production",
    matchPrefix: "/admin/users",
    keywords: ["members", "accounts", "roles"],
  },
  {
    id: "membership",
    label: "Memberships",
    href: "/admin/membership",
    readiness: "production",
    matchPrefix: "/admin/membership",
    keywords: ["tiers", "subscriptions", "pro", "support"],
  },
  {
    id: "billing",
    label: "Billing",
    href: "/admin/billing",
    readiness: "production",
    matchPrefix: "/admin/billing",
    keywords: ["revenue", "stripe", "invoices", "forecast"],
    children: [
      { id: "billing-ops", label: "Revenue & operations", href: "/admin/billing", readiness: "production" },
      { id: "billing-invoices", label: "Invoice tools", href: "/admin/billing#invoices", readiness: "production" },
    ],
  },
  {
    id: "sponsors",
    label: "Sponsors",
    href: "/admin/sponsors",
    readiness: "production",
    matchPrefix: "/admin/sponsors",
    children: [
      { id: "sponsors-catalog", label: "Sponsor catalog", href: "/admin/sponsors", readiness: "production" },
      { id: "sponsors-apps", label: "Sponsorship applications", href: "/admin/applications", readiness: "production" },
    ],
  },
  {
    id: "community",
    label: "Community",
    href: "/admin/community",
    readiness: "production",
    matchPrefix: "/admin/community",
  },
  {
    id: "podcast",
    label: "Podcast",
    href: "/admin/podcasts",
    readiness: "production",
    matchPrefix: "/admin/podcasts",
  },
  {
    id: "resources",
    label: "Resources",
    href: "/admin/trusted",
    readiness: "production",
    matchPrefix: "/admin/trusted",
    children: [
      { id: "resources-trusted", label: "Trusted resources", href: "/admin/trusted", readiness: "production" },
      { id: "resources-directory", label: "Nonprofit directory (EIN)", href: "/admin/nonprofits", readiness: "partial" },
    ],
  },
  {
    id: "media",
    label: "Media Library",
    href: "/admin/media-library",
    readiness: "production",
    matchPrefix: "/admin/media-library",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/admin/analytics",
    readiness: "production",
    matchPrefix: "/admin/analytics",
  },
  {
    id: "operations",
    label: "Operations",
    href: "/admin/operations",
    readiness: "production",
    matchPrefix: "/admin/operations",
    children: [
      { id: "ops-contact", label: "Contact & inbox", href: "/admin/contact", readiness: "production" },
      { id: "ops-forms", label: "Form submissions", href: "/admin/forms", readiness: "production" },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    href: "/admin/advanced",
    readiness: "production",
    matchPrefix: "/admin/advanced",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
    readiness: "partial",
    matchPrefix: "/admin/settings",
  },
];

/** Flat list for search */
export function flattenAdminNav(items = ADMIN_NAV_SECTIONS, sectionLabel = "") {
  /** @type {Array<AdminNavItem & { sectionLabel: string, searchLabel: string }>} */
  const out = [];
  for (const item of items) {
    const sec = sectionLabel || item.label;
    out.push({
      ...item,
      sectionLabel: sec,
      searchLabel: `${sec} › ${item.label}`,
    });
    if (item.children?.length) {
      out.push(...flattenAdminNav(item.children, sec));
    }
  }
  return out;
}

export function matchAdminNavPath(pathname) {
  const flat = flattenAdminNav();
  let best = flat.find((i) => i.href === pathname);
  if (best) return best;
  best = flat
    .filter((i) => pathname.startsWith(i.matchPrefix || i.href))
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
