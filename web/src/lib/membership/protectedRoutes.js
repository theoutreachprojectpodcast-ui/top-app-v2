/**
 * Route policies for membership gating (web + Capacitor).
 *
 * Public home/directory remains open without Pro.
 * All other product areas require Pro Membership ($5.99/yr).
 * Support Membership availability is controlled by membershipConfiguration (feature flag).
 */

/** Always reachable without membership (marketing, auth, checkout, public directory). */
export const MEMBERSHIP_EXEMPT_PATTERNS = [
  /^\/$/,
  /^\/nonprofit(\/|$)/,
  /^\/sign-in(\/|$)/,
  /^\/sign-up(\/|$)/,
  /^\/signup(\/|$)/,
  /^\/login(\/|$)/,
  /^\/access(\/|$)/,
  /^\/mobile\/access(\/|$)/,
  /^\/mobile(\/|$)/,
  /^\/auth\//,
  /^\/callback(\/|$)/,
  /^\/privacy(\/|$)/,
  /^\/terms(\/|$)/,
  /^\/download(\/|$)/,
  /^\/membership(\/|$)/,
  /^\/membership\/success(\/|$)/,
  /^\/membership\/cancel(\/|$)/,
  /^\/billing(\/|$)/,
  /^\/admin-login(\/|$)/,
  /^\/api\/billing\//,
  /^\/api\/health(\/|$)/,
  /^\/api\/auth\//,
  /^\/mobile\/auth\//,
  /^\/mobile-auth\//,
  /** Mission partner hub + profiles — linked from the public home page. */
  /^\/sponsors(\/|$)/,
  /^\/sponsor(\/|$)/,
];

/**
 * Canonical public routes (home/directory + auth/legal/checkout).
 * Kept as an explicit list for docs and tests.
 */
export const PUBLIC_ROUTES = [
  "/",
  "/nonprofit",
  "/sign-in",
  "/sign-up",
  "/login",
  "/access",
  "/mobile/access",
  "/mobile",
  "/callback",
  "/privacy",
  "/terms",
  "/download",
  "/membership",
  "/billing",
  "/sponsors",
];

/**
 * Legacy Support-tier paths — only used when Support Membership feature flag is enabled.
 * While the flag is off, Support users do not gain these routes (Pro required).
 */
export const SUPPORT_TIER_PATH_PATTERNS = [
  /^\/profile(\/|$)/,
  /^\/podcasts\/?$/,
  /^\/podcasts\/apply(\/|$)/,
  /^\/podcasts\/guests(\/|$)/,
];

/** Pro Membership required for protected product routes (not public directory). */
export const PRO_MEMBERSHIP_PATH_PATTERNS = [
  /^\/profile(\/|$)/,
  /^\/podcasts(\/|$)/,
  /^\/community(\/|$)/,
  /^\/trusted(\/|$)/,
  /^\/notifications(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/contact(\/|$)/,
  /^\/settings(\/|$)/,
];

/** @deprecated Use PRO_MEMBERSHIP_PATH_PATTERNS */
export const MEMBERSHIP_REQUIRED_PATTERNS = [...PRO_MEMBERSHIP_PATH_PATTERNS];

/** @param {string} pathname */
export function isMembershipExemptPath(pathname) {
  const path = String(pathname || "/").trim() || "/";
  return MEMBERSHIP_EXEMPT_PATTERNS.some((re) => re.test(path));
}

/** Public home / nonprofit directory browsing (no membership required). */
export function isPublicDirectoryPath(pathname) {
  const path = String(pathname || "/").trim() || "/";
  return path === "/" || /^\/nonprofit(\/|$)/.test(path);
}

/** @param {string} pathname */
export function requiresAnyMembershipPath(pathname) {
  const path = String(pathname || "/").trim() || "/";
  if (isMembershipExemptPath(path)) return false;
  return MEMBERSHIP_REQUIRED_PATTERNS.some((re) => re.test(path));
}

/** @alias requiresAnyMembershipPath */
export const requiresActiveMembershipPath = requiresAnyMembershipPath;

/** @param {string} pathname */
export function requiresProMembershipPath(pathname) {
  const path = String(pathname || "/").trim() || "/";
  if (isMembershipExemptPath(path)) return false;
  return PRO_MEMBERSHIP_PATH_PATTERNS.some((re) => re.test(path));
}

/** Web paywall destination. */
export const WEB_MEMBERSHIP_PAYWALL_PATH = "/access";

/** Mobile paywall destination. */
export const MOBILE_MEMBERSHIP_PAYWALL_PATH = "/mobile/access";

/** Pro upgrade query on paywall. */
export function membershipUpgradePaywallPath(native = false) {
  const base = native ? MOBILE_MEMBERSHIP_PAYWALL_PATH : WEB_MEMBERSHIP_PAYWALL_PATH;
  return `${base}?upgrade=pro`;
}
