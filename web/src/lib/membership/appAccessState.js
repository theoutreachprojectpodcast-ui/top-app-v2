/**
 * Central app-access state for entry routing (welcome → auth → Pro → home).
 * Prefer this over ad-hoc checks in page components.
 */

import { hasMobileAppAccess, hasStaffBypass } from "@/lib/membership/membershipAccess";

/** @typedef {'loading' | 'unauthenticated' | 'profile_required' | 'membership_required' | 'membership_pending' | 'active' | 'suspended' | 'error'} AppAccessState */

/**
 * @param {{
 *   authLoading?: boolean,
 *   loadingProfile?: boolean,
 *   isAuthenticated?: boolean,
 *   sessionHint?: boolean,
 *   profile?: Record<string, unknown> | null,
 *   entitlements?: Record<string, unknown> | null,
 *   profileTimedOut?: boolean,
 *   profileHydrated?: boolean,
 *   navCacheHasAccess?: boolean,
 *   error?: boolean,
 * }} input
 * @returns {AppAccessState}
 */
export function resolveAppAccessState(input = {}) {
  const {
    authLoading = false,
    loadingProfile = false,
    isAuthenticated = false,
    sessionHint = false,
    profile = null,
    entitlements = null,
    profileTimedOut = false,
    profileHydrated = false,
    navCacheHasAccess = false,
    error = false,
  } = input;

  if (error) return "error";

  const signedIn = !!(isAuthenticated || sessionHint);
  const opts = {
    isPlatformAdmin: !!entitlements?.isPlatformAdmin,
    isPrivilegedStaff: !!entitlements?.isPrivilegedStaff,
  };

  if (authLoading && !signedIn) return "loading";
  if (!signedIn) return "unauthenticated";

  const knownActive =
    hasStaffBypass(profile, opts) ||
    entitlements?.fullPlatformAccess === true ||
    entitlements?.isPlatformAdmin === true ||
    entitlements?.isPrivilegedStaff === true ||
    navCacheHasAccess === true ||
    (profileHydrated && hasMobileAppAccess(profile, opts));

  if (knownActive) {
    const status = String(profile?.userStatus ?? profile?.user_status ?? "active")
      .trim()
      .toLowerCase();
    if (status === "suspended" && !hasStaffBypass(profile, opts) && !entitlements?.isPlatformAdmin) {
      return "suspended";
    }
    return "active";
  }

  /**
   * Default client profile is always a free stub (`createInitialProfile`).
   * Do not treat it as "membership required" until /api/me has hydrated.
   */
  const waitingOnProfile = loadingProfile && !profileTimedOut;
  if (waitingOnProfile || authLoading) {
    return "membership_pending";
  }

  if (!profileHydrated && !profileTimedOut) {
    return "membership_pending";
  }

  const status = String(profile?.userStatus ?? profile?.user_status ?? "active")
    .trim()
    .toLowerCase();
  if (status === "suspended") return "suspended";

  if (hasMobileAppAccess(profile, opts) || entitlements?.fullPlatformAccess === true) {
    return "active";
  }

  if (
    signedIn &&
    profileTimedOut &&
    !profileHydrated &&
    !String(profile?.profileRecordId || profile?.id || "").trim()
  ) {
    return "profile_required";
  }

  return "membership_required";
}

/**
 * Human-facing status line for bootstrap overlays (no technical jargon).
 * @param {AppAccessState} state
 */
export function appAccessStatusLabel(state) {
  switch (state) {
    case "loading":
    case "membership_pending":
      return "Checking your membership…";
    case "unauthenticated":
      return "Welcome";
    case "membership_required":
      return "Membership required";
    case "profile_required":
      return "Finishing account setup…";
    case "active":
      return "Taking you to the Outreach Project…";
    case "suspended":
      return "Account suspended";
    case "error":
      return "Something went wrong";
    default:
      return "Loading…";
  }
}
