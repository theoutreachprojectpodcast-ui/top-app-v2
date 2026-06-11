"use client";

import HomeMembershipSection from "@/components/home/HomeMembershipSection";
import "@/components/membership/membership-plans-modal.css";

/**
 * Post-auth membership tier picker — not shown inline on home.
 */
export default function MembershipPlansModal({
  open,
  onClose,
  isAuthenticated,
  loadingAccount = false,
  currentTierKey = "none",
  accountEmail = "",
  membershipLabel = "",
  membershipBillingStatus = "none",
  onJoinFree,
  onUpgradeTier,
  onRequestSignIn,
  onGoToProfile,
}) {
  if (!open) return null;

  return (
    <div
      className="modalOverlay membershipPlansModalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="membership-plans-modal-heading"
      onClick={onClose}
    >
      <div className="modalCard membershipPlansModal" onClick={(e) => e.stopPropagation()}>
        <div className="membershipPlansModal__toolbar">
          <button type="button" className="btnSoft membershipPlansModal__close" onClick={onClose}>
            Not now
          </button>
        </div>
        <HomeMembershipSection
          variant="modal"
          isAuthenticated={isAuthenticated}
          loadingAccount={loadingAccount}
          currentTierKey={currentTierKey}
          accountEmail={accountEmail}
          membershipLabel={membershipLabel}
          membershipBillingStatus={membershipBillingStatus}
          onRequestSignIn={onRequestSignIn}
          onJoinFree={onJoinFree}
          onUpgradeTier={onUpgradeTier}
          onGoToProfile={onGoToProfile}
        />
      </div>
    </div>
  );
}
