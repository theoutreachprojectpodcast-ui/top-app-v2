import MembershipTierArt from "@/features/membership/components/MembershipTierArt";
import { normalizeMembershipTierKey } from "@/features/membership/membershipTiers";

/**
 * Compact tier label for profile headers — uses ds-chip tokens + MembershipTierArt.
 */
export default function MembershipBadge({ tierKey, label, isMember = false }) {
  const tier = normalizeMembershipTierKey(tierKey);
  const chipTone = isMember ? "ds-chip--emphasis" : tier !== "none" ? "ds-chip--accent" : "";

  return (
    <span className={`membershipBadge ds-chip ${chipTone}`.trim()} role="status">
      <span className="membershipBadge__art" aria-hidden="true">
        <MembershipTierArt tierId={tier} />
      </span>
      <span className="membershipBadge__label">{label}</span>
    </span>
  );
}
