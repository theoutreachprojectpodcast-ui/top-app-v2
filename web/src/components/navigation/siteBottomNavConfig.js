/**
 * Fixed-order bottom dock (Home · Trusted · Profile · Community · Podcast).
 * Shared by TopApp and AppShell so tab positions never swap across routes.
 */

/** @typedef {{ key: string, href: string, label: string, linkTitle?: string }} SiteBottomNavItem */

/** @type {SiteBottomNavItem[]} */
export const SITE_MOBILE_DOCK_ITEMS = [
  { key: "home", href: "/", label: "Home", linkTitle: "Home" },
  { key: "trusted", href: "/trusted", label: "Trusted", linkTitle: "Trusted Resources" },
  { key: "profile", href: "/profile", label: "Profile", linkTitle: "Profile" },
  { key: "community", href: "/community", label: "Community", linkTitle: "Community" },
  { key: "podcast", href: "/podcasts", label: "Podcast", linkTitle: "Podcast" },
];

export const SITE_MOBILE_DOCK_KEYS = new Set(SITE_MOBILE_DOCK_ITEMS.map((item) => item.key));

/**
 * Complete site map for the header hamburger (mobile + desktop web).
 * Footer dock shows a subset; hamburger lists every primary destination.
 */
export const SITE_HAMBURGER_NAV_ITEMS = [
  { key: "home", href: "/", label: "Home", linkTitle: "Home" },
  { key: "trusted", href: "/trusted", label: "Trusted Resources", linkTitle: "Trusted Resources" },
  { key: "community", href: "/community", label: "Community", linkTitle: "Community" },
  { key: "sponsors", href: "/sponsors", label: "Sponsors", linkTitle: "Sponsors" },
  { key: "sponsors-apply", href: "/sponsors/apply", label: "Become a Sponsor", linkTitle: "Become a Sponsor" },
  { key: "podcast", href: "/podcasts", label: "Podcast", linkTitle: "Podcast" },
  { key: "profile", href: "/profile", label: "Profile", linkTitle: "Profile" },
  { key: "settings", href: "/settings", label: "Settings", linkTitle: "Settings" },
  { key: "notifications", href: "/notifications", label: "Notifications", linkTitle: "Notifications" },
  { key: "membership", href: "/membership", label: "Membership", linkTitle: "Membership" },
  { key: "billing", href: "/billing", label: "Billing", linkTitle: "Billing" },
  { key: "contact", href: "/contact", label: "Contact", linkTitle: "Contact" },
  { key: "onboarding", href: "/onboarding", label: "Onboarding", linkTitle: "Onboarding" },
  { key: "download", href: "/download", label: "Download App", linkTitle: "Download App" },
  { key: "privacy", href: "/privacy", label: "Privacy Policy", linkTitle: "Privacy Policy" },
  { key: "terms", href: "/terms", label: "Terms of Use", linkTitle: "Terms of Use" },
];

/** @deprecated Use SITE_HAMBURGER_NAV_ITEMS */
export const SITE_MOBILE_HAMBURGER_ITEMS = SITE_HAMBURGER_NAV_ITEMS;

export const SITE_HAMBURGER_NAV_KEYS = new Set(SITE_HAMBURGER_NAV_ITEMS.map((item) => item.key));

/** TopApp in-tab keys that can switch via `setNav` when pathname is `/`. */
export const SITE_TOP_APP_DOCK_TAB_KEYS = new Set(["home", "trusted", "profile", "community"]);

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
        path !== "/profile" &&
        !path.startsWith("/trusted") &&
        !path.startsWith("/podcasts")
      );
    case "trusted":
      return tab === "trusted" || path.startsWith("/trusted");
    case "profile":
      return tab === "profile" || path.startsWith("/profile");
    case "community":
      return tab === "community" || path.startsWith("/community");
    case "podcast":
      return tab === "podcast" || path.startsWith("/podcasts");
    default:
      return tab === navKey;
  }
}
