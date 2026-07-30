/**
 * Unit tests: app entry access state + Pro-gated community.
 * Usage: node --import ./scripts/register-at-alias.mjs scripts/test-app-entry-access.mjs
 */

import assert from "node:assert/strict";
import { resolveAppAccessState } from "../src/lib/membership/appAccessState.js";
import {
  canCreateCommunityContent,
  canViewCommunity,
  requirePro,
} from "../src/lib/membership/membershipAccess.js";
import {
  isMembershipExemptPath,
  requiresProMembershipPath,
  WELCOME_PATH,
} from "../src/lib/membership/protectedRoutes.js";

assert.equal(WELCOME_PATH, "/");
assert.equal(isMembershipExemptPath("/"), true);
assert.equal(isMembershipExemptPath("/welcome"), true);
assert.equal(isMembershipExemptPath("/access"), true);
assert.equal(isMembershipExemptPath("/sign-in"), true);
assert.equal(requiresProMembershipPath("/community"), true);
assert.equal(requiresProMembershipPath("/nonprofit"), true);
assert.equal(requiresProMembershipPath("/sponsors"), true);
assert.equal(requiresProMembershipPath("/"), false);

assert.equal(resolveAppAccessState({ authLoading: true }), "loading");
assert.equal(resolveAppAccessState({ isAuthenticated: false }), "unauthenticated");

// Default free stub while /api/me is still loading must NOT force membership_required
assert.equal(
  resolveAppAccessState({
    isAuthenticated: true,
    loadingProfile: true,
    profileHydrated: false,
    profile: { membershipTier: "free", membershipBillingStatus: "none" },
    entitlements: { fullPlatformAccess: false },
  }),
  "membership_pending",
);

assert.equal(
  resolveAppAccessState({
    isAuthenticated: true,
    loadingProfile: false,
    profileHydrated: true,
    profile: { membershipTier: "free", membershipBillingStatus: "none", profileRecordId: "p1" },
    entitlements: { fullPlatformAccess: false },
  }),
  "membership_required",
);

assert.equal(
  resolveAppAccessState({
    isAuthenticated: true,
    loadingProfile: true,
    profileHydrated: false,
    profile: { membershipTier: "free", membershipBillingStatus: "none" },
    entitlements: { fullPlatformAccess: true },
  }),
  "active",
);

assert.equal(
  resolveAppAccessState({
    isAuthenticated: true,
    sessionHint: true,
    navCacheHasAccess: true,
    loadingProfile: true,
    profileHydrated: false,
    profile: { membershipTier: "free", membershipBillingStatus: "none" },
  }),
  "active",
);

assert.equal(
  resolveAppAccessState({
    isAuthenticated: true,
    profileHydrated: true,
    loadingProfile: false,
    profile: {
      membershipTier: "member",
      membershipBillingStatus: "active",
      membership_tier: "member",
      billing_status: "active",
      profileRecordId: "p1",
    },
    entitlements: { fullPlatformAccess: true },
  }),
  "active",
);

assert.equal(
  resolveAppAccessState({
    isAuthenticated: true,
    profileHydrated: true,
    loadingProfile: false,
    profile: {
      userStatus: "suspended",
      membershipTier: "member",
      membershipBillingStatus: "active",
      profileRecordId: "p1",
    },
    entitlements: { fullPlatformAccess: true },
  }),
  "suspended",
);

const free = { membershipTier: "free", membershipBillingStatus: "none" };
const pro = {
  membershipTier: "member",
  membershipBillingStatus: "active",
  membership_tier: "member",
  billing_status: "active",
};
assert.equal(requirePro(free), false);
assert.equal(canViewCommunity(free), false);
assert.equal(canCreateCommunityContent(free), false);
assert.equal(requirePro(pro), true);
assert.equal(canViewCommunity(pro), true);
assert.equal(canCreateCommunityContent(pro), true);

console.log("[test:app-entry-access] All app entry access tests passed.");
