/**
 * Route policies for membership gating (web + Capacitor).
 *
 * Unauthenticated users land on the welcome experience at `/` (AppEntryBootstrap).
 * Main product surfaces require Pro Membership ($5.99/yr).
 * Support Membership availability is controlled by membershipConfiguration (feature flag).
 */

/** Auth, legal, checkout, and health — reachable without Pro. `/` is handled by AppEntryBootstrap. */
export const MEMBERSHIP_EXEMPT_PATTERNS = [
  /^\/$/,
  /^\/welcome(\/|$)/,
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
  /^\/membership\/success(\/|$)/,
  /^\/membership\/cancel(\/|$)/,
  /^\/bulk-licenses(\/|$)/,
  /^\/organizations(\/|$)/,
  /^\/redeem(\/|$)/,
  /^\/invite\/license(\/|$)/,
  /^\/api\/bulk-licensing\//,
  /^\/billing(\/|$)/,
  /^\/admin-login(\/|$)/,
  /^\/sign-out(\/|$)/,
  /^\/api\/billing\//,
  /^\/api\/health(\/|$)/,
  /^\/api\/auth\//,
  /^\/mobile\/auth\//,
  /^\/mobile-auth\//,
];

/**
 * Canonical pre-auth / legal / checkout routes (not the main app shell).
 */
export const PUBLIC_ROUTES = [
  "/",
  "/welcome",
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
  "/billing",
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

/** Pro Membership required for all main product routes. */
export const PRO_MEMBERSHIP_PATH_PATTERNS = [
  /^\/nonprofit(\/|$)/,
  /^\/community(\/|$)/,
  /^\/sponsors(\/|$)/,
  /^\/sponsor(\/|$)/,
  /^\/profile(\/|$)/,
  /^\/podcasts(\/|$)/,
  /^\/trusted(\/|$)/,
  /^\/notifications(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/contact(\/|$)/,
  /^\/settings(\/|$)/,
  /^\/membership(\/|$)/,
];

/** @deprecated Community requires Pro with the rest of the app. */
export const COMMUNITY_MEMBER_PATH_PATTERNS = [/^\/community(\/|$)/];

/** @deprecated Use PRO_MEMBERSHIP_PATH_PATTERNS */
export const MEMBERSHIP_REQUIRED_PATTERNS = [...PRO_MEMBERSHIP_PATH_PATTERNS];

/** Welcome / unauthenticated landing (same UI as `/` for guests). */
export const WELCOME_PATH = "/";

/** @param {string} pathname */
export function isMembershipExemptPath(pathname) {
  const path = String(pathname || "/").trim() || "/";
  return MEMBERSHIP_EXEMPT_PATTERNS.some((re) => re.test(path));
}

/**
 * Formerly public directory browsing. Directory now requires Pro — kept for callers
 * that still distinguish home vs other routes.
 */
export function isPublicDirectoryPath(pathname) {
  const path = String(pathname || "/").trim() || "/";
  return path === "/" || path === "/welcome";
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
