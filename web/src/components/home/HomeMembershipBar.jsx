"use client";

import { ChevronRight, UserRound } from "lucide-react";

/**
 * Guest-only CTA on mobile home — hidden once a user is signed in.
 */
export default function HomeMembershipBar({ onActivateMembership }) {
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
