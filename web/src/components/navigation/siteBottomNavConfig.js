/**
 * Fixed-order bottom dock (Home · Trusted · Community · Podcast · Contact).
 * Shared by TopApp and AppShell so tab positions never swap across routes.
 */

/** @typedef {{ key: string, href: string, label: string, linkTitle?: string }} SiteBottomNavItem */

/** @type {SiteBottomNavItem[]} */
export const SITE_MOBILE_DOCK_ITEMS = [
  { key: "home", href: "/", label: "Home", linkTitle: "Home" },
  { key: "trusted", href: "/trusted", label: "Trusted", linkTitle: "Trusted Resources" },
  { key: "community", href: "/community", label: "Community", linkTitle: "Community" },
  { key: "podcast", href: "/podcasts", label: "Podcast", linkTitle: "Podcast" },
  { key: "contact", href: "/contact", label: "Contact", linkTitle: "Contact" },
];

export const SITE_MOBILE_DOCK_KEYS = new Set(SITE_MOBILE_DOCK_ITEMS.map((item) => item.key));

/** TopApp in-tab keys that can switch via `setNav` when pathname is `/`. */
export const SITE_TOP_APP_DOCK_TAB_KEYS = new Set(["home", "trusted", "community", "contact"]);

/**
 * @param {string} navKey
 * @param {{ nav?: string, pathname?: string | null }} ctx
 */
export function isSiteDockNavActive(navKey, { nav = "", pathname = "" } = {}) {
  const path = String(pathname || "");
  const tab = String(nav || "");
  switch (navKey) {
    case "home":
      return (
        tab === "home" &&
        path !== "/community" &&
        path !== "/contact" &&
        !path.startsWith("/trusted") &&
        !path.startsWith("/podcasts")
      );
    case "trusted":
      return tab === "trusted" || path.startsWith("/trusted");
    case "community":
      return tab === "community" || path.startsWith("/community");
    case "podcast":
      return tab === "podcast" || path.startsWith("/podcasts");
    case "contact":
      return tab === "contact" || path.startsWith("/contact");
    default:
      return tab === navKey;
  }
}
