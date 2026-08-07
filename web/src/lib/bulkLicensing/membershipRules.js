/**
 * Membership conflict rules for bulk license redemption.
 *
 * Precedence:
 * - bulk_org grants Pro access while license + org are valid.
 * - Personal Stripe subscriptions are never auto-canceled.
 * - A user may hold only one redeemed bulk license at a time.
 */

/**
 * @param {Record<string, unknown> | null | undefined} profile
 */
export function profileHasActivePersonalStripe(profile) {
  if (!profile) return false;
  const source = String(profile.membership_source || profile.membershipSource || "").toLowerCase();
  if (source === "bulk_org") return false;
  const sub = String(profile.stripe_subscription_id || profile.stripeSubscriptionId || "").trim();
  const status = String(
    profile.billing_status || profile.membership_status || profile.membershipBillingStatus || "",
  ).toLowerCase();
  return !!sub && (status === "active" || status === "trialing" || status === "past_due");
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {string} [incomingOrgId]
 */
export function evaluateBulkRedemptionEligibility(profile, incomingOrgId) {
  if (!profile) {
    return { ok: true, case: "no_membership", warnings: [] };
  }

  const source = String(profile.membership_source || profile.membershipSource || "").toLowerCase();
  const existingOrg = String(profile.bulk_organization_id || profile.bulkOrganizationId || "").trim();
  const existingLicense = String(profile.bulk_license_id || profile.bulkLicenseId || "").trim();
  const warnings = [];

  if (source === "bulk_org" && existingLicense) {
    if (incomingOrgId && existingOrg && existingOrg !== String(incomingOrgId)) {
      return {
        ok: false,
        error: "already_bulk_member_other_org",
        case: "other_org_license",
        message:
          "You already have an active organization license. Ask an admin to revoke it before redeeming another.",
        warnings,
      };
    }
    return {
      ok: false,
      error: "already_bulk_member",
      case: "same_or_any_bulk",
      message: "This account already has an active organization license.",
      warnings,
    };
  }

  if (profileHasActivePersonalStripe(profile)) {
    warnings.push({
      code: "personal_subscription_active",
      message:
        "You also have a personal Outreach subscription. Redeeming this license does not cancel it — manage personal billing separately if you no longer need it.",
    });
  }

  const status = String(
    profile.billing_status || profile.membership_status || profile.membershipBillingStatus || "",
  ).toLowerCase();
  if (status === "canceled" || status === "none" || !status) {
    return { ok: true, case: "expired_or_none", warnings };
  }

  return { ok: true, case: "individual_or_other", warnings };
}

/**
 * Fields to clear when a bulk license is revoked from a user.
 * Caller decides whether to restore Stripe sync separately.
 */
export function bulkRevocationProfileClearPatch() {
  return {
    bulk_organization_id: null,
    bulk_license_id: null,
  };
}
