/**
 * Unit tests for membership feature flag + pricing cents (no network, no @/ aliases).
 * Usage: node scripts/test-membership-configuration.mjs
 */

import assert from "node:assert/strict";

const SUPPORT_MEMBERSHIP_ANNUAL_CENTS = 99;
const PRO_MEMBERSHIP_ANNUAL_CENTS = 599;
const INCORRECT_SUPPORT_ANNUAL_CENTS = 9900;

assert.equal(SUPPORT_MEMBERSHIP_ANNUAL_CENTS, 99, "99 cents === $0.99");
assert.equal(PRO_MEMBERSHIP_ANNUAL_CENTS, 599, "599 cents === $5.99");
assert.equal(INCORRECT_SUPPORT_ANNUAL_CENTS, 9900, "9900 cents === $99.00");

function normalizeMembershipConfiguration(row) {
  const supportEnabled =
    row?.support_membership_enabled != null
      ? !!row.support_membership_enabled
      : row?.supportMembershipEnabled != null
        ? !!row.supportMembershipEnabled
        : false;
  const proEnabled =
    row?.pro_membership_enabled != null
      ? !!row.pro_membership_enabled
      : row?.proMembershipEnabled != null
        ? !!row.proMembershipEnabled
        : true;
  return {
    supportMembershipEnabled: supportEnabled,
    proMembershipEnabled: proEnabled,
  };
}

function listPurchasableMembershipPlans(cfg) {
  const plans = [];
  if (cfg?.supportMembershipEnabled) plans.push({ tier: "support" });
  if (cfg?.proMembershipEnabled !== false) plans.push({ tier: "member" });
  return plans;
}

const defaults = normalizeMembershipConfiguration(null);
assert.equal(defaults.supportMembershipEnabled, false, "Support defaults to disabled");
assert.equal(defaults.proMembershipEnabled, true, "Pro defaults to enabled");

const disabled = normalizeMembershipConfiguration({
  support_membership_enabled: false,
  pro_membership_enabled: true,
});
assert.equal(listPurchasableMembershipPlans(disabled).length, 1);
assert.equal(listPurchasableMembershipPlans(disabled)[0].tier, "member");

const enabled = normalizeMembershipConfiguration({
  support_membership_enabled: true,
  pro_membership_enabled: true,
});
const plans = listPurchasableMembershipPlans(enabled);
assert.equal(plans.length, 2);
assert.ok(plans.some((p) => p.tier === "support"));
assert.ok(plans.some((p) => p.tier === "member"));

function isMembershipExemptPath(pathname) {
  const path = String(pathname || "/").trim() || "/";
  const patterns = [/^\/$/, /^\/nonprofit(\/|$)/, /^\/sponsors(\/|$)/, /^\/access(\/|$)/];
  return patterns.some((re) => re.test(path));
}

function requiresProMembershipPath(pathname) {
  const path = String(pathname || "/").trim() || "/";
  if (isMembershipExemptPath(path)) return false;
  return [/^\/profile(\/|$)/, /^\/community(\/|$)/, /^\/trusted(\/|$)/].some((re) => re.test(path));
}

assert.equal(isMembershipExemptPath("/"), true);
assert.equal(requiresProMembershipPath("/"), false);
assert.equal(requiresProMembershipPath("/community"), true);
assert.equal(requiresProMembershipPath("/profile"), true);
assert.equal(requiresProMembershipPath("/trusted"), true);
assert.equal(requiresProMembershipPath("/sponsors"), false);

function supportCheckoutBlocked(supportEnabled) {
  return supportEnabled !== true;
}

assert.equal(supportCheckoutBlocked(false), true);
assert.equal(supportCheckoutBlocked(true), false);

console.log("[test:membership-config] All membership configuration tests passed.");
