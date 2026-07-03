/**
 * Route policies for membership gating (web + Capacitor).
 */

/** Always reachable without membership (marketing, auth, checkout). */
export const MEMBERSHIP_EXEMPT_PATTERNS = [
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

/** Support or Pro — directory home, profile (saved orgs), nonprofit detail, podcast hub. */
export const SUPPORT_TIER_PATH_PATTERNS = [
  /^\/$/,
  /^\/profile(\/|$)/,
  /^\/nonprofit(\/|$)/,
  /^\/podcasts\/?$/,
  /^\/podcasts\/apply(\/|$)/,
  /^\/podcasts\/guests(\/|$)/,
];

/** Pro only — community, trusted, podcast exclusive content, settings, etc. */
export const PRO_MEMBERSHIP_PATH_PATTERNS = [
  /^\/community(\/|$)/,
  /^\/trusted(\/|$)/,
  /^\/podcasts\/members(\/|$)/,
  /^\/podcasts\/sponsor(\/|$)/,
  /^\/notifications(\/|$)/,
  /^\/onboarding(\/|$)/,
  /^\/contact(\/|$)/,
  /^\/settings(\/|$)/,
];

/** @deprecated Use SUPPORT_TIER_PATH_PATTERNS + PRO_MEMBERSHIP_PATH_PATTERNS */
export const MEMBERSHIP_REQUIRED_PATTERNS = [
  ...SUPPORT_TIER_PATH_PATTERNS,
  ...PRO_MEMBERSHIP_PATH_PATTERNS,
];

/** @param {string} pathname */
export function isMembershipExemptPath(pathname) {
  const path = String(pathname || "/").trim() || "/";
  return MEMBERSHIP_EXEMPT_PATTERNS.some((re) => re.test(path));
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
