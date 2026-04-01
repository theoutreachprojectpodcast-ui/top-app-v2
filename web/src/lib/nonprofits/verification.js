export const NONPROFIT_TIER = {
  STANDARD: "standard",
  VERIFIED: "verified",
  FEATURED: "featured",
};

function normalizeTier(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (["featured", "featured_partner", "trusted", "trusted_partner", "tier_3"].includes(raw)) return NONPROFIT_TIER.FEATURED;
  if (["verified", "tier_2"].includes(raw)) return NONPROFIT_TIER.VERIFIED;
  return NONPROFIT_TIER.STANDARD;
}

export function getNonprofitVerificationTier(row, source = "directory") {
  const explicitTier = normalizeTier(row?.verificationTier ?? row?.verification_tier ?? row?.raw?.verification_tier);
  if (explicitTier) return explicitTier;
  if (source === "trusted") return NONPROFIT_TIER.FEATURED;
  if (row?.isTrusted || row?.is_trusted || row?.raw?.is_trusted || row?.raw?.profile?.is_trusted) {
    return NONPROFIT_TIER.VERIFIED;
  }
  return NONPROFIT_TIER.STANDARD;
}
