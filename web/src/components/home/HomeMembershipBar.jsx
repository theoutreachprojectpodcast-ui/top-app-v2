"use client";

import { ChevronRight, UserRound } from "lucide-react";
import Avatar from "@/components/shared/Avatar";
import { emptyProfileAvatarUrl } from "@/lib/avatarFallback";

/**
 * Full-width membership / account CTA matching mobile home reference.
 */
export default function HomeMembershipBar({
  isAuthenticated,
  isMember,
  fullName,
  email,
  avatarUrl,
  membershipLabel,
  onActivateMembership,
  onOpenProfile,
}) {
  if (isAuthenticated) {
    const title = isMember
      ? membershipLabel || "Membership active"
      : "Activate membership";
    const hint = isMember
      ? fullName || email || "View profile & benefits"
      : "Unlock saved orgs, community, and more";

    return (
      <button type="button" className="homeMembershipBar homeMembershipBar--signedIn" onClick={onOpenProfile}>
        <span className="homeMembershipBar__avatar" aria-hidden="true">
          <Avatar src={avatarUrl || emptyProfileAvatarUrl()} alt="" sizes="44px" />
        </span>
        <span className="homeMembershipBar__copy">
          <span className="homeMembershipBar__title">{title}</span>
          <span className="homeMembershipBar__hint">{hint}</span>
        </span>
        <ChevronRight className="homeMembershipBar__chevron" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button type="button" className="homeMembershipBar" onClick={onActivateMembership}>
      <span className="homeMembershipBar__avatar homeMembershipBar__avatar--placeholder" aria-hidden="true">
        <UserRound size={22} strokeWidth={2} />
      </span>
      <span className="homeMembershipBar__copy">
        <span className="homeMembershipBar__title">Join — activate membership</span>
      </span>
      <ChevronRight className="homeMembershipBar__chevron" aria-hidden="true" />
    </button>
  );
}
