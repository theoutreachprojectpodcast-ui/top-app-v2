import { NONPROFIT_TIER } from "@/lib/nonprofits/verification";

export default function NonprofitVerificationBadge({ tier }) {
  if (tier === NONPROFIT_TIER.STANDARD) return null;
  if (tier === NONPROFIT_TIER.FEATURED) {
    return <span className="nonprofitBadge badgeFeatured">Trusted Partner</span>;
  }
  return <span className="nonprofitBadge badgeVerified">Verified</span>;
}

