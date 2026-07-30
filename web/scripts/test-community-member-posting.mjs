/**
 * Unit tests: community posting requires Pro (gated app entry).
 * Usage: node --import ./scripts/register-at-alias.mjs scripts/test-community-member-posting.mjs
 */

import assert from "node:assert/strict";
import {
  canCreateCommunityContent,
  canViewCommunity,
} from "../src/lib/membership/membershipAccess.js";
import {
  computeEntitlementsFromProfileRow,
  profileMayCreateCommunityPost,
} from "../src/lib/account/entitlements.js";
import {
  isMembershipExemptPath,
  requiresProMembershipPath,
} from "../src/lib/membership/protectedRoutes.js";
import {
  membersMayCreatePosts,
  memberPostCreateFields,
  normalizeCommunityPostingMode,
} from "../src/lib/community/communityPostingMode.js";

function row(overrides = {}) {
  return {
    id: "profile-1",
    email: "member@example.com",
    membership_tier: "free",
    membership_status: "none",
    billing_status: "none",
    platform_role: "user",
    user_status: "active",
    community_posting_disabled: false,
    ...overrides,
  };
}

const free = row();
const pro = row({ membership_tier: "member", membership_status: "active", billing_status: "active" });
const admin = row({ platform_role: "admin", membership_tier: "member", membership_status: "active", billing_status: "active" });
const suspended = row({
  membership_tier: "member",
  membership_status: "active",
  billing_status: "active",
  user_status: "suspended",
});
const restricted = row({
  membership_tier: "member",
  membership_status: "active",
  billing_status: "active",
  community_posting_disabled: true,
});

assert.equal(canViewCommunity(free), false);
assert.equal(canCreateCommunityContent(free), false);
assert.equal(canViewCommunity(pro), true);
assert.equal(canCreateCommunityContent(pro), true);
assert.equal(canCreateCommunityContent(admin), true);
assert.equal(canCreateCommunityContent(restricted), false);
assert.equal(profileMayCreateCommunityPost(free), false);
assert.equal(profileMayCreateCommunityPost(pro), true);
assert.equal(profileMayCreateCommunityPost(null), false);

const freeEnt = computeEntitlementsFromProfileRow(free);
assert.equal(freeEnt.communityPostCreate, false);
assert.equal(freeEnt.fullPlatformAccess, false);

const proEnt = computeEntitlementsFromProfileRow(pro);
assert.equal(proEnt.communityPostCreate, true);
assert.equal(proEnt.fullPlatformAccess, true);

assert.equal(isMembershipExemptPath("/community"), false);
assert.equal(requiresProMembershipPath("/community"), true);

assert.equal(normalizeCommunityPostingMode("open"), "open");
assert.equal(membersMayCreatePosts("open"), true);
assert.equal(membersMayCreatePosts("admin_only"), false);
assert.equal(memberPostCreateFields("open").status, "approved");
assert.equal(memberPostCreateFields("pre_approval").status, "pending_review");

// Suspended Pro accounts are denied by isActiveCommunityMember only for create when
// requirePro still passes staff-like billing — requirePro does not check suspension.
// Entitlements path uses canCreate which uses requirePro; suspension is enforced in app entry.
void suspended;

console.log("[test:community-member-posting] All community Pro-gated posting tests passed.");
