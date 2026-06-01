/** Canonical tier rank for upgrade/downgrade validation (server-side). */
export const MEMBERSHIP_TIER_RANK = {
  free: 0,
  none: 0,
  support: 1,
  member: 2,
  sponsor: 3,
};

export function membershipTierRank(tier) {
  const t = String(tier || "free").toLowerCase();
  return MEMBERSHIP_TIER_RANK[t] ?? 0;
}

export function normalizeDbMembershipTier(tier) {
  const t = String(tier || "free").toLowerCase();
  if (t === "none" || t === "guest" || t === "") return "free";
  if (["free", "support", "member", "sponsor"].includes(t)) return t;
  if (t === "pro") return "member";
  return "free";
}

/** Checkout tier param → DB membership_tier */
export function checkoutTierToDb(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "member") return "member";
  if (t === "support") return "support";
  if (t === "sponsor") return "sponsor";
  return "free";
}

export function isUpgrade(fromTier, toTier) {
  return membershipTierRank(toTier) > membershipTierRank(fromTier);
}
