"use client";

import ProUpgradeModal from "@/components/membership/ProUpgradeModal";

/**
 * Inline upgrade prompt — prefer ProUpgradeModal via ProMembershipGate / TopApp for Support members.
 * @param {{ title?: string, message?: string, feature?: string, open?: boolean, onBack?: () => void }} props
 */
export default function MembershipUpgradePrompt({
  title = "Upgrade to Pro",
  message = "This feature is included with Pro Membership.",
  feature = "",
  open = true,
  onBack,
}) {
  return (
    <ProUpgradeModal open={open} title={title} message={message} feature={feature} onBack={onBack} />
  );
}
