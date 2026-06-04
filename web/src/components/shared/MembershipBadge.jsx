import MembershipTierArt from "@/features/membership/components/MembershipTierArt";
import {
  membershipBadgeChipClass,
  normalizeMembershipTierKey,
} from "@/features/membership/membershipTiers";

/**
 * Compact tier label for profile headers — ds-chip tones + tier art sized for badges.
 */
export default function MembershipBadge({ tierKey, label, isMember = false }) {
  const tier = normalizeMembershipTierKey(tierKey);
  const chipTone = membershipBadgeChipClass(tier, isMember);

  return (
    <span
      className={`membershipBadge ds-chip ${chipTone} membershipBadge--${tier}`.trim()}
      role="status"
    >
      <span className="membershipBadge__art" aria-hidden="true">
        <MembershipTierArt tierId={tier} variant="badge" />
      </span>
      <span className="membershipBadge__label">{label}</span>
    </span>
  );
}
