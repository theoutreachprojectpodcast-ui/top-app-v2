/**
 * Unified account model (tORP v0.3): intent vs platform role vs billing tier.
 * Authoritative storage: Supabase `torp_profiles` (+ Stripe for paid lifecycle).
 */

/** @type {readonly string[]} */
export const PUBLIC_ACCOUNT_INTENTS = Object.freeze([
  "free_user",
  "support_user",
  "member_user",
  "sponsor_user",
]);

/** @type {readonly string[]} */
export const PLATFORM_ROLES = Object.freeze(["user", "support", "member", "sponsor", "moderator", "admin"]);

/** @type {readonly string[]} */
export const ONBOARDING_STATUS = Object.freeze(["not_started", "in_progress", "completed", "needs_review"]);

const INTENT_SET = new Set(PUBLIC_ACCOUNT_INTENTS);

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizePublicAccountIntent(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  return INTENT_SET.has(v) ? v : null;
}

/**
 * Map signup intent to default billing tier for onboarding (not billing authority).
 * @param {string | null} intent
 */
export function defaultMembershipTierForIntent(intent) {
  switch (String(intent || "").toLowerCase()) {
    case "support_user":
      return "support";
    case "member_user":
      return "member";
    case "sponsor_user":
      return "sponsor";
    case "free_user":
    default:
      return "free";
  }
}

/**
 * Platform role derived from paid tier when not staff.
 * @param {string} membershipTier
 */
export function platformRoleForPaidTier(membershipTier) {
  const t = String(membershipTier || "free").toLowerCase();
  if (t === "support") return "support";
  if (t === "member") return "member";
  if (t === "sponsor") return "sponsor";
  return "user";
}

/**
 * Preserve admin/moderator when syncing Stripe or completing onboarding.
 * @param {string | null | undefined} existing
 */
export function isStaffPlatformRole(existing) {
  const r = String(existing || "").toLowerCase();
  return r === "admin" || r === "moderator";
}

/**
 * @param {string | null | undefined} existingRole
 * @param {string} membershipTier
 */
export function resolvePlatformRoleAfterTierChange(existingRole, membershipTier) {
  if (isStaffPlatformRole(existingRole)) return String(existingRole).toLowerCase();
  const t = String(membershipTier || "free").toLowerCase();
  if (t === "free") return "user";
  return platformRoleForPaidTier(t);
}
