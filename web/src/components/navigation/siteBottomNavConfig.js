/**
 * Fixed-order mobile bottom dock (Home · Profile · Podcast).
 * Shared by TopApp and AppShell so tab positions never swap across routes.
 */

/** @typedef {{ key: string, href: string, label: string, linkTitle?: string }} SiteBottomNavItem */

/** @type {SiteBottomNavItem[]} */
export const SITE_MOBILE_DOCK_ITEMS = [
  { key: "home", href: "/", label: "Home", linkTitle: "Home" },
  { key: "profile", href: "/profile", label: "Profile", linkTitle: "Profile" },
  { key: "podcast", href: "/podcasts", label: "Podcast", linkTitle: "Podcast" },
];

export const SITE_MOBILE_DOCK_KEYS = new Set(SITE_MOBILE_DOCK_ITEMS.map((item) => item.key));
